from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional, Union

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/receptionist_db"
    ADMIN_SECRET_KEY: str = "admin_master_secret_key_change_me"
    JWT_SECRET: str = "super_secret_jwt_key_for_client_dashboards_12345"
    
    # LLM Provider Configuration
    LLM_PROVIDER: str = "groq"  # options: "groq" or "openai"
    GROQ_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # WhatsApp Cloud API Configuration
    ENABLE_META_CLOUD_API: bool = False
    WHATSAPP_VERIFY_TOKEN: str = "receptionist_meta_verify_token_123"
    WHATSAPP_ACCESS_TOKEN: Optional[str] = None
    WHATSAPP_PHONE_NUMBER_ID: Optional[str] = None
    
    # WAHA (WhatsApp HTTP API) Configuration
    WAHA_BASE_URL: str = "http://waha:3000"
    # Public/Internal URL where WAHA delivers webhooks to FastAPI:
    WAHA_WEBHOOK_URL: str = "http://backend:8000/api/business/whatsapp/webhook"
    WAHA_API_KEY: Optional[str] = None
    DEFAULT_BUSINESS_ID: Union[int, str] = 1
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
