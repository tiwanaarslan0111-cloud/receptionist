from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DemoLead
from app.schemas import DemoLeadCreateRequest, DemoLeadResponse

router = APIRouter(prefix="/api/leads", tags=["Public Leads & Demo Requests"])

@router.post(
    "/demo",
    response_model=DemoLeadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a demo booking request from the landing page"
)
def create_demo_lead(
    payload: DemoLeadCreateRequest,
    db: Session = Depends(get_db)
):
    lead = DemoLead(
        name=payload.name.strip(),
        email=payload.email.strip(),
        phone=payload.phone.strip(),
        business_name=payload.business_name.strip(),
        business_type=payload.business_type.strip(),
        notes=payload.notes.strip() if payload.notes else None,
        status="new"
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead
