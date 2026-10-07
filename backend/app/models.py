import uuid
from sqlalchemy import Column, String, Boolean, Date, Time, Integer, Numeric, Text, ForeignKey, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import synonym, relationship
from app.database import Base

class Business(Base):
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=True)
    business_type = Column(String(50), nullable=False, default="clinic")  # 'clinic' or 'restaurant'
    type = synonym("business_type")

    widget_token = Column(String(64), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    inbound_phone = Column(String(50), nullable=True)  # Reserved for v2 telephony
    inbound_phone_id = Column(String(64), unique=True, index=True, nullable=True)  # Meta WhatsApp Cloud API Phone Number ID
    display_phone_number = Column(String(50), nullable=True)  # Reference phone e.g. "+923001234567"
    waba_id = Column(String(64), nullable=True)  # Meta WhatsApp Business Account ID
    is_widget_enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Linked portal users
    users = relationship("User", back_populates="business", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(Text, nullable=False)
    role = Column(String(50), nullable=False, default="business_admin")  # "super_admin" or "business_admin"
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    business = relationship("Business", back_populates="users")

# ==================== CLINIC MODULE ====================

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    specialty = Column(String(100), nullable=False)
    symptoms_treated = Column(ARRAY(Text), default=[])
    fee = Column(Numeric(10, 2), default=0.0)
    is_available_today = Column(Boolean, default=True, nullable=False)

class DoctorSlot(Base):
    __tablename__ = "doctor_slots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True)
    slot_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_booked = Column(Boolean, default=False, nullable=False)
    is_disabled = Column(Boolean, default=False, nullable=False)

class ClinicAppointment(Base):
    __tablename__ = "clinic_appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    doctor_id = Column(UUID(as_uuid=True), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    slot_id = Column(UUID(as_uuid=True), ForeignKey("doctor_slots.id", ondelete="CASCADE"), nullable=False)
    patient_name = Column(String(255), nullable=False)
    patient_phone = Column(String(50), nullable=False)
    symptoms_reported = Column(Text, nullable=True)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

# =================== RESTAURANT MODULE ===================

class RestaurantTable(Base):
    __tablename__ = "restaurant_tables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    table_number = Column(String(50), nullable=False)
    capacity = Column(Integer, nullable=False)

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    is_available = Column(Boolean, default=True)

class RestaurantReservation(Base):
    __tablename__ = "restaurant_reservations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_name = Column(String(255), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    booking_date = Column(Date, nullable=False)
    booking_time = Column(Time, nullable=False)
    party_size = Column(Integer, nullable=False)
    order_items = Column(JSONB, default=list)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

# =================== DEMO LEADS / CONTACT ===================

class DemoLead(Base):
    __tablename__ = "demo_leads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=False)
    business_name = Column(String(255), nullable=False)
    business_type = Column(String(50), nullable=False)  # 'clinic', 'restaurant', 'other'
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="new", nullable=False)  # 'new', 'contacted', 'qualified'
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

