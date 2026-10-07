import logging
from typing import Optional
from fastapi import APIRouter, Request, Response, BackgroundTasks, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import SessionLocal
from app.models import Business
from app.services.ai_agent import process_chat
from app.services.whatsapp_service import (
    send_whatsapp_text,
    send_whatsapp_voice,
    transcribe_whatsapp_audio,
    generate_speech_audio
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/whatsapp", tags=["WhatsApp"])


@router.get("/webhook")
def verify_meta_webhook(request: Request):
    """Handles the Meta challenge-response verification handshake."""
    params = request.query_params
    mode = params.get("hub.mode")
    verify_token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and verify_token == settings.WHATSAPP_VERIFY_TOKEN:
        return Response(content=challenge or "", media_type="text/plain")
    return Response(content="Verification failed", status_code=status.HTTP_403_FORBIDDEN)


# Alias for backward compatibility
verify_webhook = verify_meta_webhook


async def process_whatsapp_message_task(
    sender_phone: str,
    user_text: str,
    is_voice: bool,
    phone_number_id: Optional[str] = None,
    db: Optional[Session] = None
):
    """
    Background worker:
    1. Opens independent DB session using SessionLocal() to avoid request-lifecycle race conditions.
    2. Identifies tenant business via inbound_phone_id.
    3. Runs AI agent with business context and tools.
    4. Enforces English brevity for Groq TTS compatibility when is_voice is True.
    5. Dispatches outbound voice note (audio) if incoming message was voice, else plain text.
    6. Falls back to text if TTS generation or audio dispatch fails.
    """
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Match clinic by phone_number_id or fall back to first active business
        business = None
        if phone_number_id:
            business = db.query(Business).filter(Business.inbound_phone_id == str(phone_number_id)).first()
            if not business:
                business = db.query(Business).filter(Business.inbound_phone == str(phone_number_id)).first()

        if not business:
            business = db.query(Business).first()

        if not business:
            logger.error("[WhatsApp Worker] No business found in database.")
            print("[WhatsApp Worker] No business found.")
            return

        session_id = f"wa_{business.id}_{sender_phone}"

        if is_voice:
            provider = getattr(settings, "LLM_PROVIDER", "groq").lower()
            lang_instruction = "Respond strictly in clear, professional English." if provider == "groq" else "Respond naturally in Roman Urdu or English."

            prompt_input = (
                f"{user_text}\n\n"
                f"[DIRECTIVE: The user spoke this via a WhatsApp voice note. "
                f"Answer directly in spoken conversational style under 25 words. "
                f"{lang_instruction} "
                f"Do NOT mention you are an AI or describe your technical setup. Just give the answer.]"
            )
        else:
            prompt_input = user_text

        res = process_chat(
            message=prompt_input,
            session_id=session_id,
            business=business,
            db=db
        )
        if hasattr(res, "__await__"):
            result = await res
        else:
            result = res

        reply_text = result.get("text", "Your request has been received.")

        # Outbound Dispatch: Send Voice Note if incoming was voice, else Text
        if is_voice:
            audio_bytes, mime_type = await generate_speech_audio(reply_text)
            sent = False
            if audio_bytes:
                sent = await send_whatsapp_voice(
                    to_phone=sender_phone,
                    audio_bytes=audio_bytes,
                    mime_type=mime_type,
                    phone_number_id=phone_number_id
                )
            if not sent:
                # Graceful fallback to text if audio upload/send encounters an issue
                logger.warning("[WhatsApp Dispatch] Falling back to text message due to audio dispatch failure.")
                await send_whatsapp_text(
                    to_phone=sender_phone,
                    message=reply_text,
                    phone_number_id=phone_number_id
                )
        else:
            await send_whatsapp_text(
                to_phone=sender_phone,
                message=reply_text,
                phone_number_id=phone_number_id
            )
    except Exception as e:
        logger.error(f"[WhatsApp Task Error] {e}", exc_info=True)
        print(f"[WhatsApp Task Error] {e}")
        await send_whatsapp_text(
            to_phone=sender_phone,
            message="Sorry, we could not process your request at this moment. Please try again shortly.",
            phone_number_id=phone_number_id
        )
    finally:
        if close_db and db:
            db.close()


# Alias for backward compatibility
handle_whatsapp_message_async = process_whatsapp_message_task


ENABLE_META_CLOUD_API: bool = getattr(settings, "ENABLE_META_CLOUD_API", False)


@router.post("/webhook")
async def receive_meta_webhook(request: Request, background_tasks: BackgroundTasks):
    """Receives inbound WhatsApp webhooks and queues processing tasks."""
    if not getattr(settings, "ENABLE_META_CLOUD_API", False):
        # Gracefully accept and discard to avoid Meta retries if a Meta webhook is still pointed here
        return {"status": "meta_cloud_api_disabled"}

    try:
        body = await request.json()
    except Exception:
        return {"status": "invalid_json"}

    for entry in body.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            metadata = value.get("metadata", {})
            phone_number_id = metadata.get("phone_number_id")

            for msg in value.get("messages", []):
                sender_phone = msg.get("from")
                msg_type = msg.get("type")
                user_text = None
                is_voice = False

                if msg_type == "text":
                    user_text = msg.get("text", {}).get("body")
                    is_voice = False
                elif msg_type == "audio":
                    media_id = msg.get("audio", {}).get("id")
                    if media_id:
                        user_text = await transcribe_whatsapp_audio(media_id)
                        is_voice = True

                if sender_phone and user_text:
                    background_tasks.add_task(
                        process_whatsapp_message_task,
                        sender_phone=sender_phone,
                        user_text=user_text,
                        is_voice=is_voice,
                        phone_number_id=phone_number_id
                    )

    return {"status": "ok"}
