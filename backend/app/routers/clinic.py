from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional, Union
from uuid import UUID
from datetime import date
from app.database import get_db
from app.models import Business, Doctor, DoctorSlot, ClinicAppointment
from app.schemas import (
    DoctorCreateRequest,
    DoctorResponse,
    DoctorUpdateRequest,
    DoctorSlotCreateRequest,
    DoctorSlotResponse,
    ManualBookSlotRequest,
    ClinicAppointmentResponse
)
from app.deps import get_current_clinic

router = APIRouter(prefix="/api/clinic", tags=["Clinic Management"])

@router.post(
    "/doctors",
    response_model=DoctorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new doctor to the clinic"
)
def create_doctor(
    payload: DoctorCreateRequest,
    current_business: Business = Depends(get_current_clinic),
    db: Session = Depends(get_db)
):
    new_doctor = Doctor(
        business_id=current_business.id,
        name=payload.name,
        specialty=payload.specialty,
        symptoms_treated=payload.symptoms_treated,
        fee=payload.fee
    )
    db.add(new_doctor)
    db.commit()
    db.refresh(new_doctor)
    return new_doctor

@router.get(
    "/doctors",
    response_model=List[DoctorResponse],
    summary="List all doctors for the logged-in clinic"
)
def list_doctors(
    current_business: Business = Depends(get_current_clinic),
    db: Session = Depends(get_db)
):
    doctors = (
        db.query(Doctor)
        .filter(Doctor.business_id == current_business.id)
        .order_by(Doctor.name.asc())
        .all()
    )
    return doctors

@router.post(
    "/slots",
    response_model=List[DoctorSlotResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add one or multiple slots for a doctor"
)
def create_slots(
    payload: Union[DoctorSlotCreateRequest, List[DoctorSlotCreateRequest]],
    current_business: Business = Depends(get_current_clinic),
    db: Session = Depends(get_db)
):
    items = payload if isinstance(payload, list) else [payload]
    if not items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one slot must be provided"
        )

    verified_doctors = set()
    created_slots = []

    for item in items:
        if item.start_time >= item.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"start_time ({item.start_time}) must be earlier than end_time ({item.end_time})"
            )

        if item.doctor_id not in verified_doctors:
            doctor = (
                db.query(Doctor)
                .filter(
                    Doctor.id == item.doctor_id,
                    Doctor.business_id == current_business.id
                )
                .first()
            )
            if not doctor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Doctor with ID '{item.doctor_id}' not found in this clinic"
                )
            verified_doctors.add(item.doctor_id)

        new_slot = DoctorSlot(
            business_id=current_business.id,
            doctor_id=item.doctor_id,
            slot_date=item.slot_date,
            start_time=item.start_time,
            end_time=item.end_time,
            is_booked=False
        )
        db.add(new_slot)
        created_slots.append(new_slot)

    db.commit()
    for s in created_slots:
        db.refresh(s)

    return created_slots

@router.get(
    "/slots",
    response_model=List[DoctorSlotResponse],
    summary="List slots for the clinic with optional doctor and date filters"
)
def list_slots(
    doctor_id: Optional[UUID] = Query(None, description="Filter by doctor ID"),
    slot_date: Optional[date] = Query(None, description="Filter by slot date (YYYY-MM-DD)"),
    current_business: Business = Depends(get_current_clinic),
    db: Session = Depends(get_db)
):
    query = db.query(DoctorSlot).filter(DoctorSlot.business_id == current_business.id)
    if doctor_id:
        query = query.filter(DoctorSlot.doctor_id == doctor_id)
    if slot_date:
        query = query.filter(DoctorSlot.slot_date == slot_date)

    slots = query.order_by(DoctorSlot.slot_date.asc(), DoctorSlot.start_time.asc()).all()
    return slots

@router.put(
    "/doctors/{doctor_id}",
    response_model=DoctorResponse,
    summary="Update doctor details (name, specialty, symptoms, fee, availability)"
)
def update_doctor(
    doctor_id: UUID,
    payload: DoctorUpdateRequest,
    current_business: Business = Depends(get_current_clinic),
    db: Session = Depends(get_db)
):
    doctor = (
        db.query(Doctor)
        .filter(
            Doctor.id == doctor_id,
            Doctor.business_id == current_business.id
        )
        .first()
    )
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID '{doctor_id}' not found"
        )

    if payload.name is not None:
        doctor.name = payload.name
    if payload.specialty is not None:
        doctor.specialty = payload.specialty
    if payload.symptoms_treated is not None:
        doctor.symptoms_treated = payload.symptoms_treated
    if payload.fee is not None:
        doctor.fee = payload.fee
    if payload.is_available_today is not None:
        doctor.is_available_today = payload.is_available_today

    db.commit()
    db.refresh(doctor)
    return doctor

