import os
import re
import uuid
import logging
from typing import Optional
import edge_tts

logger = logging.getLogger(__name__)

# Base static audio directory: backend/static/audio/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUDIO_DIR = os.path.join(BASE_DIR, "static", "audio")
os.makedirs(AUDIO_DIR, exist_ok=True)

def detect_voice(text: str) -> str:
    """
    Inspects text:
    If it contains Urdu/Perso-Arabic Unicode characters (range \u0600 - \u06FF),
    selects 'ur-PK-UzmaNeural'.
    Otherwise, defaults to 'en-US-JennyNeural'.
    """
    for char in text:
        if "\u0600" <= char <= "\u06FF":
            return "ur-PK-UzmaNeural"
    return "en-US-JennyNeural"

def clean_text_for_tts(text: str) -> str:
    """
    Strips raw markdown symbols (like tables, asterisks, brackets, hashes)
    so the synthesized neural voice sounds fluid and conversational.
    """
    # Remove markdown code blocks
    cleaned = re.sub(r"```[\s\S]*?```", "", text)
    # Remove table separator lines like |---|---|
    cleaned = re.sub(r"\|[-:\s|]+\|", "", cleaned)
    # Replace table pipes with spaces
    cleaned = cleaned.replace("|", " ")
    # Remove bold/italic asterisks and underscores
    cleaned = re.sub(r"[*_]{1,3}", "", cleaned)
    # Remove markdown headers #, ##, etc.
    cleaned = re.sub(r"^#+\s*", "", cleaned, flags=re.MULTILINE)
    # Remove markdown links [text](url) -> text
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", cleaned)
    # Clean multiple spaces and newlines
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned

async def generate_audio(text: str, filename_prefix: str = "reply") -> Optional[str]:
    """
    Generates an MP3 audio file using edge-tts and saves it in backend/static/audio/.
    Returns relative URL path: /static/audio/<filename>.mp3
    If generation fails, logs warning and returns None without blocking response.
    """
    if not text or not text.strip():
        return None

    cleaned_text = clean_text_for_tts(text)
    if not cleaned_text:
        cleaned_text = text.strip()

    voice = detect_voice(cleaned_text)
    clean_prefix = re.sub(r"[^a-zA-Z0-9_-]", "_", filename_prefix)
    unique_id = uuid.uuid4().hex
    filename = f"{clean_prefix}_{unique_id}.mp3"
    file_path = os.path.join(AUDIO_DIR, filename)

    try:
        communicate = edge_tts.Communicate(cleaned_text, voice)
        await communicate.save(file_path)
        logger.info(f"Generated TTS audio: {filename} using voice {voice}")
        return f"/static/audio/{filename}"
    except Exception as e:
        logger.error(f"Failed to generate TTS audio: {e}", exc_info=True)
        return None
