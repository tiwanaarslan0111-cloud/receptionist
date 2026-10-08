import logging
import time
from collections import OrderedDict
from typing import Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, Request, BackgroundTasks, HTTPException, status
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models import Business, User
from app.deps import get_current_business, get_current_business_user
from app.services.ai_agent import process_chat
from app.services import waha_service
from app.config import settings

logger = logging.getLogger("waha_webhook")
logger.setLevel(logging.INFO)

# In-memory deduplication cache: stores message_id -> timestamp (keeps last 500 items)
PROCESSED_MESSAGE_IDS = OrderedDict()
DEDUP_TTL_SECONDS = 60


def is_duplicate_message(msg_id: str) -> bool:
    """Returns True if the message ID was already received within the TTL window."""
    now = time.time()

    # Prune expired keys
    for k in list(PROCESSED_MESSAGE_IDS.keys()):
        if now - PROCESSED_MESSAGE_IDS[k] > DEDUP_TTL_SECONDS:
            del PROCESSED_MESSAGE_IDS[k]
        else:
            break

    if msg_id in PROCESSED_MESSAGE_IDS:
        return True

    PROCESSED_MESSAGE_IDS[msg_id] = now
    # Cap size to 500 entries
    if len(PROCESSED_MESSAGE_IDS) > 500:
        PROCESSED_MESSAGE_IDS.popitem(last=False)
    return False

router = APIRouter(prefix="/api/business/whatsapp", tags=["Business WhatsApp"])


async def _resolve_business_session_name(business: Business) -> str:
    """Returns the type-specific session name, or legacy 'clinic_<id>' if already connected in WAHA."""
    session_name = waha_service.get_session_name(business.id, business.business_type)
    if session_name != f"clinic_{business.id}":
        try:
            legacy_name = f"clinic_{business.id}"
            legacy_status = await waha_service.get_waha_session_status(legacy_name)
            if legacy_status == "WORKING":
                return legacy_name
        except Exception:
            pass
    return session_name


@router.get("/status")
async def check_whatsapp_status(current_business: Business = Depends(get_current_business)):
    """Returns the current connection status of the business WhatsApp session."""
    session_name = await _resolve_business_session_name(current_business)
    status_str = await waha_service.get_waha_session_status(session_name)
    return {
        "session": session_name,
        "status": status_str,
        "connected": status_str == "WORKING"
    }


@router.get("/qr")
async def get_connection_qr(current_business: Business = Depends(get_current_business)):
    """Returns the QR code data for the business owner to scan via WhatsApp Linked Devices."""
    session_name = await _resolve_business_session_name(current_business)
    qr_data = await waha_service.get_waha_qr(session_name)
    status_str = await waha_service.get_waha_session_status(session_name)

    if not qr_data and status_str == "WORKING":
        return {"connected": True, "qr": None, "status": "WORKING"}

    return {
        "connected": status_str == "WORKING",
        "qr": qr_data,
        "status": status_str
    }


@router.post("/disconnect")
async def disconnect_whatsapp(current_business: Business = Depends(get_current_business)):
    """Disconnects and logs out the linked WhatsApp Web device."""
    session_name = await _resolve_business_session_name(current_business)
    success = await waha_service.stop_waha_session(session_name)
    return {"success": success}


@router.post("/reset")
async def reset_whatsapp_session(current_business: Business = Depends(get_current_business)):
    """Forces session teardown and prepares a brand-new QR code handshake."""
    session_name = waha_service.get_session_name(current_business.id, current_business.business_type)
    await waha_service.reset_waha_session(session_name)
    if session_name != f"clinic_{current_business.id}":
        try:
            await waha_service.reset_waha_session(f"clinic_{current_business.id}")
        except Exception:
            pass
    # Start fresh immediately
    await waha_service.get_or_start_waha_session(session_name)
    return {"status": "reset_complete"}


def extract_sender_phone(sender_chat_id: str, msg_payload: Optional[Dict[str, Any]] = None) -> str:
    """
    Extracts the customer's real phone number from sender_chat_id or msg_payload.
    Handles standard JIDs (e.g. '923001234567@c.us' -> '+923001234567') and
    resolves @lid devices by inspecting payload metadata or falls back to clean ID.
    """
    if msg_payload and isinstance(msg_payload, dict):
        candidates = [
            msg_payload.get("_data", {}).get("Info", {}).get("SenderAlt"),
            msg_payload.get("author"),
            msg_payload.get("participant"),
            msg_payload.get("_data", {}).get("author"),
            msg_payload.get("_data", {}).get("from"),
        ]
        for cand in candidates:
            if cand and isinstance(cand, str) and ("@c.us" in cand or "@s.whatsapp.net" in cand):
                raw = cand.split("@")[0].strip()
                digits = "".join(c for c in raw if c.isdigit())
                if len(digits) >= 9:
                    return f"+{digits}"

    if sender_chat_id:
        raw = sender_chat_id.split("@")[0].strip()
        digits = "".join(c for c in raw if c.isdigit())
        if digits:
            return f"+{digits}"

    return ""


