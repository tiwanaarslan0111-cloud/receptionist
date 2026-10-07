from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from uuid import UUID
from jose import JWTError
from app.database import get_db
from app.models import Business, User
from app.security import decode_access_token

security = HTTPBearer(auto_error=True)

def get_current_business(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Business:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        business_id_str = payload.get("business_id")
        sub_str = payload.get("sub")

        business_id = None
        if business_id_str:
            try:
                business_id = UUID(str(business_id_str))
            except (ValueError, TypeError):
                pass

        # If business_id is not directly resolved, inspect sub
        if not business_id and sub_str:
            try:
                sub_uuid = UUID(str(sub_str))
                # Check if sub is directly a business.id
                biz = db.query(Business).filter(Business.id == sub_uuid).first()
                if biz:
                    return biz
                # Check if sub is a user.id linked to a business
                user = db.query(User).filter(User.id == sub_uuid).first()
                if user and user.business_id:
                    business_id = user.business_id
            except (ValueError, TypeError):
                pass

        if not business_id:
            raise credentials_exception

    except (JWTError, ValueError):
        raise credentials_exception

    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Business account not found or no longer active",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return business

def require_business_type(required_type: str):
    def checker(current_business: Business = Depends(get_current_business)) -> Business:
        if current_business.business_type != required_type:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: this endpoint is reserved for {required_type} accounts"
            )
        return current_business
    return checker

get_current_clinic = require_business_type("clinic")
get_current_restaurant = require_business_type("restaurant")
get_current_business_user = get_current_business
