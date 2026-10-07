import json
import logging
from typing import Dict, Any, List, Optional
from uuid import UUID
import datetime as dt
from datetime import datetime, date, time
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models import (
    Business,
    Doctor,
    DoctorSlot,
    ClinicAppointment,
    RestaurantTable,
    MenuItem,
    RestaurantReservation
)
from app.services.llm_client import get_llm_client

logger = logging.getLogger(__name__)

# ==================== CONVERSATION SESSION STORE ====================
# In-memory dictionary storing recent turns per business tenant session:
# Key format: f"{business_id}:{session_id}"
SESSION_STORE: Dict[str, List[Dict[str, Any]]] = {}
session_history = SESSION_STORE  # Alias for backward compatibility

def trim_session_history(messages: List[Dict[str, Any]], max_messages: int = 15) -> List[Dict[str, Any]]:
    """
    Trims session messages to keep up to max_messages plus system prompt,
    ensuring that the trimmed slice never starts on an orphan tool or assistant tool_calls message.
    """
    if len(messages) <= max_messages + 1:
        return messages

    system_msg = messages[0]
    tail = messages[-max_messages:]

    # Ensure the slice does not start in the middle of a tool call sequence
    while tail and (tail[0].get("role") == "tool" or (tail[0].get("role") == "assistant" and tail[0].get("tool_calls"))):
        tail = tail[1:]

    return [system_msg] + tail

def get_session_history(session_key: str, system_prompt: str) -> List[Dict[str, Any]]:
    if session_key not in SESSION_STORE:
        SESSION_STORE[session_key] = [{"role": "system", "content": system_prompt}]
    else:
        # Keep system prompt updated with current dynamic time/date
        SESSION_STORE[session_key][0] = {"role": "system", "content": system_prompt}
        # Keep the last 15 messages so the agent never forgets details mentioned in earlier turns
        SESSION_STORE[session_key] = trim_session_history(SESSION_STORE[session_key], max_messages=15)

    return SESSION_STORE[session_key]

# ==================== TIME & DATE HELPERS ====================

def parse_time_string(s: str) -> time:
    s = s.strip()
    for fmt in ("%H:%M:%S", "%H:%M", "%I:%M %p", "%I:%M%p", "%I %p", "%I%p"):
        try:
            return datetime.strptime(s, fmt).time()
        except ValueError:
            continue
    return time.fromisoformat(s)

def parse_date_string(s: str) -> date:
    s_clean = s.strip().lower()
    today = date.today()
    if s_clean in ("today", "aaj"):
        return today
    if s_clean in ("tomorrow", "kal"):
        return today + dt.timedelta(days=1)
    if s_clean in ("day after tomorrow", "parso", "parson"):
        return today + dt.timedelta(days=2)
    iso_candidate = s.strip().split(" ")[0].split("(")[0].strip()
    return date.fromisoformat(iso_candidate)

# ==================== SYSTEM PROMPT BUILDER ====================

VOICE_CAPABILITY_PROMPT = """
CAPABILITIES & MODALITY RULES:
- You are a fully multimodal AI receptionist equipped with real-time bidirectional voice messaging and transcription.
- NEVER state "I cannot send voice messages", "I am a text-based AI", or "I lack audio capabilities".
- When communicating with users who send voice messages or request spoken replies, respond naturally, warmly, and concisely as if speaking to them on a phone call.
- Keep spoken replies under 30 words so that text-to-speech synthesis is snappy, natural, and conversational.
"""

