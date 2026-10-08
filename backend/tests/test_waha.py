import pytest
from unittest.mock import patch, AsyncMock, MagicMock
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


@pytest.mark.asyncio
async def test_process_waha_message_task_restaurant_prefix(restaurant_tenant):
    business = restaurant_tenant["business"]
    session_name = f"restaurant_{business.id}"
    sender_chat_id = "923001234567@c.us"
    user_text = "What burgers do you have?"

    with patch("app.routers.waha.process_chat") as mock_chat, \
         patch("app.services.waha_service.send_waha_text", new_callable=AsyncMock) as mock_send:
        mock_chat.return_value = {"text": "We have Zinger Burger for Rs. 550"}
        mock_send.return_value = True

        await process_waha_message_task(
            session_name=session_name,
            sender_chat_id=sender_chat_id,
            user_text=user_text
        )

        mock_chat.assert_called_once()
        call_kwargs = mock_chat.call_args.kwargs
        assert call_kwargs["business"].id == business.id
        assert call_kwargs["business"].business_type == "restaurant"


def test_tool_schemas_and_handlers_allow_nullable(db: Session, restaurant_tenant, clinic_tenant_a):
    from app.services.ai_agent import (
        RESTAURANT_TOOLS,
        CLINIC_TOOLS,
        execute_get_menu,
        execute_suggest_doctors,
    )

    # 1. Verify get_menu schema allows null category
    get_menu_tool = next(t for t in RESTAURANT_TOOLS if t["function"]["name"] == "get_menu")
    cat_type = get_menu_tool["function"]["parameters"]["properties"]["category"]["type"]
    assert "null" in cat_type and "string" in cat_type

    # 2. Verify book_appointment schema allows null symptoms
    book_tool = next(t for t in CLINIC_TOOLS if t["function"]["name"] == "book_appointment")
    symp_type = book_tool["function"]["parameters"]["properties"]["symptoms"]["type"]
    assert "null" in symp_type and "string" in symp_type

    # 3. Verify execute_get_menu works safely with None category
    res_menu = execute_get_menu(restaurant_tenant["business"].id, db, category=None)
    assert "menu_items" in res_menu

    # 4. Verify execute_suggest_doctors works safely with None symptom
    res_doc = execute_suggest_doctors(clinic_tenant_a["business"].id, db, symptom=None)
    assert "doctors" in res_doc


def test_extract_sender_phone():
    from app.routers.waha import extract_sender_phone

    # Standard JID
    assert extract_sender_phone("923001234567@c.us") == "+923001234567"
    assert extract_sender_phone("923219876543@s.whatsapp.net") == "+923219876543"

    # LID with SenderAlt metadata
    payload_with_alt = {
        "_data": {
            "Info": {
                "SenderAlt": "923007654321@s.whatsapp.net"
            }
        }
    }
    assert extract_sender_phone("272455679660215@lid", payload_with_alt) == "+923007654321"

    # LID without phone metadata MUST return empty string, NEVER treat LID as phone number
    assert extract_sender_phone("272455679660215@lid", {}) == ""
    assert extract_sender_phone("234534434334334@lid", {}) == ""


def test_ai_agent_system_prompt_instructs_known_phone(restaurant_tenant):
    from app.services.ai_agent import get_system_prompt

    business = restaurant_tenant["business"]
    prompt = get_system_prompt(business, customer_phone="+923001234567")

    assert "+923001234567" in prompt
    assert "Default Detected Phone Number: +923001234567" in prompt
    assert "CUSTOMER CAN CHANGE PHONE NUMBER" in prompt
    assert 'customer_phone' in prompt


def test_resolve_effective_phone_allows_customer_to_change_phone():
    from app.services.ai_agent import resolve_effective_phone

    # 1. Customer provides a new phone number
    assert resolve_effective_phone("0345678764", "+923001234567") == "0345678764"
    assert resolve_effective_phone("+92345678764", "+923001234567") == "+92345678764"

    # 2. No new phone provided, falls back to detected phone
    assert resolve_effective_phone("", "+923001234567") == "+923001234567"
    assert resolve_effective_phone(None, "+923001234567") == "+923001234567"

    # 3. If an LID format was somehow passed in arg, it gets discarded
    assert resolve_effective_phone("272455679660215@lid", "+923001234567") == "+923001234567"
    assert resolve_effective_phone("272455679660215@lid", "") == ""


@pytest.mark.asyncio
async def test_resolve_lid_to_phone():
    from app.services import waha_service

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"lid": "272455679660215@lid", "pn": "92345678764@c.us"}

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_resp

        res = await waha_service.resolve_lid_to_phone("restaurant_1", "272455679660215@lid")
        assert res == "+92345678764"




