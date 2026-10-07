from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Any, Dict, Union
from uuid import UUID
from datetime import date, time, datetime

# ==================== SUPER ADMIN SCHEMAS ====================

class BusinessCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, examples=["Al-Shifa Family Clinic"])
    business_type: str = Field(..., pattern="^(clinic|restaurant)$", examples=["clinic"])
    username: str = Field(..., min_length=3, max_length=100, examples=["alshifa"])
    password: str = Field(..., min_length=6, examples=["securepass123"])

class BusinessProvisionRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, examples=["Al-Razi Dental Clinic"])
    slug: str = Field(..., min_length=2, max_length=100, examples=["al-razi-dental"])
    type: str = Field(..., pattern="^(clinic|restaurant)$", examples=["clinic"])
    inbound_phone_id: Optional[str] = Field(None, max_length=64, examples=["104928372619482"])
    display_phone_number: Optional[str] = Field(None, max_length=50, examples=["+923001234567"])
    waba_id: Optional[str] = Field(None, max_length=64, examples=["1841329600331081"])
    owner_email: str = Field(..., min_length=3, max_length=255, examples=["rooster_admin"])
    owner_password: str = Field(..., min_length=6, examples=["TemporaryPassword123"])

class BusinessResponse(BaseModel):
    id: UUID
    name: str
    slug: Optional[str] = None
    type: Optional[str] = None
    business_type: str
    username: str
    inbound_phone_id: Optional[str] = None
    display_phone_number: Optional[str] = None
    waba_id: Optional[str] = None
    widget_token: str
    is_widget_enabled: bool = True
    created_at: datetime
    embed_snippet: str
    owner_email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class BusinessProvisionResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    type: str
    business_type: str
    inbound_phone_id: Optional[str] = None
    display_phone_number: Optional[str] = None
    waba_id: Optional[str] = None
    widget_token: str
    is_widget_enabled: bool = True
    created_at: datetime
    embed_snippet: str
    owner_email: str
    owner_role: str = "business_admin"
    owner_user_id: UUID

    model_config = ConfigDict(from_attributes=True)

# ==================== AUTH SCHEMAS ====================

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, examples=["alshifa", "admin@alrazi.com"])
    password: str = Field(..., min_length=1, examples=["securepass123"])

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    sub: Optional[str] = None
    role: Optional[str] = "business_admin"
    business_id: Optional[UUID] = None
    business_name: str
    business_type: str
    admin_secret: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)

class BusinessProfileResponse(BaseModel):
    id: UUID
    name: str
    business_type: str
    username: str
    widget_token: str
    inbound_phone: Optional[str] = None
    is_widget_enabled: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==================== DEMO LEAD SCHEMAS ====================

class DemoLeadCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    phone: str = Field(..., min_length=3, max_length=50)
    business_name: str = Field(..., min_length=2, max_length=255)
    business_type: str = Field(default="clinic", max_length=50)
    notes: Optional[str] = Field(default=None, max_length=1000)

class DemoLeadResponse(BaseModel):
    id: UUID
    name: str
    email: str
    phone: str
    business_name: str
    business_type: str
    notes: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==================== CLINIC SCHEMAS ====================

class DoctorCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, examples=["Dr. Sarah Jenkins"])
    specialty: str = Field(..., min_length=2, max_length=100, examples=["General Physician"])
    symptoms_treated: Union[List[str], str] = Field(default_factory=list, examples=[["fever", "cough", "flu"]])
    fee: float = Field(default=0.0, ge=0.0, examples=[50.0])

    @field_validator("symptoms_treated", mode="before")
    @classmethod
    def parse_symptoms(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

class DoctorResponse(BaseModel):
    id: UUID
    business_id: UUID
    name: str
    specialty: str
    symptoms_treated: List[str]
    fee: float
    is_available_today: bool = True

    model_config = ConfigDict(from_attributes=True)

class DoctorUpdateRequest(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    symptoms_treated: Optional[Union[List[str], str]] = None
    fee: Optional[float] = None
    is_available_today: Optional[bool] = None

    @field_validator("symptoms_treated", mode="before")
    @classmethod
    def parse_symptoms(cls, v):
        if isinstance(v, str):
            return [s.strip() for s in v.split(",") if s.strip()]
        return v

class DoctorSlotCreateRequest(BaseModel):
    doctor_id: UUID
    slot_date: date
    start_time: time
    end_time: time

class DoctorSlotResponse(BaseModel):
    id: UUID
    business_id: UUID
    doctor_id: UUID
    slot_date: date
    start_time: time
    end_time: time
    is_booked: bool
    is_disabled: bool = False

    model_config = ConfigDict(from_attributes=True)

class ManualBookSlotRequest(BaseModel):
    patient_name: str = Field(..., min_length=1, max_length=255, examples=["Ahmed Khan"])
    patient_phone: str = Field(..., min_length=1, max_length=50, examples=["+923001234567"])
    symptoms_reported: Optional[str] = Field(default=None, max_length=500, examples=["Manual booking"])

class ClinicAppointmentResponse(BaseModel):
    id: UUID
    business_id: UUID
    doctor_id: UUID
    slot_id: UUID
    patient_name: str
    patient_phone: str
    symptoms_reported: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==================== RESTAURANT SCHEMAS ====================

class MenuItemCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, examples=["Margherita Pizza"])
    category: str = Field(..., min_length=1, max_length=100, examples=["Mains"])
    price: float = Field(..., ge=0.0, examples=[14.99])
    is_available: bool = Field(default=True, examples=[True])

class MenuItemUpdateAvailabilityRequest(BaseModel):
    is_available: Optional[bool] = Field(default=None, description="Set availability explicitly or omit to toggle")

class MenuItemResponse(BaseModel):
    id: UUID
    business_id: UUID
    name: str
    category: str
    price: float
    is_available: bool

    model_config = ConfigDict(from_attributes=True)

class RestaurantTableCreateRequest(BaseModel):
    table_number: str = Field(..., min_length=1, max_length=50, examples=["T-12"])
    capacity: int = Field(..., gt=0, examples=[4])

class RestaurantTableResponse(BaseModel):
    id: UUID
    business_id: UUID
    table_number: str
    capacity: int

    model_config = ConfigDict(from_attributes=True)

class RestaurantReservationResponse(BaseModel):
    id: UUID
    business_id: UUID
    customer_name: str
    customer_phone: str
    booking_date: date
    booking_time: time
    party_size: int
    order_items: List[Any] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ==================== RESTAURANT ORDER SCHEMAS ====================

class RestaurantOrderCreateRequest(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=255, examples=["Arslan"])
    customer_phone: str = Field(..., min_length=3, max_length=50, examples=["+923001234567"])
    order_type: str = Field(default="delivery", pattern="^(delivery|pickup|dine_in)$")
    delivery_address: Optional[str] = None
    items: List[Dict[str, Any]] = Field(default_factory=list)
    special_instructions: Optional[str] = None

class RestaurantOrderStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(received|in_kitchen|ready|completed|cancelled)$")

class RestaurantOrderResponse(BaseModel):
    id: UUID
    business_id: UUID
    order_number: str
    customer_name: str
    customer_phone: str
    order_type: str
    delivery_address: Optional[str] = None
    items: List[Any] = Field(default_factory=list)
    total_amount: float
    status: str
    special_instructions: Optional[str] = None
    channel: Optional[str] = "whatsapp"
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

# ==================== WIDGET CHAT SCHEMAS ====================

class WidgetChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, examples=["sess_client_98765"])
    message: str = Field(..., min_length=1, examples=["Hello, I want to book an appointment."])

class WidgetChatResponse(BaseModel):
    text: str
    action_taken: Optional[str] = None
    booking_details: Optional[Dict[str, Any]] = None
    audio_url: Optional[str] = None
