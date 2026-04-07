import time
import uuid

from models import ChatResponse


async def handle_crisis(message: str, session_id: str, language: str = "en") -> ChatResponse:
    start_time = time.time()
    _ = message
    _ = language

    crisis_answer = """I'm very concerned about you right now.
Please reach out immediately - you don't have to face this alone:

- iCall: 9152987821
- Vandrevala Foundation (24x7): 1860-2662-345
- AASRA (24x7): 9820466627
- On-campus counseling: +91-863-2344700

Please talk to someone right now. You matter."""

    return ChatResponse(
        answer=crisis_answer,
        sources=[],
        sentiment="crisis",
        mental_health_triggered=True,
        crisis_triggered=True,
        is_answered=True,
        confidence=1.0,
        session_id=session_id,
        message_id=str(uuid.uuid4())[:8],
        response_time_ms=int((time.time() - start_time) * 1000),
    )
