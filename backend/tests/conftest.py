import os
import uuid
from datetime import date, time, timedelta
from typing import Generator, Dict, Any

import pytest
import pytest_asyncio
import httpx
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import Base, engine, SessionLocal
from app.config import settings
from app.models import (
    Business,
    Doctor,
    DoctorSlot,
    MenuItem,
    RestaurantTable
)
from app.security import hash_password, create_access_token

# Ensure database tables exist before any tests run
Base.metadata.create_all(bind=engine)


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """Synchronous FastAPI TestClient."""
    with TestClient(app) as test_client:
        yield test_client


@pytest_asyncio.fixture(scope="function")
async def async_client() -> Generator[httpx.AsyncClient, None, None]:
    """Asynchronous HTTPX client for async endpoint tests."""
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture(scope="function")
def db() -> Generator[Session, None, None]:
    """Provides a transactional database session for tests."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def admin_headers() -> Dict[str, str]:
    """Headers for Super Admin authenticated endpoints."""
    return {"x-admin-secret": settings.ADMIN_SECRET_KEY}


@pytest.fixture(scope="function")
def clinic_tenant_a(db: Session) -> Generator[Dict[str, Any], None, None]:
    """Creates Clinic A with Doctor A and an open appointment slot."""
    uid = uuid.uuid4().hex[:8]
    raw_password = "Password123!"
    widget_token = f"widget_token_clinic_a_{uuid.uuid4().hex}"

    business = Business(
        name=f"Clinic A Med-{uid}",
        business_type="clinic",
        widget_token=widget_token,
        username=f"clinic_a_user_{uid}",
        password_hash=hash_password(raw_password)
    )
    db.add(business)
    db.commit()
    db.refresh(business)

    doctor = Doctor(
        business_id=business.id,
        name="Dr. Alice Smith",
        specialty="Cardiology",
        symptoms_treated=["chest pain", "shortness of breath", "palpitations"],
        fee=150.00
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    slot_date = date.today() + timedelta(days=1)
    slot = DoctorSlot(
        business_id=business.id,
        doctor_id=doctor.id,
        slot_date=slot_date,
        start_time=time(9, 0),
        end_time=time(9, 30),
        is_booked=False
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    token_payload = {
        "sub": str(business.id),
        "type": business.business_type,
        "name": business.name
    }
    jwt_token = create_access_token(data=token_payload)

    data = {
        "business": business,
        "doctor": doctor,
        "slot": slot,
        "widget_token": widget_token,
        "jwt_token": jwt_token,
        "headers": {"Authorization": f"Bearer {jwt_token}"},
        "raw_password": raw_password
    }

    yield data

    # Teardown: cascade delete business and all associated child rows
    del_biz = db.query(Business).filter(Business.id == business.id).first()
    if del_biz:
        db.delete(del_biz)
        db.commit()


@pytest.fixture(scope="function")
def clinic_tenant_b(db: Session) -> Generator[Dict[str, Any], None, None]:
    """Creates Clinic B with Doctor B and an open appointment slot."""
    uid = uuid.uuid4().hex[:8]
    raw_password = "Password123!"
    widget_token = f"widget_token_clinic_b_{uuid.uuid4().hex}"

    business = Business(
        name=f"Clinic B Skin-{uid}",
        business_type="clinic",
        widget_token=widget_token,
        username=f"clinic_b_user_{uid}",
        password_hash=hash_password(raw_password)
    )
    db.add(business)
    db.commit()
    db.refresh(business)

    doctor = Doctor(
        business_id=business.id,
        name="Dr. Bob Jones",
        specialty="Dermatology",
        symptoms_treated=["skin rash", "acne", "eczema"],
        fee=120.00
    )
    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    slot_date = date.today() + timedelta(days=1)
    slot = DoctorSlot(
        business_id=business.id,
        doctor_id=doctor.id,
        slot_date=slot_date,
        start_time=time(10, 0),
        end_time=time(10, 30),
        is_booked=False
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    token_payload = {
        "sub": str(business.id),
        "type": business.business_type,
        "name": business.name
    }
    jwt_token = create_access_token(data=token_payload)

    data = {
        "business": business,
        "doctor": doctor,
        "slot": slot,
        "widget_token": widget_token,
        "jwt_token": jwt_token,
        "headers": {"Authorization": f"Bearer {jwt_token}"},
        "raw_password": raw_password
    }

    yield data

    # Teardown: cascade delete business B
    del_biz = db.query(Business).filter(Business.id == business.id).first()
    if del_biz:
        db.delete(del_biz)
        db.commit()


@pytest.fixture(scope="function")
def restaurant_tenant(db: Session) -> Generator[Dict[str, Any], None, None]:
    """Creates Restaurant A with menu items and tables."""
    uid = uuid.uuid4().hex[:8]
    raw_password = "Password123!"
    widget_token = f"widget_token_rest_{uuid.uuid4().hex}"

    business = Business(
        name=f"Trattoria Bella-{uid}",
        business_type="restaurant",
        widget_token=widget_token,
        username=f"restaurant_user_{uid}",
        password_hash=hash_password(raw_password)
    )
    db.add(business)
    db.commit()
    db.refresh(business)

    item1 = MenuItem(
        business_id=business.id,
        name="Truffle Tagliatelle",
        category="Mains",
        price=26.00,
        is_available=True
    )
    item2 = MenuItem(
        business_id=business.id,
        name="Burrata Bruschetta",
        category="Starters",
        price=14.50,
        is_available=True
    )
    db.add_all([item1, item2])
    db.commit()
    db.refresh(item1)
    db.refresh(item2)

    table1 = RestaurantTable(
        business_id=business.id,
        table_number="T1",
        capacity=4
    )
    table2 = RestaurantTable(
        business_id=business.id,
        table_number="T2",
        capacity=2
    )
    db.add_all([table1, table2])
    db.commit()
    db.refresh(table1)
    db.refresh(table2)

    token_payload = {
        "sub": str(business.id),
        "type": business.business_type,
        "name": business.name
    }
    jwt_token = create_access_token(data=token_payload)

    data = {
        "business": business,
        "menu_items": [item1, item2],
        "tables": [table1, table2],
        "widget_token": widget_token,
        "jwt_token": jwt_token,
        "headers": {"Authorization": f"Bearer {jwt_token}"},
        "raw_password": raw_password
    }

    yield data

    # Teardown: cascade delete restaurant business
    del_biz = db.query(Business).filter(Business.id == business.id).first()
    if del_biz:
        db.delete(del_biz)
        db.commit()
