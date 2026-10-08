import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import Base, engine
from app.routers import admin, auth, clinic, restaurant, widget, leads, whatsapp, waha

from sqlalchemy import text

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup if they don't already exist
    Base.metadata.create_all(bind=engine)
    # Ensure all required columns exist on users table even if connecting to a pre-existing schema
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                CREATE EXTENSION IF NOT EXISTS pgcrypto;
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'users' AND column_name = 'id' AND data_type = 'integer'
                    ) THEN
                        ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
                        ALTER TABLE users ALTER COLUMN id TYPE UUID USING gen_random_uuid();
                        ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
                    END IF;
                END $$;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password TEXT;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'business_admin';
                ALTER TABLE users ADD COLUMN IF NOT EXISTS business_id UUID;
                ALTER TABLE users ALTER COLUMN email_verified_at DROP NOT NULL;
                ALTER TABLE users ALTER COLUMN verified_at DROP NOT NULL;
                ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
                ALTER TABLE users ALTER COLUMN remember_token DROP NOT NULL;
                ALTER TABLE users ALTER COLUMN username DROP NOT NULL;

                CREATE TABLE IF NOT EXISTS restaurant_orders (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                    order_number VARCHAR(50) NOT NULL,
                    customer_name VARCHAR(255) NOT NULL,
                    customer_phone VARCHAR(50) NOT NULL,
                    order_type VARCHAR(50) NOT NULL DEFAULT 'delivery',
                    delivery_address TEXT,
                    items JSONB NOT NULL DEFAULT '[]'::jsonb,
                    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
                    status VARCHAR(50) NOT NULL DEFAULT 'received',
                    special_instructions TEXT,
                    channel VARCHAR(50) DEFAULT 'whatsapp',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_restaurant_orders_biz ON restaurant_orders(business_id);
                CREATE INDEX IF NOT EXISTS idx_restaurant_orders_status ON restaurant_orders(status);
                CREATE INDEX IF NOT EXISTS idx_restaurant_orders_phone ON restaurant_orders(customer_phone);

                ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS whatsapp_chat_id VARCHAR(100);
                CREATE INDEX IF NOT EXISTS idx_restaurant_orders_wa_chat ON restaurant_orders(whatsapp_chat_id);
                ALTER TABLE restaurant_orders ADD COLUMN IF NOT EXISTS whatsapp_session VARCHAR(100);

                ALTER TABLE clinic_appointments ADD COLUMN IF NOT EXISTS whatsapp_chat_id VARCHAR(100);
                CREATE INDEX IF NOT EXISTS idx_clinic_appointments_wa_chat ON clinic_appointments(whatsapp_chat_id);

                ALTER TABLE restaurant_reservations ADD COLUMN IF NOT EXISTS whatsapp_chat_id VARCHAR(100);
                CREATE INDEX IF NOT EXISTS idx_restaurant_reservations_wa_chat ON restaurant_reservations(whatsapp_chat_id);
            """))
            conn.commit()
    except Exception:
        pass
    yield

app = FastAPI(
    title="Multi-Tenant AI Receptionist API",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend dashboards & external widget embeds
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Static Directory for widget.js script and generated TTS audio replies
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
audio_dir = os.path.join(static_dir, "audio")
os.makedirs(audio_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")
app.mount("/api/static", StaticFiles(directory=static_dir), name="api_static")

# Include Routers
app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(clinic.router)
app.include_router(restaurant.router)
app.include_router(widget.router)
app.include_router(leads.router)
app.include_router(whatsapp.router)
app.include_router(waha.router)

@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "receptionist-backend"}
