from uuid import UUID
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.models import Business, DemoLead, User
from app.schemas import (
    BusinessCreateRequest,
    BusinessResponse,
    BusinessProvisionRequest,
    BusinessProvisionResponse,
    DemoLeadResponse
)
from app.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["Super Admin"])

def verify_admin(x_admin_secret: str = Header(..., description="Master admin password")):
    if x_admin_secret != settings.ADMIN_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin secret key"
        )
    return x_admin_secret

def get_embed_snippet(widget_token: str) -> str:
    base = (getattr(settings, "PUBLIC_BASE_URL", "https://receptionist.helpexai.com") or "https://receptionist.helpexai.com").rstrip("/")
    return f'<script src="{base}/static/widget.js" data-token="{widget_token}" defer></script>'

@router.get(
    "/businesses",
    response_model=List[BusinessResponse],
    summary="List all registered businesses for super admin"
)
def list_businesses(
    _auth: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    businesses = db.query(Business).order_by(Business.created_at.desc()).all()
    results = []
    for b in businesses:
        owner_user = db.query(User).filter(User.business_id == b.id).first()
        owner_email = owner_user.email if owner_user else None

        results.append(
            BusinessResponse(
                id=b.id,
                name=b.name,
                slug=b.slug,
                type=b.business_type,
                business_type=b.business_type,
                username=b.username,
                inbound_phone_id=b.inbound_phone_id,
                display_phone_number=b.display_phone_number,
                waba_id=b.waba_id,
                widget_token=b.widget_token,
                is_widget_enabled=getattr(b, "is_widget_enabled", True),
                created_at=b.created_at,
                embed_snippet=get_embed_snippet(b.widget_token),
                owner_email=owner_email
            )
        )
    return results

@router.post(
    "/businesses",
    response_model=BusinessProvisionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Provision a new business account with owner credentials and Meta WhatsApp configuration"
)
def provision_business(
    payload: BusinessProvisionRequest,
    _auth: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    cleaned_slug = payload.slug.strip().lower()
    cleaned_email = payload.owner_email.strip().lower()

    # 1. Validate slug uniqueness
    existing_slug = db.query(Business).filter(Business.slug == cleaned_slug).first()
    if existing_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Business slug '{cleaned_slug}' is already taken. Please choose another."
        )

    # 2. Validate inbound_phone_id uniqueness (if provided)
    if payload.inbound_phone_id and payload.inbound_phone_id.strip():
        clean_phone_id = payload.inbound_phone_id.strip()
        existing_phone = db.query(Business).filter(Business.inbound_phone_id == clean_phone_id).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"WhatsApp Phone Number ID '{clean_phone_id}' is already assigned to business '{existing_phone.name}'."
            )
    else:
        clean_phone_id = None

    # 3. Validate owner_email / username uniqueness
    existing_user = db.query(User).filter(User.email.ilike(cleaned_email)).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{cleaned_email}' is already registered. Please choose another."
        )

    # 4. Generate widget token and hash owner password
    widget_token = secrets.token_hex(16)
    hashed_pw = hash_password(payload.owner_password)

    # 5. Create Business and User atomically in a database transaction
    try:
        new_business = Business(
            name=payload.name.strip(),
            slug=cleaned_slug,
            business_type=payload.type,
            username=cleaned_slug,
            password_hash=hashed_pw,
            widget_token=widget_token,
            inbound_phone_id=clean_phone_id,
            display_phone_number=payload.display_phone_number.strip() if payload.display_phone_number else None,
            waba_id=payload.waba_id.strip() if payload.waba_id else None,
            is_widget_enabled=True
        )
        db.add(new_business)
        db.flush()

        new_user = User(
            email=cleaned_email,
            hashed_password=hashed_pw,
            role="business_admin",
            business_id=new_business.id
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_business)
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to provision business: {str(e)}"
        )

    return BusinessProvisionResponse(
        id=new_business.id,
        name=new_business.name,
        slug=new_business.slug,
        type=new_business.business_type,
        business_type=new_business.business_type,
        inbound_phone_id=new_business.inbound_phone_id,
        display_phone_number=new_business.display_phone_number,
        waba_id=new_business.waba_id,
        widget_token=new_business.widget_token,
        is_widget_enabled=new_business.is_widget_enabled,
        created_at=new_business.created_at,
        embed_snippet=get_embed_snippet(new_business.widget_token),
        owner_email=new_user.email,
        owner_role=new_user.role,
        owner_user_id=new_user.id
    )

@router.post(
    "/create-business",
    response_model=BusinessResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new clinic or restaurant tenant"
)
def create_business(
    payload: BusinessCreateRequest,
    _auth: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    # Check for duplicate username
    existing_user = db.query(Business).filter(Business.username.ilike(payload.username.strip())).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered. Please choose another."
        )

    # Generate secure 32-character hex token and hash password
    widget_token = secrets.token_hex(16)
    hashed_pw = hash_password(payload.password)

    new_business = Business(
        name=payload.name.strip(),
        business_type=payload.business_type,
        username=payload.username.strip(),
        password_hash=hashed_pw,
        widget_token=widget_token,
        is_widget_enabled=True
    )

    db.add(new_business)
    db.commit()
    db.refresh(new_business)

    return BusinessResponse(
        id=new_business.id,
        name=new_business.name,
        business_type=new_business.business_type,
        username=new_business.username,
        widget_token=new_business.widget_token,
        is_widget_enabled=new_business.is_widget_enabled,
        created_at=new_business.created_at,
        embed_snippet=get_embed_snippet(new_business.widget_token)
    )

@router.patch(
    "/businesses/{business_id}/toggle-widget",
    response_model=BusinessResponse,
    summary="Toggle AI Receptionist widget enabled/disabled status"
)
def toggle_business_widget(
    business_id: UUID,
    _auth: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    business.is_widget_enabled = not getattr(business, "is_widget_enabled", True)
    db.commit()
    db.refresh(business)

    return BusinessResponse(
        id=business.id,
        name=business.name,
        business_type=business.business_type,
        username=business.username,
        widget_token=business.widget_token,
        is_widget_enabled=business.is_widget_enabled,
        created_at=business.created_at,
        embed_snippet=get_embed_snippet(business.widget_token)
    )

@router.delete(
    "/businesses/{business_id}",
    summary="Delete a business tenant"
)
def delete_business(
    business_id: UUID,
    _auth: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")

    db.delete(business)
    db.commit()
    return {"message": "Business deleted successfully", "id": str(business_id)}

# ==================== DEMO LEADS MANAGEMENT ====================

@router.get(
    "/leads",
    response_model=List[DemoLeadResponse],
    summary="List all demo and contact requests captured from public landing page"
)
def list_demo_leads(
    _auth: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    leads = db.query(DemoLead).order_by(DemoLead.created_at.desc()).all()
    return leads

@router.patch(
    "/leads/{lead_id}/status",
    response_model=DemoLeadResponse,
    summary="Update demo request status (new, contacted, qualified, closed)"
)
def update_lead_status(
    lead_id: UUID,
    status_val: str,
    _auth: str = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    lead = db.query(DemoLead).filter(DemoLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lead not found")

    lead.status = status_val
    db.commit()
    db.refresh(lead)
    return lead

