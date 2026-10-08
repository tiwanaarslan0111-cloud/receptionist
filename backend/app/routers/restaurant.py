import logging
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from app.database import get_db, SessionLocal
from app.models import Business, MenuItem, RestaurantTable, RestaurantReservation, RestaurantOrder
from app.schemas import (
    MenuItemCreateRequest,
    MenuItemUpdateAvailabilityRequest,
    MenuItemResponse,
    RestaurantTableCreateRequest,
    RestaurantTableResponse,
    RestaurantReservationResponse,
    RestaurantOrderCreateRequest,
    RestaurantOrderStatusUpdateRequest,
    RestaurantOrderResponse
)
from app.deps import get_current_restaurant
from app.services import waha_service, whatsapp_service

logger = logging.getLogger("restaurant_orders")

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

# ==================== KITCHEN ORDER MANAGEMENT ====================

async def send_order_status_notification(order_id: UUID, new_status: str, business_id: UUID):
    """Sends proactive WhatsApp notification to the customer when the kitchen updates their order status."""
    db: Session = SessionLocal()
    try:
        order = db.query(RestaurantOrder).filter(
            RestaurantOrder.id == order_id,
            RestaurantOrder.business_id == business_id
        ).first()
        business = db.query(Business).filter(Business.id == business_id).first()
        if not order or not business:
            return

        status_messages = {
            "in_kitchen": (
                f"👨‍🍳 *Update from {business.name}*\n"
                f"Aapka order *#{order.order_number}* kitchen mein prepare ho raha hai!\n"
                f"💰 Total: Rs. {float(order.total_amount):,.2f}\n"
                f"Jaise hi ready hoga, hum aapko notify karenge!"
            ),
            "ready": (
                f"🛵 *Update from {business.name}*\n"
                f"Good news! Aapka order *#{order.order_number}* bilkul fresh tayyar ho chuka hai"
                + (f" aur delivery ke liye ready hai (Address: {order.delivery_address})!" if order.order_type == "delivery" and order.delivery_address else " aur pickup ke liye counter par ready hai!")
            ),
            "completed": (
                f"🎉 *Order Completed - {business.name}*\n"
                f"Aapka order *#{order.order_number}* deliver / complete ho chuka hai.\n"
                f"Humare restaurant se order karne ka shukriya! Enjoy your meal! ⭐"
            ),
            "cancelled": (
                f"⚠️ *Order Update - {business.name}*\n"
                f"Aapka order *#{order.order_number}* cancel kiya gaya hai.\n"
                f"Kisi bhi sawal ke liye aap humse rabta kar sakte hain."
            )
        }

        msg = status_messages.get(new_status)
        if not msg:
            return

        customer_phone = order.customer_phone
        clean_num = "".join(c for c in customer_phone if c.isdigit())
        if clean_num.startswith("0") and len(clean_num) == 11:
            clean_num = "92" + clean_num[1:]
        chat_id = customer_phone if customer_phone.endswith("@c.us") else f"{clean_num}@c.us"

        # 1. Try WAHA first
        session_name = waha_service.get_session_name(business.id, business.business_type)
        waha_status = await waha_service.get_waha_session_status(session_name)
        if waha_status != "WORKING" and session_name != f"clinic_{business.id}":
            legacy_name = f"clinic_{business.id}"
            legacy_status = await waha_service.get_waha_session_status(legacy_name)
            if legacy_status == "WORKING":
                session_name = legacy_name
                waha_status = legacy_status
        sent = False
        if waha_status == "WORKING":
            sent = await waha_service.send_waha_text(session_name, chat_id, msg)
            logger.info(f"[Order Notification WAHA] Sent to {chat_id}: {sent}")

        # 2. Fallback to Meta WhatsApp Cloud API if configured
        if not sent and business.inbound_phone_id:
            try:
                await whatsapp_service.send_whatsapp_text(
                    to_phone=clean_num,
                    message=msg,
                    phone_number_id=business.inbound_phone_id
                )
                logger.info(f"[Order Notification Meta API] Sent to {clean_num}")
            except Exception as e:
                logger.warning(f"[Order Notification Meta API error] {e}")

    except Exception as e:
        logger.error(f"[send_order_status_notification error] {e}", exc_info=True)
    finally:
        db.close()


@router.get(
    "/orders",
    response_model=List[RestaurantOrderResponse],
    summary="List all restaurant orders with optional status filter"
)
def list_orders(
    status: Optional[str] = None,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    query = db.query(RestaurantOrder).filter(RestaurantOrder.business_id == current_business.id)
    if status and status.strip() and status != "all":
        query = query.filter(RestaurantOrder.status == status.strip())
    orders = query.order_by(RestaurantOrder.created_at.desc()).all()
    return orders


@router.get(
    "/orders/{order_id}",
    response_model=RestaurantOrderResponse,
    summary="Get single order details"
)
def get_order(
    order_id: UUID,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    order = db.query(RestaurantOrder).filter(
        RestaurantOrder.id == order_id,
        RestaurantOrder.business_id == current_business.id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post(
    "/orders",
    response_model=RestaurantOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manually create an order from the restaurant dashboard"
)
def create_manual_order(
    payload: RestaurantOrderCreateRequest,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    total_bill = 0.0
    for item in payload.items:
        qty = item.get("quantity", 1)
        price = item.get("price", 0.0)
        total_bill += float(price) * float(qty)

    ord_num = f"ORD-{random.randint(1000, 9999)}"
    new_order = RestaurantOrder(
        business_id=current_business.id,
        order_number=ord_num,
        customer_name=payload.customer_name.strip(),
        customer_phone=payload.customer_phone.strip(),
        order_type=payload.order_type,
        delivery_address=payload.delivery_address.strip() if payload.delivery_address else None,
        items=payload.items,
        total_amount=round(total_bill, 2),
        status="received",
        special_instructions=payload.special_instructions.strip() if payload.special_instructions else None,
        channel="dashboard"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    return new_order


@router.patch(
    "/orders/{order_id}/status",
    response_model=RestaurantOrderResponse,
    summary="Update kitchen order status and automatically notify customer via WhatsApp"
)
def update_order_status(
    order_id: UUID,
    payload: RestaurantOrderStatusUpdateRequest,
    background_tasks: BackgroundTasks,
    current_business: Business = Depends(get_current_restaurant),
    db: Session = Depends(get_db)
):
    order = db.query(RestaurantOrder).filter(
        RestaurantOrder.id == order_id,
        RestaurantOrder.business_id == current_business.id
    ).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID '{order_id}' not found"
        )

    previous_status = order.status
    order.status = payload.status
    db.commit()
    db.refresh(order)

    # If status actually changed, dispatch WhatsApp notification
    if previous_status != payload.status:
        background_tasks.add_task(
            send_order_status_notification,
            order.id,
            payload.status,
            current_business.id
        )

    return order
