import logging
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Business
from app.schemas import WidgetChatRequest, WidgetChatResponse
from app.services.ai_agent import process_chat
from app.services.voice_service import generate_audio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/widget", tags=["Public Widget Chat"])

@router.post(
    "/chat",
    response_model=WidgetChatResponse,
    summary="Public AI receptionist chat endpoint for embedded widgets"
)
async def widget_chat(
    payload: WidgetChatRequest,
    x_widget_token: str = Header(..., description="Widget token assigned to the business tenant"),
    db: Session = Depends(get_db)
):
    business = db.query(Business).filter(Business.widget_token == x_widget_token.strip()).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid widget token"
        )

    if not getattr(business, "is_widget_enabled", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The AI Receptionist widget for this establishment has been disabled by the administrator."
        )

    try:
        result = process_chat(
            message=payload.message,
            session_id=payload.session_id,
            business=business,
            db=db
        )

        reply_text = result.get("text", "")
        audio_url = await generate_audio(reply_text, filename_prefix=f"chat_{payload.session_id}")

        return WidgetChatResponse(
            text=reply_text,
            action_taken=result.get("action_taken"),
            booking_details=result.get("booking_details"),
            audio_url=audio_url
        )
    except ValueError as e:
        logger.error(f"Configuration or validation error in AI chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in AI chat processing: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI chat processing failed: {str(e)}"
        )
