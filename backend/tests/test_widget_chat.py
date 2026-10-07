from unittest.mock import patch, AsyncMock
from typing import Dict, Any
import httpx
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_invalid_widget_token_rejected(client: TestClient):
    """
    Test Step 5: Invalid Token Rejection.
    Calling /api/widget/chat with an unrecognized token returns 401 Unauthorized.
    """
    response = client.post(
        "/api/widget/chat",
        headers={"x-widget-token": "unregistered_bogus_token_12345"},
        json={
            "session_id": "sess_invalid_token",
            "message": "Hello receptionist"
        }
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid widget token"


def test_missing_widget_token_header(client: TestClient):
    """
    Ensures missing x-widget-token header triggers a 422 Unprocessable Entity error.
    """
    response = client.post(
        "/api/widget/chat",
        json={
            "session_id": "sess_no_header",
            "message": "Hello"
        }
    )
    assert response.status_code == 422


def test_valid_chat_flow_smoke(
    client: TestClient,
    clinic_tenant_a: Dict[str, Any]
):
    """
    Test Step 5: Valid Chat Flow (Smoke Test).
    Sends a greeting message with Clinic A's widget token and validates response schema:
    - 200 OK status.
    - JSON payload contains 'text' (non-empty string).
    - Optional 'audio_url' is either null or string pointing to /static/audio/.
    - Includes 'action_taken' and 'booking_details' keys.
    """
    token = clinic_tenant_a["widget_token"]
    payload = {
        "session_id": "smoke_sess_clinic_a_001",
        "message": "Hello, I need an appointment for chest checkup."
    }

    response = client.post(
        "/api/widget/chat",
        headers={"x-widget-token": token},
        json=payload
    )

    assert response.status_code == 200
    data = response.json()

    # Validate Schema
    assert "text" in data, "Response must include 'text' field"
    assert isinstance(data["text"], str), "'text' must be a string"
    assert len(data["text"].strip()) > 0, "'text' must not be empty"

    assert "audio_url" in data, "Response must include 'audio_url' field"
    if data["audio_url"] is not None:
        assert isinstance(data["audio_url"], str)
        assert data["audio_url"].startswith("/static/audio/")

    assert "action_taken" in data
    assert "booking_details" in data


async def test_valid_chat_flow_async(
    async_client: httpx.AsyncClient,
    clinic_tenant_b: Dict[str, Any]
):
    """
    Async client test for widget chat flow against Clinic B.
    """
    token = clinic_tenant_b["widget_token"]
    response = await async_client.post(
        "/api/widget/chat",
        headers={"x-widget-token": token},
        json={
            "session_id": "smoke_async_sess_002",
            "message": "Assalam-o-Alaikum, what dermatologists do you have?"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["text"], str)
    assert len(data["text"]) > 0


def test_chat_schema_and_booking_details_structure(
    client: TestClient,
    clinic_tenant_a: Dict[str, Any]
):
    """
    Deterministic unit test verifying response schema when tool calling completes.
    Mocks process_chat and generate_audio to assert contract integrity.
    """
    mock_result = {
        "text": "Your appointment with Dr. Alice Smith has been confirmed for 09:00 AM.",
        "action_taken": "book_appointment",
        "booking_details": {
            "doctor_name": "Dr. Alice Smith",
            "date": "2026-10-10",
            "start_time": "09:00",
            "patient_name": "John Doe"
        }
    }

    with patch("app.routers.widget.process_chat", return_value=mock_result), \
         patch("app.routers.widget.generate_audio", new_callable=AsyncMock, return_value="/static/audio/mock_test.mp3"):
        response = client.post(
            "/api/widget/chat",
            headers={"x-widget-token": clinic_tenant_a["widget_token"]},
            json={
                "session_id": "mock_unit_sess_003",
                "message": "Confirm booking please"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["text"] == mock_result["text"]
        assert data["action_taken"] == "book_appointment"
        assert data["booking_details"]["patient_name"] == "John Doe"
        assert data["audio_url"] == "/static/audio/mock_test.mp3"


def test_session_store_persistence_and_trimming(
    db: Session,
    clinic_tenant_a: Dict[str, Any]
):
    """
    Verifies that SESSION_STORE preserves multi-turn conversation history
    and cleanly trims history up to max 15 messages without losing system prompt.
    """
    from app.services.ai_agent import SESSION_STORE, get_session_history, trim_session_history

    business = clinic_tenant_a["business"]
    test_session_id = "test_persistence_sess_001"
    session_key = f"{business.id}:{test_session_id}"

    # Clear any previous state for this key
    if session_key in SESSION_STORE:
        del SESSION_STORE[session_key]

    history = get_session_history(session_key, "System prompt")
    assert len(history) == 1
    assert history[0]["role"] == "system"

    # Simulate 8 conversation turns (16 messages)
    for i in range(8):
        history.append({"role": "user", "content": f"User message {i}"})
        history.append({"role": "assistant", "content": f"Assistant response {i}"})

    assert len(SESSION_STORE[session_key]) == 17

    # Trim should keep system message + last 15 messages
    trimmed = trim_session_history(SESSION_STORE[session_key], max_messages=15)
    assert len(trimmed) == 16
    assert trimmed[0]["role"] == "system"
    assert trimmed[-1]["content"] == "Assistant response 7"

