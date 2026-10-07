import pytest
import unittest.mock as mock
import httpx
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Business
from app.routers.whatsapp import process_whatsapp_message_task
from app.services.whatsapp_service import (
    send_whatsapp_text,
    send_whatsapp_voice,
    transcribe_whatsapp_audio,
    generate_speech_audio
)


@pytest.fixture(autouse=True)
def enable_meta_cloud_api_for_legacy_tests(monkeypatch):
    """Enable Meta Cloud API by default for its dedicated test suite."""
    monkeypatch.setattr(settings, "ENABLE_META_CLOUD_API", True)


def test_webhook_meta_disabled_returns_guard_status(client: TestClient, monkeypatch):
    """When ENABLE_META_CLOUD_API is False, POST /api/whatsapp/webhook gracefully returns meta_cloud_api_disabled."""
    monkeypatch.setattr(settings, "ENABLE_META_CLOUD_API", False)
    response = client.post("/api/whatsapp/webhook", json={"entry": []})
    assert response.status_code == 200
    assert response.json() == {"status": "meta_cloud_api_disabled"}


def test_webhook_verification_success(client: TestClient):
    """GET /api/whatsapp/webhook responds with the challenge when verify_token matches."""
    challenge_token = "challenge_xyz_987"
    response = client.get(
        "/api/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": settings.WHATSAPP_VERIFY_TOKEN,
            "hub.challenge": challenge_token
        }
    )
    assert response.status_code == 200
    assert response.text == challenge_token


def test_webhook_verification_failure(client: TestClient):
    """GET /api/whatsapp/webhook returns 403 Forbidden when verify_token does not match."""
    response = client.get(
        "/api/whatsapp/webhook",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "incorrect_token_here",
            "hub.challenge": "challenge_xyz_987"
        }
    )
    assert response.status_code == 403
    assert "Verification failed" in response.text