def get_system_prompt(business: Business) -> str:
    now_dt = datetime.now()
    current_date_str = now_dt.strftime("%Y-%m-%d (%A)")
    current_time_str = now_dt.strftime("%I:%M %p")

    if business.business_type == "clinic":
        base_prompt = f"""You are Ayesha, a warm, polite, and efficient bilingual medical receptionist at {business.name}.
Today's Date: {current_date_str}, Current Time: {current_time_str}.
(Use this for relative dates like "aaj", "today", "kal", "tomorrow", "parso").

CRITICAL RULES:
1. SCRIPT & LANGUAGE STRICT MATCHING:
   - If the user uses Latin alphabet (English or Roman Urdu such as "g", "aaj", "doctor chahiye", "kal ki", "theek hai"), YOU MUST REPLY IN ROMAN URDU OR ENGLISH. NEVER USE ARABIC/URDU SCRIPT (اردو رسم الخط) unless the user typed in actual Urdu script characters.
   - Default to polite Roman Urdu when user speaks Roman Urdu (e.g., "Ji bilkul", "Aap ka naam aur number?").

2. MEMORY & NO REDUNDANT QUESTIONS:
   - NEVER ask for information the user has already provided in the conversation history!
   - If the user already told you:
     * Doctor name -> Do NOT ask which doctor they want.
     * Date/Time -> Do NOT ask for date/time again.
     * Name & Phone -> Do NOT ask for name/phone again.
   - If you have: Doctor + Date + Preferred Time:
     * Call `check_doctor_slots` immediately.
     * If a matching slot exists, offer it or book it.
   - If you have: Doctor + Slot + Patient Name + Patient Phone:
     * DO NOT ask another confirmation question! CALL `book_appointment` IMMEDIATELY using tool calls.
     * If symptoms were not given, default `symptoms` to "General Consultation" and complete the booking. Do not block the user.

3. PROACTIVE EXECUTION:
   - Always invoke the database tools (`suggest_doctors`, `check_doctor_slots`, `book_appointment`) instead of speaking hypothetically.
   - Keep responses short (1-2 friendly sentences), professional, and natural.
"""
    else:  # Restaurant
        base_prompt = f"""You are a warm, polite, and efficient bilingual host and reservation specialist at {business.name}.
Today's Date: {current_date_str}, Current Time: {current_time_str}.
(Use this for relative dates like "aaj", "today", "kal", "tomorrow").

CRITICAL RULES:
1. SCRIPT & LANGUAGE STRICT MATCHING:
   - If the user uses Latin alphabet (English or Roman Urdu such as "table chahiye", "menu dikhao", "aaj sham"), YOU MUST REPLY IN ROMAN URDU OR ENGLISH. NEVER USE ARABIC/URDU SCRIPT (اردو رسم الخط) unless the user typed in actual Urdu script characters.
   - Default to polite Roman Urdu when user speaks Roman Urdu (e.g., "Ji bilkul", "Kitne logon ke liye table chahiye?").

2. MEMORY & NO REDUNDANT QUESTIONS:
   - NEVER ask for information the user has already provided in the conversation history!
   - If user asks about dishes or menu, call `get_menu` immediately.
   - If you have: Date + Time + Party Size:
     * Call `check_table_availability` immediately.
   - If you have: Date + Time + Party Size + Customer Name + Phone:
     * DO NOT ask another confirmation question! CALL `reserve_table_and_order` IMMEDIATELY using tool calls.

3. PROACTIVE EXECUTION:
   - Always invoke the database tools (`get_menu`, `check_table_availability`, `reserve_table_and_order`) instead of speaking hypothetically.
   - Keep responses short (1-2 friendly sentences), professional, and natural.
"""

    return f"{base_prompt.strip()}\n{VOICE_CAPABILITY_PROMPT}"

# ==================== TOOL DEFINITIONS ====================

CLINIC_TOOLS = [
    {
        "type": "function",
        "function": {
          "name": "suggest_doctors",
          "description": "Find and suggest suitable doctors for the clinic based on patient symptoms or medical specialty.",
          "parameters": {
            "type": "object",
            "properties": {
              "symptom": {
                "type": "string",
                "description": "The symptom, condition, or specialty requested (e.g., flu, fever, back pain, cardiology, dentistry)"
              }
            },
            "required": ["symptom"]
          }
        }
    },
    {
        "type": "function",
        "function": {
          "name": "check_doctor_slots",
          "description": "Check available (unbooked) appointment slots for a specific doctor on a given date.",
          "parameters": {
            "type": "object",
            "properties": {
              "doctor_id": {
                "type": "string",
                "description": "The UUID of the doctor"
              },
              "date": {
                "type": "string",
                "description": "The appointment date in YYYY-MM-DD format"
              }
            },
            "required": ["doctor_id", "date"]
          }
        }
    },
    {
        "type": "function",
        "function": {
          "name": "book_appointment",
          "description": "Book a specific appointment slot for a patient with atomic database locking.",
          "parameters": {
            "type": "object",
            "properties": {
              "doctor_id": {
                "type": "string",
                "description": "The UUID of the doctor"
              },
              "slot_id": {
                "type": "string",
                "description": "The UUID of the available slot to book"
              },
              "patient_name": {
                "type": "string",
                "description": "Full name of the patient"
              },
              "patient_phone": {
                "type": "string",
                "description": "Contact phone number of the patient"
              },
              "symptoms": {
                "type": "string",
                "description": "Reported symptoms or reason for visit"
              }
            },
            "required": ["doctor_id", "slot_id", "patient_name", "patient_phone"]
          }
        }
    }
]

