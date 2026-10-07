import httpx
from typing import Tuple
from openai import OpenAI
from app.config import settings

def get_llm_client() -> Tuple[OpenAI, str]:
    """
    Returns an initialized OpenAI-compatible client and the target model name
    based on the configured LLM_PROVIDER ('groq' or 'openai').
    """
    provider = settings.LLM_PROVIDER.lower().strip()
    
    if provider == "groq":
        api_key = settings.GROQ_API_KEY
        if not api_key or api_key.startswith("your_groq_api_key"):
            raise ValueError(
                "GROQ_API_KEY is not configured. Please set GROQ_API_KEY in your .env file."
            )
        client = OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
            http_client=httpx.Client()
        )
        return client, settings.GROQ_MODEL
        
    elif provider == "openai":
        api_key = settings.OPENAI_API_KEY
        if not api_key or api_key.startswith("your_openai_api_key"):
            raise ValueError(
                "OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY in your .env file."
            )
        client = OpenAI(
            api_key=api_key,
            http_client=httpx.Client()
        )
        return client, settings.OPENAI_MODEL
        
    else:
        raise ValueError(
            f"Unsupported LLM_PROVIDER '{settings.LLM_PROVIDER}'. Choose either 'groq' or 'openai'."
        )