@router.patch(
    "/doctors/{doctor_id}/toggle-availability",
    response_model=DoctorResponse,
    summary="Toggle doctor availability for today"
)
def toggle_doctor_availability_today(
    doctor_id: UUID,
    current_business: Business = Depends(get_current_clinic),
    db: Session = Depends(get_db)
):
    doctor = (
        db.query(Doctor)
        .filter(
            Doctor.id == doctor_id,
            Doctor.business_id == current_business.id
        )
        .first()
    )
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor with ID '{doctor_id}' not found"
        )

    doctor.is_available_today = not doctor.is_available_today
    db.commit()
    db.refresh(doctor)
    return doctor

@router.delete(
    "/slots/{slot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an appointment slot"
)
def delete_slot(
    slot_id: UUID,
    current_business: Business = Depends(get_current_clinic),
    db: Session = Depends(get_db)
):
    slot = (
        db.query(DoctorSlot)
        .filter(
            DoctorSlot.id == slot_id,
            DoctorSlot.business_id == current_business.id
        )
        .first()
    )
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Slot with ID '{slot_id}' not found"
        )

    db.delete(slot)
    db.commit()
    return None

@router.patch(
    "/slots/{slot_id}/toggle-disable",
    response_model=DoctorSlotResponse,
    summary="Toggle slot disabled status"
)
def toggle_slot_disabled(
    slot_id: UUID,
    current_business: Business = Depends(get_current_clinic),
    db: Session = Depends(get_db)
):
    slot = (
        db.query(DoctorSlot)
        .filter(
            DoctorSlot.id == slot_id,
            DoctorSlot.business_id == current_business.id
        )
        .first()
    )
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Slot with ID '{slot_id}' not found"
        )

    slot.is_disabled = not slot.is_disabled
    db.commit()
    db.refresh(slot)
    return slot

@router.post(
    "/slots/{slot_id}/book",
    response_model=DoctorSlotResponse,
    summary="Manually book an available appointment slot"
)
def manual_book_slot(
    slot_id: UUID,
    payload: ManualBookSlotRequest,
    current_business: Business = Depends(get_current_clinic),
    db: Session = Depends(get_db)
):
    slot = (
        db.query(DoctorSlot)
        .filter(
            DoctorSlot.id == slot_id,
            DoctorSlot.business_id == current_business.id
        )
        .with_for_update()
        .first()
    )
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Slot with ID '{slot_id}' not found"
        )
    if slot.is_disabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot book a disabled slot. Please enable it first."
        )
    if slot.is_booked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slot is already booked."
        )

    slot.is_booked = True
    appointment = ClinicAppointment(
        business_id=current_business.id,
        doctor_id=slot.doctor_id,
        slot_id=slot.id,
        patient_name=payload.patient_name.strip(),
        patient_phone=payload.patient_phone.strip(),
        symptoms_reported=payload.symptoms_reported.strip() if payload.symptoms_reported else None
    )
    db.add(appointment)
    db.commit()
    db.refresh(slot)
    return slot

@router.post(
    "/slots/{slot_id}/unbook",
    response_model=DoctorSlotResponse,
    summary="Manually unbook an appointment slot and cancel associated appointment"
)
def manual_unbook_slot(
    slot_id: UUID,
    current_business: Business = Depends(get_current_clinic),
    db: Session = Depends(get_db)
):
    slot = (
        db.query(DoctorSlot)
        .filter(
            DoctorSlot.id == slot_id,
            DoctorSlot.business_id == current_business.id
        )
        .with_for_update()
        .first()
    )
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Slot with ID '{slot_id}' not found"
        )

    # Delete any appointment linked to this slot
    db.query(ClinicAppointment).filter(
        ClinicAppointment.slot_id == slot.id,
        ClinicAppointment.business_id == current_business.id
    ).delete(synchronize_session=False)

    slot.is_booked = False
    db.commit()
    db.refresh(slot)
    return slot

@router.get(
    "/appointments",
    response_model=List[ClinicAppointmentResponse],
    summary="List all booked appointments for this clinic"
)
def list_appointments(
    current_business: Business = Depends(get_current_clinic),
    db: Session = Depends(get_db)
):
    appointments = (
        db.query(ClinicAppointment)
        .filter(ClinicAppointment.business_id == current_business.id)
        .order_by(ClinicAppointment.created_at.desc())
        .all()
    )
    return appointments

