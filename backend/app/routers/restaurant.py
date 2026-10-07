from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.models import Business, MenuItem, RestaurantTable, RestaurantReservation
from app.schemas import (
    MenuItemCreateRequest,
    MenuItemUpdateAvailabilityRequest,
    MenuItemResponse,
    RestaurantTableCreateRequest,
    RestaurantTableResponse,
    RestaurantReservationResponse
)
from app.deps import get_current_restaurant

router = APIRouter(prefix="/api/restaurant", tags=["Restaurant Management"])

@router.post(
    "/menu",
    response_model=MenuItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a menu item to the restaurant"
)
def create_menu_item(
    payload: MenuItemCreateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    new_item = MenuItem(
        business_id=current_business.id,
        name=payload.name,
        category=payload.category,
        price=payload.price,
        is_available=payload.is_available
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.get(
    "/menu",
    response_model=List[MenuItemResponse],
    summary="List all menu items for the logged-in restaurant"
)
def list_menu_items(
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    items = (
        db.query(MenuItem)
        .filter(MenuItem.business_id == current_business.id)
        .order_by(MenuItem.category.asc(), MenuItem.name.asc())
        .all()
    )
    return items

@router.put(
    "/menu/{item_id}/availability",
    response_model=MenuItemResponse,
    summary="Toggle or set menu item availability"
)
def update_item_availability(
    item_id: UUID,
    payload: Optional[MenuItemUpdateAvailabilityRequest] = None,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    item = (
        db.query(MenuItem)
        .filter(
            MenuItem.id == item_id,
            MenuItem.business_id == current_business.id
        )
        .first()
    )
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Menu item with ID '{item_id}' not found"
        )

    if payload and payload.is_available is not None:
        item.is_available = payload.is_available
    else:
        item.is_available = not item.is_available

    db.commit()
    db.refresh(item)
    return item

@router.post(
    "/tables",
    response_model=RestaurantTableResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a table to the restaurant"
)
def create_table(
    payload: RestaurantTableCreateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    existing = (
        db.query(RestaurantTable)
        .filter(
            RestaurantTable.business_id == current_business.id,
            RestaurantTable.table_number == payload.table_number
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Table '{payload.table_number}' already exists in this restaurant"
        )

    table = RestaurantTable(
        business_id=current_business.id,
        table_number=payload.table_number,
        capacity=payload.capacity
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    return table

@router.get(
    "/tables",
    response_model=List[RestaurantTableResponse],
    summary="List all tables for the logged-in restaurant"
)
def list_tables(
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    tables = (
        db.query(RestaurantTable)
        .filter(RestaurantTable.business_id == current_business.id)
        .order_by(RestaurantTable.table_number.asc())
        .all()
    )
    return tables

@router.get(
    "/reservations",
    response_model=List[RestaurantReservationResponse],
    summary="List all reservations and food orders for this restaurant"
)
def list_reservations(
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    reservations = (
        db.query(RestaurantReservation)
        .filter(RestaurantReservation.business_id == current_business.id)
        .order_by(
            RestaurantReservation.booking_date.desc(),
            RestaurantReservation.booking_time.desc()
        )
        .all()
    )
    return reservations
