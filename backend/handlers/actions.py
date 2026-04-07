import time
import uuid
import re
from datetime import datetime, timedelta

from feedback_db import create_appointment
from models import ChatResponse


def _next_working_day() -> str:
    day = datetime.now() + timedelta(days=1)
    while day.weekday() >= 5:
        day += timedelta(days=1)
    return day.strftime("%Y-%m-%d")


async def handle_action(message: str, session_id: str, student_profile: dict = None):
    start_time = time.time()
    text = (message or "").lower()
    if not any(word in text for word in ["book", "appointment", "counsel", "schedule"]):
        return None

    email_match = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", message)
    phone_match = re.search(r"\b(?:\+?91[-\s]?)?[6-9]\d{9}\b", message)
    date_match = re.search(r"\b\d{4}-\d{2}-\d{2}\b", message)
    time_match = re.search(r"\b\d{1,2}(:\d{2})?\s?(am|pm|AM|PM)?\b", message)

    profile = student_profile or {}
    student_name = profile.get("name") or "Student"
    email = (email_match.group(0) if email_match else "not-provided")
    phone = (phone_match.group(0) if phone_match else "not-provided")
    preferred_date = date_match.group(0) if date_match else _next_working_day()
    preferred_time = time_match.group(0) if time_match else "10:00 AM"
    reason = message.strip()[:250]
    booking_id = f"BK{uuid.uuid4().hex[:8].upper()}"

    booking = await create_appointment(
        booking_id=booking_id,
        session_id=session_id,
        student_name=student_name,
        email=email,
        phone=phone,
        preferred_date=preferred_date,
        preferred_time=preferred_time,
        reason=reason,
    )

    answer = (
        "Your counseling appointment is booked.\n"
        f"- Booking ID: {booking['booking_id']}\n"
        f"- Name: {booking['student_name']}\n"
        f"- Date: {booking['preferred_date']}\n"
        f"- Time: {booking['preferred_time']}\n"
        f"- Status: {booking['status']}\n\n"
        "If you need changes, call +91-863-2344700."
    )

    return ChatResponse(
        answer=answer,
        sources=[],
        sentiment="neutral",
        mental_health_triggered=True,
        crisis_triggered=False,
        is_answered=True,
        confidence=0.96,
        session_id=session_id,
        message_id=str(uuid.uuid4())[:8],
        response_time_ms=int((time.time() - start_time) * 1000),
    )
