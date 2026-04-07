import time
import uuid
import re

from feedback_db import get_application_status
from models import ChatResponse


async def handle_transactional(message: str, session_id: str):
    start_time = time.time()
    text = (message or "").lower()
    if not any(word in text for word in ["application", "admission", "track", "status"]):
        return None

    match = re.search(r"(app\d{4,}|\d{6,})", text, flags=re.IGNORECASE)
    if not match:
        answer = (
            "To check your application status, please share your application ID "
            "(example: APP2026001)."
        )
        return ChatResponse(
            answer=answer,
            sources=[],
            sentiment="neutral",
            mental_health_triggered=False,
            crisis_triggered=False,
            is_answered=False,
            confidence=0.7,
            session_id=session_id,
            message_id=str(uuid.uuid4())[:8],
            response_time_ms=int((time.time() - start_time) * 1000),
        )

    app_id = match.group(1).upper()
    if app_id.isdigit():
        app_id = f"APP{app_id}"

    details = await get_application_status(app_id)
    if not details:
        answer = (
            f"I could not find application ID {app_id}. "
            "Please verify the ID or contact admissions at 7799427427."
        )
        return ChatResponse(
            answer=answer,
            sources=[],
            sentiment="neutral",
            mental_health_triggered=False,
            crisis_triggered=False,
            is_answered=False,
            confidence=0.75,
            session_id=session_id,
            message_id=str(uuid.uuid4())[:8],
            response_time_ms=int((time.time() - start_time) * 1000),
        )

    answer = (
        f"Application Status for {details['application_id']}:\n"
        f"- Applicant: {details['applicant_name']}\n"
        f"- Program: {details['program']}\n"
        f"- Current Status: {details['status']}\n"
        f"- Last Updated: {details['last_updated']}\n\n"
        "Useful link: https://admissions.vignan.ac.in/\n"
        "Contact: 7799427427"
    )

    return ChatResponse(
        answer=answer,
        sources=[],
        sentiment="neutral",
        mental_health_triggered=False,
        crisis_triggered=False,
        is_answered=True,
        confidence=0.95,
        session_id=session_id,
        message_id=str(uuid.uuid4())[:8],
        response_time_ms=int((time.time() - start_time) * 1000),
    )