RESTAURANT_TOOLS = [
    {
        "type": "function",
        "function": {
          "name": "get_menu",
          "description": "Get available restaurant menu items, optionally filtered by food category.",
          "parameters": {
            "type": "object",
            "properties": {
              "category": {
                "type": "string",
                "description": "Optional category filter (e.g. Starters, Mains, Pastas, Desserts, Drinks)"
              }
            }
          }
        }
    },
    {
        "type": "function",
        "function": {
          "name": "check_table_availability",
          "description": "Check if the restaurant has table capacity for the requested party size on a specific date and time.",
          "parameters": {
            "type": "object",
            "properties": {
              "party_size": {
                "type": "integer",
                "description": "Number of guests"
              },
              "date": {
                "type": "string",
                "description": "Reservation date in YYYY-MM-DD format"
              },
              "time": {
                "type": "string",
                "description": "Reservation time (e.g. 19:30 or 20:00)"
              }
            },
            "required": ["party_size", "date", "time"]
          }
        }
    },
    {
        "type": "function",
        "function": {
          "name": "reserve_table_and_order",
          "description": "Reserve a table and optionally place a pre-order of food items.",
          "parameters": {
            "type": "object",
            "properties": {
              "customer_name": {
                "type": "string",
                "description": "Full name of customer"
              },
              "customer_phone": {
                "type": "string",
                "description": "Contact phone number of customer"
              },
              "date": {
                "type": "string",
                "description": "Reservation date in YYYY-MM-DD format"
              },
              "time": {
                "type": "string",
                "description": "Reservation time (e.g. 19:30 or 20:00)"
              },
              "party_size": {
                "type": "integer",
                "description": "Number of guests"
              },
              "order_items": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "item_name": {"type": "string"},
                    "quantity": {"type": "integer"}
                  },
                  "required": ["item_name", "quantity"]
                },
                "description": "List of dishes and quantities pre-ordered by customer (empty list if table reservation only)"
              }
            },
            "required": ["customer_name", "customer_phone", "date", "time", "party_size"]
          }
        }
    }
]

# ==================== TOOL EXECUTION IMPLEMENTATIONS ====================

def execute_suggest_doctors(business_id: UUID, db: Session, symptom: str) -> Dict[str, Any]:
    doctors = db.query(Doctor).filter(Doctor.business_id == business_id).all()
    if not doctors:
        return {"doctors": [], "message": "No doctors currently registered at this clinic."}

    s_clean = symptom.lower().strip()
    matching_doctors = []
    
    for doc in doctors:
        specialty_match = s_clean in doc.specialty.lower()
        symptom_match = any(s_clean in sym.lower() or sym.lower() in s_clean for sym in (doc.symptoms_treated or []))
        if specialty_match or symptom_match:
            matching_doctors.append({
                "doctor_id": str(doc.id),
                "name": doc.name,
                "specialty": doc.specialty,
                "symptoms_treated": doc.symptoms_treated,
                "fee": float(doc.fee)
            })

    # If no specific keyword match found, return all available doctors with their specialties
    if not matching_doctors:
        return {
            "doctors": [
                {
                    "doctor_id": str(doc.id),
                    "name": doc.name,
                    "specialty": doc.specialty,
                    "symptoms_treated": doc.symptoms_treated,
                    "fee": float(doc.fee)
                }
                for doc in doctors
            ],
            "message": f"No doctor directly matched '{symptom}'. Here are all doctors available at our clinic:"
        }

    return {"doctors": matching_doctors}