@pytest.mark.asyncio
async def test_process_waha_message_task_passes_customer_phone_and_chat_id(clinic_tenant_a):
    business = clinic_tenant_a["business"]
    session_name = f"clinic_{business.id}"
    sender_chat_id = "272455679660215@lid"
    user_text = "Book appointment for Dr John"

    with patch("app.routers.waha.process_chat") as mock_chat, \
         patch("app.services.waha_service.send_waha_text", new_callable=AsyncMock) as mock_send:
        mock_chat.return_value = {"text": "Appointment booked"}
        mock_send.return_value = True

        await process_waha_message_task(
            session_name=session_name,
            sender_chat_id=sender_chat_id,
            user_text=user_text
        )

        mock_chat.assert_called_once()
        call_kwargs = mock_chat.call_args.kwargs
        assert call_kwargs["whatsapp_chat_id"] == "272455679660215@lid"
        assert call_kwargs["customer_phone"] == ""


@pytest.mark.asyncio
async def test_send_order_status_notification_with_lid(restaurant_tenant, db: Session):
    from app.models import RestaurantOrder
    from app.routers.restaurant import send_order_status_notification

    business = restaurant_tenant["business"]
    order = RestaurantOrder(
        business_id=business.id,
        order_number="ORD-TEST-1",
        customer_name="Arslan",
        customer_phone="0303030303",
        whatsapp_chat_id="272455679660215@lid",
        order_type="delivery",
        total_amount=60.0,
        status="received"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    with patch("app.services.waha_service.get_waha_session_status", new_callable=AsyncMock) as mock_status, \
         patch("app.services.waha_service.send_waha_text", new_callable=AsyncMock) as mock_send:
        mock_status.return_value = "WORKING"
        mock_send.return_value = True

        await send_order_status_notification(order.id, "ready", business.id)

        mock_send.assert_called_once()
        called_chat_id = mock_send.call_args.kwargs["chat_id"] if "chat_id" in mock_send.call_args.kwargs else mock_send.call_args.args[1]
        assert called_chat_id == "272455679660215@lid"


@pytest.mark.asyncio
async def test_send_order_status_notification_normalizes_pakistan_phone(restaurant_tenant, db: Session):
    from app.models import RestaurantOrder
    from app.routers.restaurant import send_order_status_notification

    business = restaurant_tenant["business"]
    order = RestaurantOrder(
        business_id=business.id,
        order_number="ORD-TEST-2",
        customer_name="Customer",
        customer_phone="03001234567",
        order_type="delivery",
        total_amount=50.0,
        status="received"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    with patch("app.services.waha_service.get_waha_session_status", new_callable=AsyncMock) as mock_status, \
         patch("app.services.waha_service.send_waha_text", new_callable=AsyncMock) as mock_send:
        mock_status.return_value = "WORKING"
        mock_send.return_value = True

        await send_order_status_notification(order.id, "in_kitchen", business.id)

        mock_send.assert_called_once()
        called_chat_id = mock_send.call_args.kwargs["chat_id"] if "chat_id" in mock_send.call_args.kwargs else mock_send.call_args.args[1]
        assert called_chat_id == "923001234567@c.us"


@pytest.mark.asyncio
async def test_send_order_status_notification_normalizes_ten_digit_pakistan_phone(restaurant_tenant, db: Session):
    from app.models import RestaurantOrder
    from app.routers.restaurant import send_order_status_notification

    business = restaurant_tenant["business"]
    order = RestaurantOrder(
        business_id=business.id,
        order_number="ORD-TEST-3",
        customer_name="Customer",
        customer_phone="0303030303",
        order_type="delivery",
        total_amount=50.0,
        status="received"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    with patch("app.services.waha_service.get_waha_session_status", new_callable=AsyncMock) as mock_status, \
         patch("app.services.waha_service.send_waha_text", new_callable=AsyncMock) as mock_send:
        mock_status.return_value = "WORKING"
        mock_send.return_value = True

        await send_order_status_notification(order.id, "ready", business.id)

        mock_send.assert_called_once()
        called_chat_id = mock_send.call_args.kwargs["chat_id"] if "chat_id" in mock_send.call_args.kwargs else mock_send.call_args.args[1]
        assert called_chat_id == "92303030303@c.us"
        assert not called_chat_id.startswith("0")


@pytest.mark.asyncio
async def test_send_order_status_notification_uses_saved_whatsapp_session(restaurant_tenant, db: Session):
    from app.models import RestaurantOrder
    from app.routers.restaurant import send_order_status_notification

    business = restaurant_tenant["business"]
    custom_session = f"clinic_{business.id}"
    order = RestaurantOrder(
        business_id=business.id,
        order_number="ORD-TEST-4",
        customer_name="Ongoing Chat Customer",
        customer_phone="03001234567",
        whatsapp_chat_id="272455679660215@lid",
        whatsapp_session=custom_session,
        order_type="delivery",
        total_amount=75.0,
        status="received"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    with patch("app.services.waha_service.get_waha_session_status", new_callable=AsyncMock) as mock_status, \
         patch("app.services.waha_service.send_waha_text", new_callable=AsyncMock) as mock_send:
        mock_status.return_value = "WORKING"
        mock_send.return_value = True

        await send_order_status_notification(order.id, "ready", business.id)

        mock_send.assert_called_once()
        called_session = mock_send.call_args.kwargs["session_name"] if "session_name" in mock_send.call_args.kwargs else mock_send.call_args.args[0]
        called_chat_id = mock_send.call_args.kwargs["chat_id"] if "chat_id" in mock_send.call_args.kwargs else mock_send.call_args.args[1]
        assert called_session == custom_session
        assert called_chat_id == "272455679660215@lid"


@pytest.mark.asyncio
async def test_process_waha_message_task_resolves_lid_via_waha_service(clinic_tenant_a):
    business = clinic_tenant_a["business"]
    session_name = f"clinic_{business.id}"
    sender_chat_id = "272455679660215@lid"
    user_text = "Book appointment for Dr John"

    with patch("app.routers.waha.process_chat") as mock_chat, \
         patch("app.services.waha_service.resolve_lid_to_phone", new_callable=AsyncMock) as mock_resolve, \
         patch("app.services.waha_service.send_waha_text", new_callable=AsyncMock) as mock_send:
        mock_resolve.return_value = "+92345678764"
        mock_chat.return_value = {"text": "Appointment booked"}
        mock_send.return_value = True

        await process_waha_message_task(
            session_name=session_name,
            sender_chat_id=sender_chat_id,
            user_text=user_text
        )

        mock_chat.assert_called_once()
        call_kwargs = mock_chat.call_args.kwargs
        assert call_kwargs["customer_phone"] == "+92345678764"
        assert call_kwargs["whatsapp_chat_id"] == "272455679660215@lid"
        assert call_kwargs["whatsapp_session"] == session_name


def test_customer_can_change_phone_number_in_place_order(restaurant_tenant, db: Session):
    from app.services.ai_agent import execute_place_order
    from app.models import MenuItem

    business = restaurant_tenant["business"]
    item = MenuItem(
        business_id=business.id,
        name="Beef Burger",
        category="Burgers",
        price=650.0,
        is_available=True
    )
    db.add(item)
    db.commit()

    # Customer changes phone number to 0345678764 even though chat came from a different number/session
    res = execute_place_order(
        business_id=business.id,
        db=db,
        customer_name="Arslan",
        customer_phone="0345678764",
        order_items=[{"item_name": "Beef Burger", "quantity": 1}],
        whatsapp_chat_id="272455679660215@lid",
        whatsapp_session=f"restaurant_{business.id}"
    )

    assert res["status"] == "received"
    assert res["customer_phone"] == "0345678764"
    assert res["whatsapp_chat_id"] == "272455679660215@lid"
    assert res["whatsapp_session"] == f"restaurant_{business.id}"


@pytest.mark.asyncio
async def test_send_order_status_notification_multi_target_fallback(restaurant_tenant, db: Session):
    from app.models import RestaurantOrder
    from app.routers.restaurant import send_order_status_notification

    business = restaurant_tenant["business"]
    order = RestaurantOrder(
        business_id=business.id,
        order_number="ORD-TEST-FALLBACK",
        customer_name="Arslan",
        customer_phone="0345678764",
        whatsapp_chat_id="272455679660215@lid",
        whatsapp_session=f"restaurant_{business.id}",
        order_type="delivery",
        total_amount=650.0,
        status="received"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    with patch("app.services.waha_service.get_waha_session_status", new_callable=AsyncMock) as mock_status, \
         patch("app.services.waha_service.send_waha_text", new_callable=AsyncMock) as mock_send:
        mock_status.return_value = "WORKING"
        # First send attempt to LID fails, second attempt to customer_phone succeeds
        mock_send.side_effect = [False, True]

        await send_order_status_notification(order.id, "in_kitchen", business.id)

        assert mock_send.call_count == 2
        # First call was to ongoing WhatsApp chat
        assert mock_send.call_args_list[0].kwargs.get("chat_id") == "272455679660215@lid" or mock_send.call_args_list[0].args[1] == "272455679660215@lid"
        # Second call was fallback to normalized customer phone
        second_chat = mock_send.call_args_list[1].kwargs.get("chat_id") if "chat_id" in mock_send.call_args_list[1].kwargs else mock_send.call_args_list[1].args[1]
        assert second_chat == "92345678764@c.us"

