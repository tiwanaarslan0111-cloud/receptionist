import base64
import logging
import os
from typing import Optional, Dict, Any, Union
from uuid import UUID
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def get_waha_base_url() -> str:
    """Resolves WAHA base URL, prioritizing OS environment variable for container networking."""
    return os.getenv("WAHA_BASE_URL", getattr(settings, "WAHA_BASE_URL", "http://waha:3000"))


def get_waha_webhook_url() -> str:
    """Resolves webhook callback URL for WAHA event delivery."""
    return os.getenv("WAHA_WEBHOOK_URL", getattr(settings, "WAHA_WEBHOOK_URL", "http://backend:8000/api/business/whatsapp/webhook"))


def get_session_name(business_id: Union[int, str, UUID], business_type: Optional[str] = None) -> str:
    """
    Returns session name prefixed by business type (e.g. 'clinic_<id>' or 'restaurant_<id>').
    Defaults to 'clinic' if business_type is omitted or None.
    """
    prefix = (business_type or "clinic").lower().strip()
    return f"{prefix}_{business_id}"


def _get_waha_headers() -> Dict[str, str]:
    headers: Dict[str, str] = {}
    api_key = getattr(settings, "WAHA_API_KEY", None)
    if api_key:
        headers["X-Api-Key"] = api_key
    return headers


async def reset_waha_session(session_name: str) -> bool:
    """Stops and clears an errored or hung session so a fresh QR handshake can be initiated."""
    headers = _get_waha_headers()
    base_url = get_waha_base_url()
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            # 1. Stop session
            await client.post(
                f"{base_url}/api/sessions/stop",
                json={"name": session_name},
                headers=headers
            )
        except Exception as e:
            logger.debug(f"[WAHA Reset Stop Notice] {e}")

        try:
            # 2. Delete / logout session
            await client.delete(
                f"{base_url}/api/sessions/{session_name}",
                headers=headers
            )
            return True
        except Exception as e:
            logger.warning(f"[WAHA Reset Warning] {e}")
            return False


async def get_or_start_waha_session(session_name: str) -> Dict[str, Any]:
    """Ensures session exists with webhook registered and starts the QR handshake."""
    headers = _get_waha_headers()
    base_url = get_waha_base_url()
    webhook_url = get_waha_webhook_url()

    async with httpx.AsyncClient(timeout=15.0) as client:
        # Check current status
        try:
            status_res = await client.get(f"{base_url}/api/sessions/{session_name}", headers=headers)
            if status_res.status_code == 200:
                data = status_res.json()
                # If the session got stuck in FAILED or STOPPED, reset it to get a clean handshake
                if data.get("status") in ["FAILED", "STOPPED"]:
                    await reset_waha_session(session_name)
                else:
                    # Ensure existing session has only the primary 'message' event registered
                    registered_webhooks = data.get("config", {}).get("webhooks", [])
                    has_exact_webhook = any(
                        w.get("url") == webhook_url and w.get("events") == ["message"]
                        for w in registered_webhooks
                    )
                    if not has_exact_webhook:
                        try:
                            update_payload = {
                                "config": {
                                    "webhooks": [
                                        {
                                            "url": webhook_url,
                                            "events": ["message"]
                                        }
                                    ]
                                }
                            }
                            update_res = await client.put(
                                f"{base_url}/api/sessions/{session_name}",
                                json=update_payload,
                                headers=headers
                            )
                            if update_res.status_code == 200:
                                data = update_res.json()
                        except Exception as e:
                            logger.warning(f"[WAHA Webhook Update Warning] {e}")
                    return data
        except Exception as e:
            logger.debug(f"[WAHA get_or_start_waha_session check error] {e}")

        # Start clean session with explicit webhook (only primary 'message' event)
        payload = {
            "name": session_name,
            "start": True,
            "config": {
                "webhooks": [
                    {
                        "url": webhook_url,
                        "events": ["message"]
                    }
                ]
            }
        }
        try:
            start_res = await client.post(f"{base_url}/api/sessions/start", json=payload, headers=headers)
            if start_res.status_code in [200, 201]:
                return start_res.json()
        except Exception as e:
            logger.warning(f"[WAHA get_or_start_waha_session start error] {e}")
        return {}