def execute_check_doctor_slots(business_id: UUID, db: Session, doctor_id: str, date: str) -> Dict[str, Any]:
    try:
        doc_uuid = UUID(doctor_id)
        slot_date = parse_date_string(date)
    except ValueError as e:
        return {"error": f"Invalid doctor ID or date format: {str(e)}"}

    doctor = db.query(Doctor).filter(
        Doctor.id == doc_uuid,
        Doctor.business_id == business_id
    ).first()
    if not doctor:
        return {"error": "Doctor not found in this clinic"}

    # If doctor is unavailable today, do not return slots for today
    if slot_date == dt.date.today() and getattr(doctor, "is_available_today", True) is False:
        doc_title = doctor.name if doctor.name.startswith("Dr.") else f"Dr. {doctor.name}"
        return {
            "doctor_name": doctor.name,
            "specialty": doctor.specialty,
            "date": str(slot_date),
            "available_slots": [],
            "count": 0,
            "message": f"{doc_title} is currently unavailable for consultations today."
        }

    slots = (
        db.query(DoctorSlot)
        .filter(
            DoctorSlot.business_id == business_id,
            DoctorSlot.doctor_id == doc_uuid,
            DoctorSlot.slot_date == slot_date,
            DoctorSlot.is_booked == False,
            DoctorSlot.is_disabled == False
        )
        .order_by(DoctorSlot.start_time.asc())
        .all()
    )

    return {
        "doctor_name": doctor.name,
        "specialty": doctor.specialty,
        "date": str(slot_date),
        "available_slots": [
            {
                "slot_id": str(s.id),
                "start_time": s.start_time.strftime("%H:%M"),
                "end_time": s.end_time.strftime("%H:%M")
            }
            for s in slots
        ]
    }

