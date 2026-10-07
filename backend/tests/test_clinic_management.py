from datetime import date, time
from typing import Dict, Any
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import DoctorSlot, ClinicAppointment
from app.services.ai_agent import execute_book_appointment, execute_check_doctor_slots


def test_doctor_update(client: TestClient, db: Session, clinic_tenant_a: Dict[str, Any]):
    """
    Verify PUT /api/clinic/doctors/{id} correctly updates doctor fields.
    """
    headers = clinic_tenant_a["headers"]
    doctor = clinic_tenant_a["doctor"]

    update_payload = {
        "name": "Dr. Updated Alice",
        "specialty": "Neurology",
        "symptoms_treated": "Headache, Seizures",
        "fee": 6500,
        "is_available_today": False,
    }

    res = client.put(f"/api/clinic/doctors/{doctor.id}", json=update_payload, headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["name"] == "Dr. Updated Alice"
    assert data["specialty"] == "Neurology"
    assert data["fee"] == 6500
    assert data["is_available_today"] is False

    db.refresh(doctor)
    assert doctor.name == "Dr. Updated Alice"
    assert doctor.is_available_today is False


def test_doctor_toggle_availability_and_ai_agent(
    client: TestClient, db: Session, clinic_tenant_a: Dict[str, Any]
):
    """
    Verify PATCH /api/clinic/doctors/{id}/toggle-availability toggles today's status
    and ensures AI Agent respects unavailability for today's bookings.
    """
    headers = clinic_tenant_a["headers"]
    doctor = clinic_tenant_a["doctor"]
    business_id = clinic_tenant_a["business"].id
    today_str = date.today().isoformat()

    # Create a slot for today
    today_slot = DoctorSlot(
        business_id=business_id,
        doctor_id=doctor.id,
        slot_date=date.today(),
        start_time=time(10, 0),
        end_time=time(10, 30),
        is_booked=False,
        is_disabled=False,
    )
    db.add(today_slot)
    db.commit()
    db.refresh(today_slot)

    # 1. Toggle availability to False
    res = client.patch(f"/api/clinic/doctors/{doctor.id}/toggle-availability", headers=headers)
    assert res.status_code == 200
    assert res.json()["is_available_today"] is False
    db.refresh(doctor)

    # AI Agent checking today's slots should return doctor unavailable notice
    slots_res = execute_check_doctor_slots(
        business_id=business_id,
        db=db,
        doctor_id=str(doctor.id),
        date=today_str,
    )
    assert slots_res["count"] == 0
    assert "unavailable" in slots_res.get("message", "").lower()

    # Booking attempt for today should fail
    book_res = execute_book_appointment(
        business_id=business_id,
        db=db,
        doctor_id=str(doctor.id),
        slot_id=str(today_slot.id),
        patient_name="John Doe",
        patient_phone="+923001234567",
        symptoms="Checkup",
    )
    assert "error" in book_res
    assert "currently unavailable" in book_res["error"]

    # 2. Toggle back to True
    res2 = client.patch(f"/api/clinic/doctors/{doctor.id}/toggle-availability", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["is_available_today"] is True


def test_slot_toggle_disable_and_ai_agent(
    client: TestClient, db: Session, clinic_tenant_a: Dict[str, Any]
):
    """
    Verify PATCH /api/clinic/slots/{id}/toggle-disable disables slot
    and AI agent omits disabled slots.
    """
    headers = clinic_tenant_a["headers"]
    slot = clinic_tenant_a["slot"]
    doctor = clinic_tenant_a["doctor"]
    business_id = clinic_tenant_a["business"].id

    # 1. Disable the slot
    res = client.patch(f"/api/clinic/slots/{slot.id}/toggle-disable", headers=headers)
    assert res.status_code == 200
    assert res.json()["is_disabled"] is True

    # AI Agent should not see disabled slot
    check_res = execute_check_doctor_slots(
        business_id=business_id,
        db=db,
        doctor_id=str(doctor.id),
        date=str(slot.slot_date),
    )
    # The slot should not be listed
    slot_ids = [s["slot_id"] for s in check_res.get("available_slots", [])]
    assert str(slot.id) not in slot_ids

    # Booking should fail
    book_res = execute_book_appointment(
        business_id=business_id,
        db=db,
        doctor_id=str(doctor.id),
        slot_id=str(slot.id),
        patient_name="Jane Doe",
        patient_phone="+923001234567",
        symptoms="General consultation",
    )
    assert "error" in book_res

    # 2. Re-enable slot
    res2 = client.patch(f"/api/clinic/slots/{slot.id}/toggle-disable", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["is_disabled"] is False


def test_slot_delete_and_isolation(
    client: TestClient, db: Session, clinic_tenant_a: Dict[str, Any], clinic_tenant_b: Dict[str, Any]
):
    """
    Verify DELETE /api/clinic/slots/{id} deletes the slot,
    and cross-tenant deletion attempts return 404.
    """
    headers_a = clinic_tenant_a["headers"]
    slot_b = clinic_tenant_b["slot"]

    # Clinic A cannot delete Clinic B's slot
    cross_res = client.delete(f"/api/clinic/slots/{slot_b.id}", headers=headers_a)
    assert cross_res.status_code == 404

    # Clinic B can delete its own slot
    headers_b = clinic_tenant_b["headers"]
    del_res = client.delete(f"/api/clinic/slots/{slot_b.id}", headers=headers_b)
    assert del_res.status_code == 204

    # Slot should no longer be in DB
    deleted = db.query(DoctorSlot).filter(DoctorSlot.id == slot_b.id).first()
    assert deleted is None


def test_manual_book_and_unbook_slot(
    client: TestClient, db: Session, clinic_tenant_a: Dict[str, Any], clinic_tenant_b: Dict[str, Any]
):
    """
    Verify POST /api/clinic/slots/{id}/book and POST /api/clinic/slots/{id}/unbook.
    """
    headers_a = clinic_tenant_a["headers"]
    slot_a = clinic_tenant_a["slot"]
    slot_b = clinic_tenant_b["slot"]

    # 1. Manual Book Slot
    book_payload = {
        "patient_name": "Tariq Mahmood",
        "patient_phone": "+923009876543",
        "symptoms_reported": "Routine checkup and consultation",
    }
    res = client.post(f"/api/clinic/slots/{slot_a.id}/book", json=book_payload, headers=headers_a)
    assert res.status_code == 200, res.text
    assert res.json()["is_booked"] is True

    # Verify ClinicAppointment in DB
    appt = db.query(ClinicAppointment).filter(ClinicAppointment.slot_id == slot_a.id).first()
    assert appt is not None
    assert appt.patient_name == "Tariq Mahmood"
    assert appt.patient_phone == "+923009876543"

    # 2. Attempting to book already-booked slot returns 400
    res_double = client.post(f"/api/clinic/slots/{slot_a.id}/book", json=book_payload, headers=headers_a)
    assert res_double.status_code == 400

    # 3. Cross-tenant booking returns 404
    res_cross = client.post(f"/api/clinic/slots/{slot_b.id}/book", json=book_payload, headers=headers_a)
    assert res_cross.status_code == 404

    # 4. Manual Unbook Slot
    unbook_res = client.post(f"/api/clinic/slots/{slot_a.id}/unbook", headers=headers_a)
    assert unbook_res.status_code == 200
    assert unbook_res.json()["is_booked"] is False

    # Verify ClinicAppointment is deleted from DB
    deleted_appt = db.query(ClinicAppointment).filter(ClinicAppointment.slot_id == slot_a.id).first()
    assert deleted_appt is None

    # 5. Cross-tenant unbooking returns 404
    res_cross_unbook = client.post(f"/api/clinic/slots/{slot_b.id}/unbook", headers=headers_a)
    assert res_cross_unbook.status_code == 404