async def get_fresh_qr(session_name: str) -> Optional[str]:
    """Fetches a fresh QR code, avoiding client-side caching."""
    await get_or_start_waha_session(session_name)
    headers = _get_waha_headers()
    base_url = get_waha_base_url()
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.get(f"{base_url}/api/{session_name}/auth/qr", headers=headers)
            if res.status_code == 200:
                # WAHA can return binary image or JSON with data-url/image
                content_type = res.headers.get("content-type", "")
                if "json" in content_type:
                    data = res.json()
                    return data.get("qr") or data.get("data")
                encoded = base64.b64encode(res.content).decode("utf-8")
                return f"data:image/png;base64,{encoded}"
        except Exception as e:
            logger.warning(f"[WAHA get_fresh_qr error] {e}")
        return None


# Alias for backward compatibility
get_waha_qr = get_fresh_qr


async def get_waha_session_status(session_name: str) -> str:
    """Returns: STOPPED, STARTING, SCAN_QR_CODE, WORKING, or FAILED."""
    headers = _get_waha_headers()
    base_url = get_waha_base_url()
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.get(f"{base_url}/api/sessions/{session_name}", headers=headers)
            if res.status_code == 200:
                return res.json().get("status", "UNKNOWN")
        except Exception:
            return "NOT_STARTED"
        return "NOT_STARTED"


async def stop_waha_session(session_name: str) -> bool:
    """Logs out and stops the WAHA WhatsApp Web session."""
    headers = _get_waha_headers()
    base_url = get_waha_base_url()
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            res = await client.post(f"{base_url}/api/sessions/stop", json={"name": session_name}, headers=headers)
            return res.status_code in [200, 201]
        except Exception as e:
            logger.warning(f"[WAHA stop_waha_session error] {e}")
            return False


async def send_waha_text(session_name: str, chat_id: str, message: str) -> bool:
    """Sends outbound WhatsApp message through the authenticated session."""
    headers = _get_waha_headers()
    base_url = get_waha_base_url()
    async with httpx.AsyncClient(timeout=15.0) as client:
        payload = {
            "session": session_name,
            "chatId": chat_id,
            "text": message
        }
        try:
            res = await client.post(f"{base_url}/api/sendText", json=payload, headers=headers)
            if res.status_code not in [200, 201]:
                err_msg = f"status={res.status_code}, response={res.text}"
                print(f"[WAHA Send Error] {err_msg}")
                logger.error(f"[WAHA Send Error] session={session_name}, chat_id={chat_id}, {err_msg}")
                return False
            return True
        except Exception as e:
            err_type = type(e).__name__
            err_msg = str(e) or repr(e)
            print(f"[WAHA Send Exception] {err_type}: {err_msg}")
            logger.error(f"[WAHA send_waha_text error] session={session_name}, chat_id={chat_id}, {err_type}: {err_msg}", exc_info=True)
            return False


async def resolve_lid_to_phone(session_name: str, lid: str) -> Optional[str]:
    """
    Attempts to resolve a WhatsApp Linked ID (@lid) to an actual phone number (@c.us)
    using WAHA Lids and Contacts APIs.
    Returns international formatted phone (e.g. '+92345678764') if resolved, or None.
    """
    if not lid:
        return None
    raw_lid = lid.split("@")[0].strip()
    if not raw_lid:
        return None

    headers = _get_waha_headers()
    base_url = get_waha_base_url()

    async with httpx.AsyncClient(timeout=5.0) as client:
        # 1. Try WAHA Lids API: /api/{session}/lids/{lid}
        candidate_params = [raw_lid, f"{raw_lid}@lid"]
        for p in candidate_params:
            try:
                res = await client.get(f"{base_url}/api/{session_name}/lids/{p}", headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    val = None
                    if isinstance(data, dict):
                        val = data.get("pn") or data.get("phoneNumber") or data.get("phone")
                    elif isinstance(data, str):
                        val = data
                    if val and isinstance(val, str):
                        digits = "".join(c for c in val.split("@")[0] if c.isdigit())
                        if len(digits) >= 9:
                            return f"+{digits}"
            except Exception as e:
                logger.debug(f"[WAHA resolve_lid_to_phone lids endpoint failed] {e}")

        # 2. Try WAHA Contacts API: /api/contacts/{chatId} and /api/{session}/contacts/{chatId}
        for endpoint in [f"/api/{session_name}/contacts/{raw_lid}@lid", f"/api/contacts/{raw_lid}@lid"]:
            try:
                res = await client.get(f"{base_url}{endpoint}", headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    if isinstance(data, dict):
                        val = data.get("number") or data.get("phoneNumber") or data.get("pn")
                        if val and isinstance(val, str):
                            digits = "".join(c for c in val.split("@")[0] if c.isdigit())
                            if len(digits) >= 9:
                                return f"+{digits}"
            except Exception as e:
                logger.debug(f"[WAHA resolve_lid_to_phone contact endpoint failed] {e}")

    return None

