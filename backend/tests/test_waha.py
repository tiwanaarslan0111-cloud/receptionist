import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Business
from app.services import waha_service
from app.routers.waha import process_waha_message_task


def test_waha_session_name(clinic_tenant_a):
    business_id = clinic_tenant_a["business"].id
    session_name = waha_service.get_session_name(business_id)
    assert session_name == f"clinic_{business_id}"


def test_waha_status_unauthorized(client: TestClient):
    response = client.get("/api/business/whatsapp/status")
    assert response.status_code in [401, 403]


def test_waha_status_authorized(client: TestClient, clinic_tenant_a):
    headers = clinic_tenant_a["headers"]
    with patch("app.services.waha_service.get_waha_session_status", new_callable=AsyncMock) as mock_status:
        mock_status.return_value = "WORKING"
        response = client.get("/api/business/whatsapp/status", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is True
        assert data["status"] == "WORKING"
        assert data["session"] == f"clinic_{clinic_tenant_a['business'].id}"


def test_waha_qr_authorized(client: TestClient, clinic_tenant_a):
    headers = clinic_tenant_a["headers"]
    with patch("app.services.waha_service.get_waha_qr", new_callable=AsyncMock) as mock_qr, \
         patch("app.services.waha_service.get_waha_session_status", new_callable=AsyncMock) as mock_status:
        mock_qr.return_value = "data:image/png;base64,mockqrdata"
        mock_status.return_value = "SCAN_QR_CODE"

        response = client.get("/api/business/whatsapp/qr", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is False
        assert data["status"] == "SCAN_QR_CODE"
        assert data["qr"] == "data:image/png;base64,mockqrdata"


def test_waha_disconnect_authorized(client: TestClient, clinic_tenant_a):
    headers = clinic_tenant_a["headers"]
    with patch("app.services.waha_service.stop_waha_session", new_callable=AsyncMock) as mock_stop:
        mock_stop.return_value = True
        response = client.post("/api/business/whatsapp/disconnect", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


def test_waha_reset_authorized(client: TestClient, clinic_tenant_a):
    headers = clinic_tenant_a["headers"]
    with patch("app.services.waha_service.reset_waha_session", new_callable=AsyncMock) as mock_reset, \
         patch("app.services.waha_service.get_or_start_waha_session", new_callable=AsyncMock) as mock_start:
        mock_reset.return_value = True
        mock_start.return_value = {"status": "SCAN_QR_CODE"}
        response = client.post("/api/business/whatsapp/reset", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "reset_complete"
        mock_reset.assert_called_once()
        mock_start.assert_called_once()


def test_waha_webhook_ignore_from_me(client: TestClient):
    payload = {
        "event": "message",
        "session": "clinic_test",
        "payload": {
            "from": "923001234567@c.us",
            "body": "Hello from clinic bot",
            "fromMe": True
        }
    }
    response = client.post("/api/business/whatsapp/webhook", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "ignored_self"}


def test_waha_webhook_inbound_queued(client: TestClient):
    payload = {
        "event": "message",
        "session": "clinic_test",
        "payload": {
            "from": "923001234567@c.us",
            "body": "Hi, I need an appointment for chest pain",
            "fromMe": False
        }
    }
    with patch("app.routers.waha.process_waha_message_task", new_callable=AsyncMock) as mock_task:
        response = client.post("/api/business/whatsapp/webhook", json=payload)
        assert response.status_code == 200
        assert response.json() == {"status": "queued"}


def test_waha_webhook_message_any_ignored(client: TestClient):
    payload = {
        "event": "message.any",
        "session": "default",
        "payload": {
            "from": "923001234567@c.us",
            "text": "Hello, do you have tables available?",
            "fromMe": False
        }
    }
    response = client.post("/api/business/whatsapp/webhook", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "ignored_non_primary_event", "event": "message.any"}


def test_waha_webhook_deduplication(client: TestClient):
    payload = {
        "event": "message",
        "session": "clinic_test",
        "payload": {
            "id": "unique_msg_test_001",
            "from": "923001234567@c.us",
            "body": "Hi, this is a test message",
            "fromMe": False
        }
    }
    with patch("app.routers.waha.process_waha_message_task", new_callable=AsyncMock):
        # First delivery: queued
        res1 = client.post("/api/business/whatsapp/webhook", json=payload)
        assert res1.status_code == 200
        assert res1.json() == {"status": "queued"}

        # Duplicate delivery: ignored
        res2 = client.post("/api/business/whatsapp/webhook", json=payload)
        assert res2.status_code == 200
        assert res2.json() == {"status": "ignored_duplicate", "id": "unique_msg_test_001"}


def test_waha_webhook_ignore_broadcast(client: TestClient):
    payload = {
        "event": "message",
        "session": "default",
        "payload": {
            "from": "status@broadcast",
            "body": "System broadcast story update",
            "fromMe": False
        }
    }
    response = client.post("/api/business/whatsapp/webhook", json=payload)
    assert response.status_code == 200
    assert response.json() == {"status": "ignored_broadcast"}


def test_waha_webhook_ignored_events(client: TestClient):
    # Non-primary event
    res1 = client.post("/api/business/whatsapp/webhook", json={"event": "session.status", "session": "default"})
    assert res1.status_code == 200
    assert res1.json() == {"status": "ignored_non_primary_event", "event": "session.status"}

    # Empty body
    res2 = client.post("/api/business/whatsapp/webhook", json={
        "event": "message",
        "session": "default",
        "payload": {"from": "123@c.us", "body": ""}
    })
    assert res2.status_code == 200
    assert res2.json() == {"status": "ignored_empty_body"}


@pytest.mark.asyncio
async def test_process_waha_message_task_execution(clinic_tenant_a):
    business = clinic_tenant_a["business"]
    session_name = f"clinic_{business.id}"
    sender_chat_id = "923001234567@c.us"
    user_text = "I have severe tooth pain"

    with patch("app.routers.waha.process_chat") as mock_chat, \
         patch("app.services.waha_service.send_waha_text", new_callable=AsyncMock) as mock_send:
        mock_chat.return_value = {"text": "We have an appointment tomorrow at 10 AM"}
        mock_send.return_value = True

        await process_waha_message_task(
            session_name=session_name,
            sender_chat_id=sender_chat_id,
            user_text=user_text
        )

        mock_chat.assert_called_once()
        call_kwargs = mock_chat.call_args.kwargs
        assert call_kwargs["message"] == user_text
        assert call_kwargs["session_id"] == f"wa_qr_{business.id}_923001234567"
        assert call_kwargs["business"].id == business.id

        mock_send.assert_called_once_with(
            session_name=session_name,
            chat_id=sender_chat_id,
            message="We have an appointment tomorrow at 10 AM"
        )
