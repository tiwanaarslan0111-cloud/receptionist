import io
import logging
import httpx
from typing import Optional
from app.config import settings
from app.services.llm_client import get_llm_client

logger = logging.getLogger(__name__)

GRAPH_API_URL = "https://graph.facebook.com/v21.0"


def _clean_token(token: Optional[str]) -> str:
    return (token or "").strip().strip('"').strip("'")


async def transcribe_whatsapp_audio(media_id: str) -> Optional[str]:
    """Downloads audio file from Meta Graph API and transcribes it using Groq or OpenAI Whisper."""
    token = _clean_token(settings.WHATSAPP_ACCESS_TOKEN)
    if not token:
        logger.error("[WhatsApp STT] Missing WHATSAPP_ACCESS_TOKEN.")
        print("[WhatsApp STT] Missing WHATSAPP_ACCESS_TOKEN.")
        return None

    headers = {"Authorization": f"Bearer {token}"}

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            # 1. Retrieve the binary download URL
            meta_res = await client.get(f"{GRAPH_API_URL}/{media_id}", headers=headers)
            if meta_res.status_code != 200:
                logger.error(f"[WhatsApp STT] Failed to get media URL: {meta_res.text}")
                print(f"[WhatsApp STT] Failed to get media URL: {meta_res.text}")
                return None
            download_url = meta_res.json().get("url")
            if not download_url:
                logger.error("[WhatsApp STT] No download URL returned by Meta.")
                return None

            # 2. Download the raw audio stream
            audio_res = await client.get(download_url, headers=headers)
            if audio_res.status_code != 200:
                logger.error(f"[WhatsApp STT] Failed to download audio: {audio_res.text}")
                print(f"[WhatsApp STT] Failed to download audio: {audio_res.text}")
                return None
            audio_bytes = audio_res.content

        # 3. Transcribe with Whisper
        client_llm, _ = get_llm_client()
        provider = getattr(settings, "LLM_PROVIDER", "groq").lower().strip()
        model_name = "whisper-large-v3" if provider == "groq" else "whisper-1"

        transcription = client_llm.audio.transcriptions.create(
            file=("voice_note.ogg", audio_bytes),
            model=model_name
        )
        return transcription.text
    except Exception as e:
        logger.error(f"[WhatsApp STT Exception] {e}", exc_info=True)
        print(f"[WhatsApp STT Exception] {e}")
        return None


async def generate_speech_audio(text: str) -> tuple[Optional[bytes], str]:
    """
    Generates audio bytes and content type based on the active provider.
    - Groq: Uses canopylabs/orpheus-v1-english (WAV / audio/wav)
    - OpenAI: Uses tts-1 (Opus / audio/ogg)
    Returns: (audio_bytes, mime_type)
    """
    client_llm, _ = get_llm_client()
    provider = getattr(settings, "LLM_PROVIDER", "groq").lower().strip()

    try:
        if provider == "groq":
            # Groq Text to Speech
            response = client_llm.audio.speech.create(
                model="canopylabs/orpheus-v1-english",
                voice="troy",
                input=text,
                response_format="wav"
            )
            # Support both direct response.content or SDK write buffer
            if hasattr(response, "content"):
                return response.content, "audio/wav"
            elif hasattr(response, "read"):
                return response.read(), "audio/wav"
            return bytes(response), "audio/wav"
        else:
            # OpenAI Text to Speech (Opus format for native WhatsApp voice note)
            response = client_llm.audio.speech.create(
                model="tts-1",
                voice="shimmer",
                input=text,
                response_format="opus"
            )
            return response.content, "audio/ogg"
    except Exception as e:
        logger.error(f"[TTS Error - {provider}] {e}", exc_info=True)
        print(f"[TTS Error - {provider}] {e}")
        return None, ""


async def send_whatsapp_text(to_phone: str, message: str, phone_number_id: Optional[str] = None) -> bool:
    """Sends outbound plain text message."""
    pid = phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID
    token = _clean_token(settings.WHATSAPP_ACCESS_TOKEN)

    if not pid or not token:
        logger.error("[WhatsApp Service] Missing credentials.")
        print("[WhatsApp Service] Missing credentials.")
        return False

    url = f"{GRAPH_API_URL}/{pid}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to_phone,
        "type": "text",
        "text": {"preview_url": False, "body": message}
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code >= 400:
                logger.error(f"[WhatsApp Text Error] {resp.status_code}: {resp.text}")
                print(f"[WhatsApp Text Error] {resp.status_code}: {resp.text}")
                return False
            return True
    except Exception as e:
        logger.error(f"[WhatsApp Text Exception] {e}")
        print(f"[WhatsApp Text Exception] {e}")
        return False


async def send_whatsapp_voice(to_phone: str, audio_bytes: bytes, mime_type: str = "audio/ogg", phone_number_id: Optional[str] = None) -> bool:
    """Uploads audio to Meta Media API and dispatches an audio message."""
    pid = phone_number_id or settings.WHATSAPP_PHONE_NUMBER_ID
    token = _clean_token(settings.WHATSAPP_ACCESS_TOKEN)

    if not pid or not token:
        logger.error("[WhatsApp Service] Missing credentials.")
        print("[WhatsApp Service] Missing credentials.")
        return False

    headers = {"Authorization": f"Bearer {token}"}
    file_ext = "wav" if "wav" in mime_type else "ogg"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Upload media binary to Meta
            upload_url = f"{GRAPH_API_URL}/{pid}/media"
            files = {
                "file": (f"reply_voice.{file_ext}", audio_bytes, mime_type)
            }
            data = {
                "messaging_product": "whatsapp",
                "type": mime_type
            }

            upload_res = await client.post(upload_url, headers=headers, files=files, data=data)
            if upload_res.status_code >= 400:
                logger.error(f"[Meta Media Upload Error] {upload_res.status_code}: {upload_res.text}")
                print(f"[Meta Media Upload Error] {upload_res.status_code}: {upload_res.text}")
                return False

            media_id = upload_res.json().get("id")
            if not media_id:
                logger.error("[Meta Media Upload Error] No media_id returned in response.")
                return False

            # 2. Send WhatsApp message using the media_id
            msg_url = f"{GRAPH_API_URL}/{pid}/messages"
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": to_phone,
                "type": "audio",
                "audio": {"id": media_id}
            }

            msg_res = await client.post(msg_url, json=payload, headers=headers)
            if msg_res.status_code >= 400:
                logger.error(f"[WhatsApp Audio Send Error] {msg_res.status_code}: {msg_res.text}")
                print(f"[WhatsApp Audio Send Error] {msg_res.status_code}: {msg_res.text}")
                return False

            return True
    except Exception as e:
        logger.error(f"[WhatsApp Audio Send Exception] {e}")
        print(f"[WhatsApp Audio Send Exception] {e}")
        return False