def execute_book_appointment(
    business_id: UUID,
    db: Session,
    doctor_id: str,
    slot_id: str,
    patient_name: str,
    patient_phone: str,
    symptoms: str = ""
) -> Dict[str, Any]:
    try:
        doc_uuid = UUID(doctor_id)
        slot_uuid = UUID(slot_id)
    except ValueError:
        return {"error": "Invalid doctor_id or slot_id UUID format"}

    # Atomic slot lock with with_for_update()
    slot = (
        db.query(DoctorSlot)
        .filter(
            DoctorSlot.id == slot_uuid,
            DoctorSlot.business_id == business_id,
            DoctorSlot.doctor_id == doc_uuid,
            DoctorSlot.is_booked == False,
            DoctorSlot.is_disabled == False
        )
        .with_for_update()
        .first()
    )

    if not slot:
        return {"error": "Slot is already booked or invalid for this doctor."}

    doctor = db.query(Doctor).filter(
        Doctor.id == doc_uuid,
        Doctor.business_id == business_id
    ).first()
    if not doctor:
        return {"error": "Doctor not found in this clinic."}

    if slot.slot_date == dt.date.today() and getattr(doctor, "is_available_today", True) is False:
        doc_title = doctor.name if doctor.name.startswith("Dr.") else f"Dr. {doctor.name}"
        return {"error": f"{doc_title} is currently unavailable for consultations today."}

    # Lock and book slot
    slot.is_booked = True
    appointment = ClinicAppointment(
        business_id=business_id,
        doctor_id=doc_uuid,
        slot_id=slot_uuid,
        patient_name=patient_name.strip(),
        patient_phone=patient_phone.strip(),
        symptoms_reported=symptoms.strip() if symptoms else None
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return {
        "status": "confirmed",
        "appointment_id": str(appointment.id),
        "doctor_name": doctor.name,
        "specialty": doctor.specialty,
        "date": str(slot.slot_date),
        "start_time": slot.start_time.strftime("%H:%M"),
        "end_time": slot.end_time.strftime("%H:%M"),
        "patient_name": patient_name,
        "patient_phone": patient_phone,
        "consultation_fee": float(doctor.fee)
    }

def execute_get_menu(business_id: UUID, db: Session, category: Optional[str] = None) -> Dict[str, Any]:
    query = db.query(MenuItem).filter(
        MenuItem.business_id == business_id,
        MenuItem.is_available == True
    )
    if category:
        query = query.filter(MenuItem.category.ilike(f"%{category.strip()}%"))

    items = query.order_by(MenuItem.category.asc(), MenuItem.name.asc()).all()
    return {
        "menu_items": [
            {
                "id": str(item.id),
                "name": item.name,
                "category": item.category,
                "price": float(item.price)
            }
            for item in items
        ]
    }

def execute_check_table_availability(
    business_id: UUID,
    db: Session,
    party_size: int,
    date: str,
    time: str
) -> Dict[str, Any]:
    try:
        res_date = parse_date_string(date)
        res_time = parse_time_string(time)
    except ValueError as e:
        return {"error": f"Invalid date or time format: {str(e)}"}

    # Find tables that can accommodate party_size
    tables = (
        db.query(RestaurantTable)
        .filter(
            RestaurantTable.business_id == business_id,
            RestaurantTable.capacity >= party_size
        )
        .all()
    )

    if not tables:
        return {
            "available": False,
            "message": f"Sorry, we do not have tables with capacity for {party_size} guests."
        }

    # Count existing reservations on that date
    existing_res = (
        db.query(RestaurantReservation)
        .filter(
            RestaurantReservation.business_id == business_id,
            RestaurantReservation.booking_date == res_date
        )
        .count()
    )

    total_eligible_tables = len(tables)
    if existing_res >= total_eligible_tables * 3:
        return {
            "available": False,
            "message": f"Sorry, all tables are fully booked for {res_date} around {res_time.strftime('%H:%M')}."
        }

    return {
        "available": True,
        "date": str(res_date),
        "time": res_time.strftime("%H:%M"),
        "party_size": party_size,
        "message": "Table is available for booking."
    }

def execute_reserve_table_and_order(
    business_id: UUID,
    db: Session,
    customer_name: str,
    customer_phone: str,
    date: str,
    time: str,
    party_size: int,
    order_items: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    try:
        res_date = parse_date_string(date)
        res_time = parse_time_string(time)
    except ValueError as e:
        return {"error": f"Invalid date or time format: {str(e)}"}

    # Verify table availability
    avail_check = execute_check_table_availability(business_id, db, party_size, date, time)
    if not avail_check.get("available", False):
        return avail_check

    # Process and validate pre-order items if present
    processed_items = []
    total_bill = 0.0

    if order_items:
        for oi in order_items:
            raw_name = oi.get("item_name", "").strip()
            qty = int(oi.get("quantity", 1))
            if not raw_name:
                continue

            menu_item = (
                db.query(MenuItem)
                .filter(
                    MenuItem.business_id == business_id,
                    MenuItem.name.ilike(f"%{raw_name}%"),
                    MenuItem.is_available == True
                )
                .first()
            )
            if menu_item:
                price = float(menu_item.price)
                subtotal = price * qty
                total_bill += subtotal
                processed_items.append({
                    "item_id": str(menu_item.id),
                    "name": menu_item.name,
                    "price": price,
                    "quantity": qty,
                    "subtotal": subtotal
                })
            else:
                processed_items.append({
                    "name": raw_name,
                    "quantity": qty
                })

    reservation = RestaurantReservation(
        business_id=business_id,
        customer_name=customer_name.strip(),
        customer_phone=customer_phone.strip(),
        booking_date=res_date,
        booking_time=res_time,
        party_size=party_size,
        order_items=processed_items
    )
    db.add(reservation)
    db.commit()
    db.refresh(reservation)

    return {
        "status": "confirmed",
        "reservation_id": str(reservation.id),
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "date": str(res_date),
        "time": res_time.strftime("%H:%M"),
        "party_size": party_size,
        "order_items": processed_items,
        "estimated_total": round(total_bill, 2)
    }

# ==================== MAIN CHAT ORCHESTRATOR ====================

def process_chat(
    message: str,
    session_id: str,
    business: Business,
    db: Session
) -> Dict[str, Any]:
    """
    Orchestrates the chat turn:
    1. Prepares session history with dynamic system prompt.
    2. Runs LLM client with appropriate tools.
    3. Handles tool call executions and tool responses.
    4. Returns conversational response text and any booking action taken.
    """
    client, model_name = get_llm_client()
    system_prompt = get_system_prompt(business)
    session_key = f"{business.id}:{session_id}"
    history = get_session_history(session_key, system_prompt)

    # Append user turn
    history.append({"role": "user", "content": message})

    tools = CLINIC_TOOLS if business.business_type == "clinic" else RESTAURANT_TOOLS

    action_taken: Optional[str] = None
    booking_details: Optional[Dict[str, Any]] = None

    # Handle multi-step tool calling loop (max 5 iterations)
    max_turns = 5
    turn_count = 0

    while turn_count < max_turns:
        turn_count += 1

        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=history,
                tools=tools,
                tool_choice="auto"
            )
        except Exception as e:
            err_str = str(e).lower()
            if ("model_not_found" in err_str or "over capacity" in err_str) and model_name != "openai/gpt-oss-20b":
                logger.warning(f"Model '{model_name}' unavailable ({e}). Falling back to 'openai/gpt-oss-20b'.")
                model_name = "openai/gpt-oss-20b"
                response = client.chat.completions.create(
                    model=model_name,
                    messages=history,
                    tools=tools,
                    tool_choice="auto"
                )
            else:
                raise

        choice = response.choices[0]
        assistant_msg = choice.message

        # Format assistant message for history
        assistant_dict: Dict[str, Any] = {
            "role": "assistant",
            "content": assistant_msg.content or ""
        }

        if assistant_msg.tool_calls:
            sanitized_tool_calls = []
            for tc in assistant_msg.tool_calls:
                raw_name = tc.function.name or ""
                clean_name = raw_name.split("<|")[0].split(" ")[0].strip()
                sanitized_tool_calls.append({
                    "id": tc.id,
                    "type": tc.type,
                    "function": {
                        "name": clean_name,
                        "arguments": tc.function.arguments
                    }
                })
            assistant_dict["tool_calls"] = sanitized_tool_calls
            history.append(assistant_dict)

            # Execute all tool calls
            for tool_call in assistant_msg.tool_calls:
                raw_name = tool_call.function.name or ""
                clean_name = raw_name.split("<|")[0].split(" ")[0].strip()
                try:
                    fn_args = json.loads(tool_call.function.arguments)
                except Exception:
                    fn_args = {}

                tool_result: Dict[str, Any] = {}

                if clean_name == "suggest_doctors":
                    tool_result = execute_suggest_doctors(
                        business.id, db, fn_args.get("symptom", "")
                    )
                elif clean_name == "check_doctor_slots":
                    tool_result = execute_check_doctor_slots(
                        business.id, db, fn_args.get("doctor_id", ""), fn_args.get("date", "")
                    )
                elif clean_name == "book_appointment":
                    symptoms = fn_args.get("symptoms", "")
                    if not symptoms or not str(symptoms).strip():
                        symptoms = "General Consultation"
                    tool_result = execute_book_appointment(
                        business.id,
                        db,
                        doctor_id=str(fn_args.get("doctor_id", "")),
                        slot_id=str(fn_args.get("slot_id", "")),
                        patient_name=str(fn_args.get("patient_name", "")),
                        patient_phone=str(fn_args.get("patient_phone", "")),
                        symptoms=symptoms
                    )
                    if tool_result.get("status") == "confirmed":
                        action_taken = "appointment_booked"
                        booking_details = tool_result

                elif clean_name == "get_menu":
                    tool_result = execute_get_menu(
                        business.id, db, fn_args.get("category")
                    )
                elif clean_name == "check_table_availability":
                    tool_result = execute_check_table_availability(
                        business.id,
                        db,
                        party_size=int(fn_args.get("party_size", 1)),
                        date=fn_args.get("date", ""),
                        time=fn_args.get("time", "")
                    )
                elif clean_name == "reserve_table_and_order":
                    tool_result = execute_reserve_table_and_order(
                        business.id,
                        db,
                        customer_name=fn_args.get("customer_name", ""),
                        customer_phone=fn_args.get("customer_phone", ""),
                        date=fn_args.get("date", ""),
                        time=fn_args.get("time", ""),
                        party_size=int(fn_args.get("party_size", 1)),
                        order_items=fn_args.get("order_items")
                    )
                    if tool_result.get("status") == "confirmed":
                        action_taken = "table_reserved"
                        booking_details = tool_result
                else:
                    tool_result = {"error": f"Unknown tool: {clean_name}"}

                # Append tool response
                history.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": clean_name,
                    "content": json.dumps(tool_result)
                })

            # Continue loop to allow LLM to generate reply based on tool results
            continue

        else:
            # Final text response from assistant
            history.append(assistant_dict)
            SESSION_STORE[session_key] = history
            return {
                "text": assistant_msg.content or "",
                "action_taken": action_taken,
                "booking_details": booking_details
            }

    SESSION_STORE[session_key] = history
    return {
        "text": "I have processed your request. Please let me know if you need anything else.",
        "action_taken": action_taken,
        "booking_details": booking_details
    }
