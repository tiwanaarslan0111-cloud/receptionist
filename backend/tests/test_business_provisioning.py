import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Business, User, Doctor


def test_provision_business_success(client: TestClient, admin_headers: dict, db: Session):
    """Super admin provisions a new clinic tenant with WhatsApp number and owner credentials."""
    uid = uuid.uuid4().hex[:6]
    slug = f"al-razi-{uid}"
    inbound_phone_id = f"phone_id_{uid}"
    owner_email = f"owner_{uid}@alrazi.com"

    payload = {
        "name": f"Al-Razi Dental Clinic {uid}",
        "slug": slug,
        "type": "clinic",
        "inbound_phone_id": inbound_phone_id,
        "display_phone_number": "+92 300 1234567",
        "waba_id": "1841329600331081",
        "owner_email": owner_email,
        "owner_password": "TemporaryPassword123!"
    }

    response = client.post("/api/admin/businesses", json=payload, headers=admin_headers)
    assert response.status_code == 201
    data = response.json()

    assert data["name"] == payload["name"]
    assert data["slug"] == slug
    assert data["business_type"] == "clinic"
    assert data["inbound_phone_id"] == inbound_phone_id
    assert data["display_phone_number"] == "+92 300 1234567"
    assert data["waba_id"] == "1841329600331081"
    assert data["owner_email"] == owner_email
    assert data["owner_role"] == "business_admin"
    assert "widget_token" in data
    assert "embed_snippet" in data

    # Verify atomic DB persistence
    biz = db.query(Business).filter(Business.slug == slug).first()
    assert biz is not None
    assert biz.inbound_phone_id == inbound_phone_id

    user = db.query(User).filter(User.email == owner_email).first()
    assert user is not None
    assert user.business_id == biz.id
    assert user.role == "business_admin"


def test_provision_business_duplicate_slug_rejected(client: TestClient, admin_headers: dict):
    """Attempting to provision with duplicate slug must return 400 Bad Request."""
    uid = uuid.uuid4().hex[:6]
    slug = f"dup-slug-{uid}"

    payload = {
        "name": "First Clinic",
        "slug": slug,
        "type": "clinic",
        "inbound_phone_id": f"phone_a_{uid}",
        "display_phone_number": "+92 300 0000001",
        "waba_id": None,
        "owner_email": f"first_{uid}@clinic.com",
        "owner_password": "Password123!"
    }

    # 1. First creation succeeds
    res1 = client.post("/api/admin/businesses", json=payload, headers=admin_headers)
    assert res1.status_code == 201

    # 2. Second creation with same slug fails
    payload2 = {
        **payload,
        "name": "Second Clinic",
        "inbound_phone_id": f"phone_b_{uid}",
        "owner_email": f"second_{uid}@clinic.com"
    }
    res2 = client.post("/api/admin/businesses", json=payload2, headers=admin_headers)
    assert res2.status_code == 400
    assert "already taken" in res2.json()["detail"]


def test_provision_business_duplicate_phone_id_rejected(client: TestClient, admin_headers: dict):
    """Attempting to bind the same Meta WhatsApp Phone Number ID to two tenants is rejected."""
    uid = uuid.uuid4().hex[:6]
    phone_id = f"shared_phone_{uid}"

    payload1 = {
        "name": "Clinic Alpha",
        "slug": f"alpha-{uid}",
        "type": "clinic",
        "inbound_phone_id": phone_id,
        "display_phone_number": "+92 300 1111111",
        "waba_id": None,
        "owner_email": f"alpha_{uid}@clinic.com",
        "owner_password": "Password123!"
    }
    res1 = client.post("/api/admin/businesses", json=payload1, headers=admin_headers)
    assert res1.status_code == 201

    payload2 = {
        "name": "Clinic Beta",
        "slug": f"beta-{uid}",
        "type": "clinic",
        "inbound_phone_id": phone_id,
        "display_phone_number": "+92 300 2222222",
        "waba_id": None,
        "owner_email": f"beta_{uid}@clinic.com",
        "owner_password": "Password123!"
    }
    res2 = client.post("/api/admin/businesses", json=payload2, headers=admin_headers)
    assert res2.status_code == 400
    assert "already assigned" in res2.json()["detail"]


def test_provisioned_owner_can_login_and_access_scoped_dashboard(client: TestClient, admin_headers: dict):
    """Provisioned tenant owner logs in with owner_email and manages their scoped doctors."""
    uid = uuid.uuid4().hex[:6]
    slug = f"scope-test-{uid}"
    owner_email = f"scope_owner_{uid}@hospital.com"
    owner_password = "OwnerSecurePass123!"

    # 1. Super admin provisions tenant
    provision_res = client.post(
        "/api/admin/businesses",
        json={
            "name": f"Scoped Hospital {uid}",
            "slug": slug,
            "type": "clinic",
            "inbound_phone_id": f"scope_phone_{uid}",
            "display_phone_number": "+92 300 5555555",
            "waba_id": "1841329600331081",
            "owner_email": owner_email,
            "owner_password": owner_password
        },
        headers=admin_headers
    )
    assert provision_res.status_code == 201
    business_id = provision_res.json()["id"]

    # 2. Owner logs in via POST /api/auth/login using their email
    login_res = client.post(
        "/api/auth/login",
        json={
            "username": owner_email,
            "password": owner_password
        }
    )
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["business_id"] == business_id
    assert login_data["role"] == "business_admin"
    access_token = login_data["access_token"]

    tenant_headers = {"Authorization": f"Bearer {access_token}"}

    # 3. Owner creates a doctor on their own tenant dashboard
    doc_res = client.post(
        "/api/clinic/doctors",
        json={
            "name": "Dr. Sarah Khan",
            "specialty": "Dentistry",
            "symptoms_treated": ["toothache", "bleeding gums"],
            "fee": 2500.0
        },
        headers=tenant_headers
    )
    assert doc_res.status_code == 201
    created_doc = doc_res.json()
    assert created_doc["business_id"] == business_id
    assert created_doc["name"] == "Dr. Sarah Khan"

    # 4. Querying doctors list returns this doctor
    list_res = client.get("/api/clinic/doctors", headers=tenant_headers)
    assert list_res.status_code == 200
    docs = list_res.json()
    assert len(docs) == 1
    assert docs[0]["id"] == created_doc["id"]


def test_provision_business_unauthorized_without_secret(client: TestClient):
    """Accessing POST /api/admin/businesses with invalid admin secret returns 403, and missing header returns 422."""
    response = client.post(
        "/api/admin/businesses",
        json={"name": "Test", "slug": "test", "type": "clinic", "owner_email": "a@b.com", "owner_password": "Password123!"},
        headers={"x-admin-secret": "wrong_secret"}
    )
    assert response.status_code == 403

    response_no_header = client.post(
        "/api/admin/businesses",
        json={"name": "Test", "slug": "test", "type": "clinic", "owner_email": "a@b.com", "owner_password": "Password123!"}
    )
    assert response_no_header.status_code in (403, 422)
