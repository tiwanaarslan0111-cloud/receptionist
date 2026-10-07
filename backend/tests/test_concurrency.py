import asyncio
import concurrent.futures
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import DoctorSlot, ClinicAppointment
from app.services.ai_agent import execute_book_appointment


def test_concurrent_slot_booking_threadpool(clinic_tenant_a: Dict[str, Any]):
    """
    Test Step 3: Concurrency Race-Condition Test.
    Uses ThreadPoolExecutor to trigger 5 simultaneous booking calls on the EXACT same slot_id.
    Validates atomic row-level locking (with_for_update):
    - Exactly 1 request succeeds (status='confirmed').
    - Exactly 4 requests receive a conflict/rejection error.
    - Database reflects doctor_slots.is_booked == True and exactly 1 ClinicAppointment row exists.
    """
    biz_id = clinic_tenant_a["business"].id
    doc_id = str(clinic_tenant_a["doctor"].id)
    slot_id = str(clinic_tenant_a["slot"].id)

    def attempt_booking(call_index: int) -> Dict[str, Any]:
        session: Session = SessionLocal()
        try:
            return execute_book_appointment(
                business_id=biz_id,
                db=session,
                doctor_id=doc_id,
                slot_id=slot_id,
                patient_name=f"Concurrent Patient {call_index}",
                patient_phone=f"+9230012345{call_index:02d}",
                symptoms="Fever and chest discomfort"
            )
        finally:
            session.close()

    # Trigger 5 simultaneous calls across 5 concurrent threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(attempt_booking, i) for i in range(5)]
        results = [f.result() for f in futures]

    # Verify response outcomes
    successes = [r for r in results if r.get("status") == "confirmed"]
    conflicts = [r for r in results if "error" in r]

    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}: {successes}"
    assert len(conflicts) == 4, f"Expected exactly 4 conflicts, got {len(conflicts)}: {conflicts}"
    assert "appointment_id" in successes[0]

    # Verify database persistence & integrity
    verify_db: Session = SessionLocal()
    try:
        final_slot = (
            verify_db.query(DoctorSlot)
            .filter(DoctorSlot.id == clinic_tenant_a["slot"].id)
            .first()
        )
        assert final_slot is not None
        assert final_slot.is_booked is True, "DoctorSlot is_booked should be True"

        appointments = (
            verify_db.query(ClinicAppointment)
            .filter(ClinicAppointment.slot_id == clinic_tenant_a["slot"].id)
            .all()
        )
        assert len(appointments) == 1, f"Expected 1 appointment row, found {len(appointments)}"
        assert appointments[0].doctor_id == clinic_tenant_a["doctor"].id
        assert appointments[0].business_id == biz_id
    finally:
        verify_db.close()


async def test_concurrent_slot_booking_asyncio(clinic_tenant_b: Dict[str, Any]):
    """
    Test Step 3 Variant: Concurrency with asyncio.gather.
    Triggers 5 simultaneous calls via asyncio.to_thread on Clinic B's slot.
    """
    biz_id = clinic_tenant_b["business"].id
    doc_id = str(clinic_tenant_b["doctor"].id)
    slot_id = str(clinic_tenant_b["slot"].id)

    def worker(i: int) -> Dict[str, Any]:
        session: Session = SessionLocal()
        try:
            return execute_book_appointment(
                business_id=biz_id,
                db=session,
                doctor_id=doc_id,
                slot_id=slot_id,
                patient_name=f"Async Patient {i}",
                patient_phone=f"+9231198765{i:02d}",
                symptoms="Dermatology consultation"
            )
        finally:
            session.close()

    tasks = [asyncio.to_thread(worker, i) for i in range(5)]
    results = await asyncio.gather(*tasks)

    successes = [r for r in results if r.get("status") == "confirmed"]
    conflicts = [r for r in results if "error" in r]

    assert len(successes) == 1
    assert len(conflicts) == 4

    verify_db: Session = SessionLocal()
    try:
        slot = verify_db.query(DoctorSlot).filter(DoctorSlot.id == clinic_tenant_b["slot"].id).first()
        assert slot.is_booked is True

        appointments = (
            verify_db.query(ClinicAppointment)
            .filter(ClinicAppointment.slot_id == clinic_tenant_b["slot"].id)
            .all()
        )
        assert len(appointments) == 1
    finally:
        verify_db.close()
