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


def get_session_name(business_id: Union[int, str, UUID]) -> str:
    return f"clinic_{business_id}"


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
                print(f"[WAHA Send Error] status={res.status_code}, response={res.text}")
                logger.error(f"[WAHA Send Error] status={res.status_code}, response={res.text}")
                return False
            return True
        except Exception as e:
            print(f"[WAHA Send Exception] {e}")
            logger.error(f"[WAHA send_waha_text error] {e}")
            return False
