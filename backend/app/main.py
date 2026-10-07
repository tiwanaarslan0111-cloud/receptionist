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
                ALTER TABLE users ADD COLUMN IF NOT EXISTS hashed_password TEXT;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'business_admin';
                ALTER TABLE users ADD COLUMN IF NOT EXISTS business_id UUID;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
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
