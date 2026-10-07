from typing import Dict, Any
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.ai_agent import execute_book_appointment, execute_check_doctor_slots


def test_slot_isolation_across_tenants(
    db: Session,
    clinic_tenant_a: Dict[str, Any],
    clinic_tenant_b: Dict[str, Any]
):
    """
    Test Step 4: Slot Isolation.
    Clinic A attempts to access and book Doctor B's slot.
    Must be rejected because Doctor B and Slot B belong to Clinic B's tenant boundary.
    """
    biz_a_id = clinic_tenant_a["business"].id
    doc_b_id = str(clinic_tenant_b["doctor"].id)
    slot_b_id = str(clinic_tenant_b["slot"].id)

    # 1. Checking slots for Doctor B under Clinic A's tenant scope must fail
    check_res = execute_check_doctor_slots(
        business_id=biz_a_id,
        db=db,
        doctor_id=doc_b_id,
        date=str(clinic_tenant_b["slot"].slot_date)
    )
    assert "error" in check_res
    assert "Doctor not found in this clinic" in check_res["error"]

    # 2. Attempting to book Doctor B's slot under Clinic A's tenant scope must fail
    book_res = execute_book_appointment(
        business_id=biz_a_id,
        db=db,
        doctor_id=doc_b_id,
        slot_id=slot_b_id,
        patient_name="Sneaky Cross-Tenant Patient",
        patient_phone="+923000000000",
        symptoms="Checkup"
    )
    assert "error" in book_res
    assert "Slot is already booked or invalid for this doctor." in book_res["error"]
    assert "status" not in book_res

    # 3. Verify in database that Doctor B's slot remains untouched and unbooked
    db.refresh(clinic_tenant_b["slot"])
    assert clinic_tenant_b["slot"].is_booked is False


def test_slot_creation_cross_tenant_doctor_rejected(
    client: TestClient,
    clinic_tenant_a: Dict[str, Any],
    clinic_tenant_b: Dict[str, Any]
):
    """
    Ensures Clinic A cannot create appointment slots attached to Doctor B.
    """
    slot_payload = [
        {
            "doctor_id": str(clinic_tenant_b["doctor"].id),
            "slot_date": "2026-10-15",
            "start_time": "14:00",
            "end_time": "14:30"
        }
    ]
    response = client.post(
        "/api/clinic/slots",
        json=slot_payload,
        headers=clinic_tenant_a["headers"]
    )
    assert response.status_code == 404
    assert "not found in this clinic" in response.json()["detail"]


def test_dashboard_isolation_doctors_and_slots(
    client: TestClient,
    clinic_tenant_a: Dict[str, Any],
    clinic_tenant_b: Dict[str, Any]
):
    """
    Test Step 4: Dashboard Isolation.
    Authenticates as Clinic A and verifies Doctor B and Slot B are never exposed.
    """
    # 1. Login via /api/auth/login to test full auth flow
    login_resp = client.post(
        "/api/auth/login",
        json={
            "username": clinic_tenant_a["business"].username,
            "password": clinic_tenant_a["raw_password"]
        }
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Query /api/clinic/doctors - only Clinic A's doctors must appear
    doc_resp = client.get("/api/clinic/doctors", headers=headers)
    assert doc_resp.status_code == 200
    doctors = doc_resp.json()
    doc_ids = [d["id"] for d in doctors]

    assert str(clinic_tenant_a["doctor"].id) in doc_ids
    assert str(clinic_tenant_b["doctor"].id) not in doc_ids

    # 3. Query /api/clinic/slots - only Clinic A's slots must appear
    slots_resp = client.get("/api/clinic/slots", headers=headers)
    assert slots_resp.status_code == 200
    slots = slots_resp.json()
    slot_ids = [s["id"] for s in slots]

    assert str(clinic_tenant_a["slot"].id) in slot_ids
    assert str(clinic_tenant_b["slot"].id) not in slot_ids


def test_cross_domain_isolation(
    client: TestClient,
    clinic_tenant_a: Dict[str, Any],
    restaurant_tenant: Dict[str, Any]
):
    """
    Test Step 4: Cross-Domain Isolation.
    - Clinic JWT accessing restaurant endpoints returns 403 Forbidden.
    - Restaurant JWT accessing clinic endpoints returns 403 Forbidden.
    """
    clinic_headers = clinic_tenant_a["headers"]
    restaurant_headers = restaurant_tenant["headers"]

    # 1. Clinic attempting to access Restaurant menu endpoints
    get_menu_resp = client.get("/api/restaurant/menu", headers=clinic_headers)
    assert get_menu_resp.status_code == 403
    assert "reserved for restaurant" in get_menu_resp.json()["detail"].lower()

    post_menu_resp = client.post(
        "/api/restaurant/menu",
        json={"name": "Forbidden Pizza", "category": "Mains", "price": 15.0},
        headers=clinic_headers
    )
    assert post_menu_resp.status_code == 403

    # 2. Restaurant attempting to access Clinic doctor endpoints
    get_doc_resp = client.get("/api/clinic/doctors", headers=restaurant_headers)
    assert get_doc_resp.status_code == 403
    assert "reserved for clinic" in get_doc_resp.json()["detail"].lower()

    post_doc_resp = client.post(
        "/api/clinic/doctors",
        json={"name": "Forbidden Doctor", "specialty": "Neurology", "fee": 200.0},
        headers=restaurant_headers
    )
    assert post_doc_resp.status_code == 403


def test_super_admin_list_businesses(
    client: TestClient,
    admin_headers: Dict[str, str],
    clinic_tenant_a: Dict[str, Any],
    restaurant_tenant: Dict[str, Any]
):
    """
    Super Admin listing businesses endpoint validation:
    - Rejects invalid secret with 403.
    - Successfully returns all registered businesses including clinic and restaurant.
    """
    # 1. Invalid secret key rejected
    bad_resp = client.get("/api/admin/businesses", headers={"x-admin-secret": "wrong_secret"})
    assert bad_resp.status_code == 403

    # 2. Valid secret lists businesses
    resp = client.get("/api/admin/businesses", headers=admin_headers)
    assert resp.status_code == 200
    biz_list = resp.json()
    biz_ids = [b["id"] for b in biz_list]

    assert str(clinic_tenant_a["business"].id) in biz_ids
    assert str(restaurant_tenant["business"].id) in biz_ids