def test_webhook_post_empty_payload(client: TestClient):
    """POST /api/whatsapp/webhook returns ok even for empty entries without error."""
    response = client.post("/api/whatsapp/webhook", json={})
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_webhook_post_delivery_status_notification(client: TestClient):
    """POST /api/whatsapp/webhook handles status notifications (sent, delivered, read) without error."""
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456789",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15551234567",
                                "phone_number_id": "10987654321"
                            },
                            "statuses": [
                                {
                                    "id": "wamid.HBgL...",
                                    "status": "delivered",
                                    "timestamp": "1700000000",
                                    "recipient_id": "923001234567"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }
    response = client.post("/api/whatsapp/webhook", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_webhook_post_text_message_triggers_background_task(client: TestClient):
    """POST /api/whatsapp/webhook receives incoming text message and queues processing task with is_voice=False."""
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456789",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15551234567",
                                "phone_number_id": "999888777"
                            },
                            "contacts": [{"profile": {"name": "Test User"}, "wa_id": "923001234567"}],
                            "messages": [
                                {
                                    "from": "923001234567",
                                    "id": "wamid.HBgL...",
                                    "timestamp": "1700000001",
                                    "text": {"body": "Kya Dr. Sarah available hain?"},
                                    "type": "text"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }

    with mock.patch("app.routers.whatsapp.process_whatsapp_message_task") as mock_task:
        mock_task.return_value = None
        response = client.post("/api/whatsapp/webhook", json=payload)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_webhook_post_audio_message_triggers_background_task(client: TestClient):
    """POST /api/whatsapp/webhook receives incoming audio message, transcribes, and queues task with is_voice=True."""
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "123456789",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "15551234567",
                                "phone_number_id": "999888777"
                            },
                            "messages": [
                                {
                                    "from": "923001234567",
                                    "id": "wamid.audio123",
                                    "timestamp": "1700000002",
                                    "type": "audio",
                                    "audio": {"id": "meta_media_id_999"}
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }

    with mock.patch("app.routers.whatsapp.transcribe_whatsapp_audio", return_value="Voice transcript text") as mock_stt, \
         mock.patch("app.routers.whatsapp.process_whatsapp_message_task") as mock_task:
        mock_task.return_value = None
        response = client.post("/api/whatsapp/webhook", json=payload)
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        mock_stt.assert_called_once_with("meta_media_id_999")


@pytest.mark.asyncio
async def test_process_whatsapp_message_task_text_flow(clinic_tenant_a, db: Session):
    """Verifies process_whatsapp_message_task handles incoming text by replying with text."""
    phone_number_id = "test_meta_phone_id_clinic_a"
    sender_phone = "923009988776"
    user_query = "Mujhe doctor appointment book karni hai."

    biz = clinic_tenant_a["business"]
    biz.inbound_phone_id = phone_number_id
    db.commit()
    business_id = biz.id

    with mock.patch("app.routers.whatsapp.process_chat") as mock_chat, \
         mock.patch("app.routers.whatsapp.send_whatsapp_text") as mock_send_text:

        mock_chat.return_value = {
            "text": "Ji bilkul, Dr. Sarah available hain.",
            "action_taken": None,
            "booking_details": None
        }
        mock_send_text.return_value = True

        await process_whatsapp_message_task(
            sender_phone=sender_phone,
            user_text=user_query,
            is_voice=False,
            phone_number_id=phone_number_id,
            db=db
        )

        mock_chat.assert_called_once()
        call_kwargs = mock_chat.call_args.kwargs
        assert call_kwargs["message"] == user_query
        assert call_kwargs["session_id"] == f"wa_{business_id}_{sender_phone}"

        mock_send_text.assert_called_once_with(
            to_phone=sender_phone,
            message="Ji bilkul, Dr. Sarah available hain.",
            phone_number_id=phone_number_id
        )


@pytest.mark.asyncio
async def test_process_whatsapp_message_task_voice_flow(clinic_tenant_a, db: Session):
    """Verifies process_whatsapp_message_task generates TTS and dispatches audio message when is_voice=True."""
    phone_number_id = "test_meta_phone_id_clinic_a"
    sender_phone = "923009988776"
    user_query = "Voice transcribed text"

    biz = clinic_tenant_a["business"]
    biz.inbound_phone_id = phone_number_id
    db.commit()
    business_id = biz.id

    with mock.patch("app.routers.whatsapp.process_chat") as mock_chat, \
         mock.patch("app.routers.whatsapp.generate_speech_audio", return_value=(b"wav_bytes", "audio/wav")) as mock_tts, \
         mock.patch("app.routers.whatsapp.send_whatsapp_voice", return_value=True) as mock_send_voice:

        mock_chat.return_value = {
            "text": "Doctor is available tomorrow at 10 AM.",
            "action_taken": None,
            "booking_details": None
        }

        await process_whatsapp_message_task(
            sender_phone=sender_phone,
            user_text=user_query,
            is_voice=True,
            phone_number_id=phone_number_id,
            db=db
        )

        mock_tts.assert_called_once_with("Doctor is available tomorrow at 10 AM.")
        mock_send_voice.assert_called_once_with(
            to_phone=sender_phone,
            audio_bytes=b"wav_bytes",
            mime_type="audio/wav",
            phone_number_id=phone_number_id
        )


@pytest.mark.asyncio
async def test_process_whatsapp_message_task_voice_fallback_to_text(clinic_tenant_a, db: Session):
    """Verifies fallback to text message if voice dispatch fails."""
    phone_number_id = "test_meta_phone_id_clinic_a"
    sender_phone = "923009988776"

    biz = clinic_tenant_a["business"]
    biz.inbound_phone_id = phone_number_id
    db.commit()

    with mock.patch("app.routers.whatsapp.process_chat") as mock_chat, \
         mock.patch("app.routers.whatsapp.generate_speech_audio", return_value=(b"wav_bytes", "audio/wav")), \
         mock.patch("app.routers.whatsapp.send_whatsapp_voice", return_value=False), \
         mock.patch("app.routers.whatsapp.send_whatsapp_text", return_value=True) as mock_send_text:

        mock_chat.return_value = {
            "text": "Doctor is available tomorrow at 10 AM.",
            "action_taken": None,
            "booking_details": None
        }

        await process_whatsapp_message_task(
            sender_phone=sender_phone,
            user_text="User voice note query",
            is_voice=True,
            phone_number_id=phone_number_id,
            db=db
        )

        # Outbound text fallback must be called
        mock_send_text.assert_called_once_with(
            to_phone=sender_phone,
            message="Doctor is available tomorrow at 10 AM.",
            phone_number_id=phone_number_id
        )


@pytest.mark.asyncio
async def test_generate_speech_audio_groq():
    """generate_speech_audio uses Orpheus TTS for Groq."""
    mock_llm_client = mock.MagicMock()
    mock_speech_response = mock.MagicMock()
    mock_speech_response.content = b"fake_wav_bytes"
    mock_llm_client.audio.speech.create.return_value = mock_speech_response

    with mock.patch.object(settings, "LLM_PROVIDER", "groq"), \
         mock.patch("app.services.whatsapp_service.get_llm_client", return_value=(mock_llm_client, "gpt-model")):

        audio_bytes, mime_type = await generate_speech_audio("Hello there")
        assert audio_bytes == b"fake_wav_bytes"
        assert mime_type == "audio/wav"
        mock_llm_client.audio.speech.create.assert_called_once_with(
            model="canopylabs/orpheus-v1-english",
            voice="troy",
            input="Hello there",
            response_format="wav"
        )


@pytest.mark.asyncio
async def test_generate_speech_audio_openai():
    """generate_speech_audio uses tts-1 shimmer Opus for OpenAI."""
    mock_llm_client = mock.MagicMock()
    mock_speech_response = mock.MagicMock()
    mock_speech_response.content = b"fake_opus_bytes"
    mock_llm_client.audio.speech.create.return_value = mock_speech_response

    with mock.patch.object(settings, "LLM_PROVIDER", "openai"), \
         mock.patch("app.services.whatsapp_service.get_llm_client", return_value=(mock_llm_client, "gpt-model")):

        audio_bytes, mime_type = await generate_speech_audio("Assalam-o-Alaikum")
        assert audio_bytes == b"fake_opus_bytes"
        assert mime_type == "audio/ogg"
        mock_llm_client.audio.speech.create.assert_called_once_with(
            model="tts-1",
            voice="shimmer",
            input="Assalam-o-Alaikum",
            response_format="opus"
        )


@pytest.mark.asyncio
async def test_send_whatsapp_text_missing_credentials():
    """send_whatsapp_text returns False gracefully if tokens are not configured."""
    with mock.patch.object(settings, "WHATSAPP_ACCESS_TOKEN", None), \
         mock.patch.object(settings, "WHATSAPP_PHONE_NUMBER_ID", None):
        result = await send_whatsapp_text(to_phone="923001234567", message="Hello")
        assert result is False


@pytest.mark.asyncio
async def test_send_whatsapp_text_success():
    """send_whatsapp_text calls Meta Graph API and returns True on success."""
    fake_response = mock.MagicMock(spec=httpx.Response)
    fake_response.status_code = 200

    with mock.patch.object(settings, "WHATSAPP_ACCESS_TOKEN", "mock_token"), \
         mock.patch.object(settings, "WHATSAPP_PHONE_NUMBER_ID", "123456"), \
         mock.patch("httpx.AsyncClient.post", return_value=fake_response) as mock_post:

        result = await send_whatsapp_text(
            to_phone="923001234567",
            message="Test message reply"
        )
        assert result is True
        mock_post.assert_called_once()
        assert "123456/messages" in mock_post.call_args[0][0]


@pytest.mark.asyncio
async def test_send_whatsapp_voice_success():
    """send_whatsapp_voice uploads audio binary to Meta and dispatches audio message."""
    upload_resp = mock.MagicMock(spec=httpx.Response)
    upload_resp.status_code = 200
    upload_resp.json.return_value = {"id": "meta_uploaded_media_123"}

    msg_resp = mock.MagicMock(spec=httpx.Response)
    msg_resp.status_code = 200

    async def mock_post(url, **kwargs):
        if "media" in url:
            return upload_resp
        return msg_resp

    with mock.patch.object(settings, "WHATSAPP_ACCESS_TOKEN", "mock_token"), \
         mock.patch.object(settings, "WHATSAPP_PHONE_NUMBER_ID", "123456"), \
         mock.patch("httpx.AsyncClient.post", side_effect=mock_post):

        success = await send_whatsapp_voice(
            to_phone="923001234567",
            audio_bytes=b"raw_audio_binary",
            mime_type="audio/wav"
        )
        assert success is True


@pytest.mark.asyncio
async def test_transcribe_whatsapp_audio_success():
    """transcribe_whatsapp_audio fetches media URL, downloads audio bytes, and transcribes via Whisper."""
    meta_url_resp = mock.MagicMock(spec=httpx.Response)
    meta_url_resp.status_code = 200
    meta_url_resp.json.return_value = {"url": "https://lookaside.fbsbx.com/sample_audio.ogg"}

    audio_bytes_resp = mock.MagicMock(spec=httpx.Response)
    audio_bytes_resp.status_code = 200
    audio_bytes_resp.content = b"OggS_fake_audio_binary_data"

    mock_llm_client = mock.MagicMock()
    mock_transcription = mock.MagicMock()
    mock_transcription.text = "Hello I want to book an appointment with Dr. Ali"
    mock_llm_client.audio.transcriptions.create.return_value = mock_transcription

    async def mock_get(url, headers):
        if "sample_audio.ogg" in url:
            return audio_bytes_resp
        return meta_url_resp

    with mock.patch.object(settings, "WHATSAPP_ACCESS_TOKEN", "mock_token"), \
         mock.patch("httpx.AsyncClient.get", side_effect=mock_get), \
         mock.patch("app.services.whatsapp_service.get_llm_client", return_value=(mock_llm_client, "whisper")):

        transcript = await transcribe_whatsapp_audio("media_id_12345")
        assert transcript == "Hello I want to book an appointment with Dr. Ali"