async def process_waha_message_task(
    session_name: str,
    sender_chat_id: str,
    user_text: str,
    msg_payload: Optional[Dict[str, Any]] = None
):
    """Background task resolving business, running AI agent, and dispatching reply."""
    db: Session = SessionLocal()
    try:
        sender_phone = extract_sender_phone(sender_chat_id, msg_payload)
        print(f"\n[WAHA AI Worker] Incoming message from {sender_chat_id} (Phone: {sender_phone}, Session: {session_name}): {user_text}")

        # 1. Resolve business ID (handles 'clinic_<uuid>', 'restaurant_<uuid>', 'biz_<uuid>', or fallback)
        business = None
        raw_id = session_name
        for prefix in ("clinic_", "restaurant_", "biz_", "business_"):
            if raw_id.startswith(prefix):
                raw_id = raw_id[len(prefix):].strip()
                break

        # Try UUID first
        try:
            biz_uuid = UUID(raw_id)
            business = db.query(Business).filter(Business.id == biz_uuid).first()
        except (ValueError, AttributeError):
            pass
        except Exception:
            db.rollback()

        # Try slug next
        if not business:
            try:
                business = db.query(Business).filter(Business.slug == raw_id).first()
            except Exception:
                db.rollback()

        # If not resolved by session prefix, check configured fallback DEFAULT_BUSINESS_ID
        if not business:
            default_id = getattr(settings, "DEFAULT_BUSINESS_ID", None)
            if default_id:
                raw_default = str(default_id).strip()
                try:
                    biz_uuid = UUID(raw_default)
                    business = db.query(Business).filter(Business.id == biz_uuid).first()
                except (ValueError, AttributeError):
                    pass
                except Exception:
                    db.rollback()

                if not business:
                    try:
                        business = db.query(Business).filter(Business.slug == raw_default).first()
                    except Exception:
                        db.rollback()

        # Final fallback to first clinic or first business in DB for testing
        if not business:
            try:
                business = db.query(Business).filter(Business.business_type == "clinic").first()
                if not business:
                    business = db.query(Business).first()
            except Exception:
                db.rollback()

        if not business:
            print(f"[WAHA Worker Error] No business found in database for session {session_name}")
            logger.error(f"[WAHA Worker Error] No business found in database for session {session_name}")
            return

        print(f"[WAHA AI Worker] Resolved business: '{business.name}' (Type: {business.business_type}, ID: {business.id})")
        logger.info(f"[WAHA AI Worker] Resolved business: '{business.name}' (Type: {business.business_type}, ID: {business.id})")

        # 2. Extract clean phone and build session key
        clean_phone = sender_chat_id.split("@")[0]
        session_id = f"wa_qr_{business.id}_{clean_phone}"

        # 3. Call AI Receptionist agent (preserves slot locking and context, passing customer phone)
        res = process_chat(
            message=user_text,
            session_id=session_id,
            business=business,
            db=db,
            customer_phone=sender_phone
        )
        if hasattr(res, "__await__"):
            result = await res
        else:
            result = res

        reply_text = result.get("text", "Aapki request receive ho gayi hai.")
        print(f"[WAHA AI Worker] Generated Reply: {reply_text}")

        # 4. Dispatch reply back via WAHA
        sent = await waha_service.send_waha_text(
            session_name=session_name,
            chat_id=sender_chat_id,
            message=reply_text
        )
        print(f"[WAHA Outbound Result] Sent: {sent}")

    except Exception as e:
        print(f"[WAHA Worker Exception] Error processing message: {e}")
        logger.error(f"[WAHA Worker Exception] Error processing message: {e}", exc_info=True)
        try:
            fallback_msg = "Aapka message receive ho gaya hai. Main aap ki kya madad kar sakta hoon? Please apna sawal dobara bataiye."
            await waha_service.send_waha_text(
                session_name=session_name,
                chat_id=sender_chat_id,
                message=fallback_msg
            )
            print(f"[WAHA Worker Fallback] Sent fallback reply to {sender_chat_id}")
        except Exception as send_err:
            logger.error(f"[WAHA Worker Fallback Error] Failed to send fallback reply: {send_err}")
    finally:
        db.close()


@router.post("/webhook")
async def handle_waha_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receives inbound messages forwarded by WAHA via ngrok."""
    try:
        data = await request.json()
    except Exception:
        return {"status": "invalid_json"}

    event = data.get("event")
    session_name = data.get("session", "default")
    msg_data = data.get("payload", {})
    if not isinstance(msg_data, dict):
        msg_data = {}

    print(f"[WAHA Webhook Event] event={event}, session={session_name}")

    # 1. STRICT EVENT FILTER: Accept ONLY 'message' (drop 'message.any', 'message.ack', etc.)
    if event != "message":
        return {"status": "ignored_non_primary_event", "event": event}

    # 2. Ignore messages sent by ourselves
    if msg_data.get("fromMe", False):
        return {"status": "ignored_self"}

    # 3. Extract unique message ID for deduplication
    msg_id = msg_data.get("id") or data.get("id")
    if msg_id and is_duplicate_message(str(msg_id)):
        print(f"[WAHA Deduplication] Dropped duplicate webhook for message_id: {msg_id}")
        return {"status": "ignored_duplicate", "id": msg_id}

    sender_chat_id = (
        msg_data.get("from")
        or msg_data.get("chatId")
        or data.get("from")
    )
    body = (
        msg_data.get("body")
        or msg_data.get("text")
        or data.get("body")
    )

    # 4. Ignore non-user or empty bodies (e.g. system status updates, group joins)
    if not sender_chat_id or not body:
        return {"status": "ignored_empty_body"}

    # Ignore WhatsApp Broadcast/Status messages
    if "status@broadcast" in str(sender_chat_id):
        return {"status": "ignored_broadcast"}

    background_tasks.add_task(
        process_waha_message_task,
        session_name=session_name,
        sender_chat_id=sender_chat_id,
        user_text=body,
        msg_payload=msg_data
    )

    return {"status": "queued"}
