import uuid
from typing import Dict, List

from langchain_core.documents import Document

from config import GEMINI_API_KEY, GEMINI_MODEL, MAX_HISTORY_PAIRS

# Groq fallback when GEMINI_API_KEY is not configured
import os as _os
_GROQ_API_KEY = _os.getenv("GROQ_API_KEY")
_GROQ_MODEL = _os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
_USE_GROQ = not GEMINI_API_KEY and bool(_GROQ_API_KEY)

try:
    from google import genai as modern_genai

    _HAS_MODERN_GEMINI = True
except Exception:
    _HAS_MODERN_GEMINI = False

from feedback_db import log_query
from models import ChatRequest, ChatResponse
from rag_engine import format_sources, retrieve_with_fallback

sessions: Dict[str, List[dict]] = {}


def check_hallucination(answer: str, docs: List[Document]) -> bool:
    """
    Returns True if answer seems grounded in retrieved docs.
    Simple check: key numbers and capitalized words in answer
    should appear in at least one source document.
    """
    if not docs:
        return False

    combined_context = " ".join([d.page_content for d in docs]).lower()

    import re

    numbers = re.findall(r"\d+", answer)
    if numbers:
        for num in numbers[:3]:
            if num not in combined_context:
                return False
    return True


SYSTEM_PROMPT = """You are CampusAI, the official AI student support
assistant for Vignan's Foundation for Science, Technology and Research
(VFSTR), Vadlamudi, Guntur - 522213, Andhra Pradesh.

RETRIEVED CONTEXT FROM VIGNAN DOCUMENTS:
{context}

CONVERSATION HISTORY:
{history}

LANGUAGE INSTRUCTION: {language_instruction}

STUDENT PROFILE: {student_profile}

================================================================
RULES — FOLLOW WITHOUT EXCEPTION
================================================================

RULE 1 — CONTEXT ONLY:
Answer ONLY from the context documents above.
Never use general knowledge. Never guess fees or dates.

RULE 2 — NEVER GIVE UP EASILY:
Look for related/partial info before saying you don't know.
"What does hostel cost?" = "What is the hostel fee?" — same thing.
Only say "I don't have that" if topic is COMPLETELY absent.

RULE 3 — CRISIS RESPONSE (HIGHEST PRIORITY):
If student expresses suicidal thoughts or severe crisis —
STOP everything. ONLY provide crisis contacts. Do not answer
any other question. Say:
"I'm very concerned about you right now. Please reach out
immediately — you don't have to face this alone:
- iCall: 9152987821
- Vandrevala Foundation (24x7): 1860-2662-345
- AASRA (24x7): 9820466627
- On-campus counseling: +91-863-2344700"

RULE 4 — DISTRESS ACKNOWLEDGMENT:
If student mentions stress/anxiety/overwhelm — acknowledge
feelings FIRST before answering anything else:
"It sounds like you're going through a tough time.
You are not alone — Vignan has support available. 💚"
Then provide counseling contacts AND answer their question.

RULE 5 — MANDATORY LINKS:
When answer covers these topics ALWAYS add link at bottom:
Fee payment     → https://vignan.ac.in/tuitionfeepay.php
Attendance/marks→ http://160.187.169.12/student/
Admissions      → https://admissions.vignan.ac.in/ | 7799427427
Grievance       → https://vignan.ac.in/grievance.php
Anti-ragging    → 1800-180-5522 (24x7 toll-free)
Library         → https://vignan.ac.in/libhome.php
Exams           → https://vignan.ac.in/exam_home.php
Scholarships    → https://vignan.ac.in/curscholorships.php
Hostel          → https://vignan.ac.in/hostel.php
Transport       → https://vignan.ac.in/transport.php
Email           → https://outlook.office365.com/
Moodle          → http://vumoodle.in/
Internship      → https://internship.aicte-india.org/
General         → info@vignan.ac.in | +91-863-2344700

RULE 6 — LINK FORMAT (always at bottom):
---
Useful link: [Label](URL)
Contact: number or email
---

RULE 7 — WARM SIMPLE TONE:
Many students are first-generation learners from rural AP.
Speak warmly, simply, clearly. Use bullet points for lists.
Personalize when profile available: "As a {{year}} {{dept}} student..."

RULE 8 — OUTDATED WARNING:
If answering about fees, dates, or regulations, always add:
"Note: Please verify this at vignan.ac.in as information
may be updated."

RULE 9 — ACCURATE HOSTEL FEES (hardcoded):
Non-AC: Rs.95,000/year + Rs.5,000 registration (incl. GST)
AC: Rs.1,25,000/year + Rs.5,000 registration (incl. GST)
Payable in two semester-wise installments.

RULE 10 — HONEST FALLBACK:
If truly not in context say exactly:
"I don't have that specific information right now.
Please contact: +91-863-2344700 | info@vignan.ac.in"

================================================================
Student Question: {query}
Answer:"""


def build_prompt(
    query,
    docs,
    history,
    language_instruction,
    module=None,
    student_profile=None,
):
    context_parts = []
    for i, doc in enumerate(docs):
        source = doc.metadata.get("source", "vignan_docs")
        topic = doc.metadata.get("topic", "general")
        context_parts.append(
            f"[Doc {i + 1} | Source: {source} | Topic: {topic}]\n{doc.page_content}"
        )
    context = "\n\n".join(context_parts)

    history_text = (
        "\n".join(
            [f"Student: {h['user']}\nCampusAI: {h['bot']}" for h in history[-MAX_HISTORY_PAIRS:]]
        )
        or "No previous conversation."
    )

    profile_text = ""
    if student_profile:
        name = student_profile.get("name", "Student")
        dept = student_profile.get("department", "")
        year = student_profile.get("year", "")
        if dept or year:
            profile_text = f"Student: {name}, {year} year {dept}"

    return SYSTEM_PROMPT.format(
        context=context,
        history=history_text,
        language_instruction=language_instruction,
        student_profile=profile_text or "Not provided",
        query=query,
    )


async def process_chat(request: ChatRequest, vectorstore) -> ChatResponse:
    import time

    start_time = time.time()
    message_id = str(uuid.uuid4())[:8]

    from language_handler import detect_language, get_language_instruction

    language = detect_language(request.message)
    lang_instruction = get_language_instruction(language)

    from sentiment import analyze_sentiment

    sentiment_result = analyze_sentiment(request.message)

    if sentiment_result["crisis_triggered"]:
        crisis_answer = """I'm very concerned about you right now.
Please reach out immediately — you don't have to face this alone:

- **iCall:** 9152987821
- **Vandrevala Foundation (24x7):** 1860-2662-345
- **AASRA (24x7):** 9820466627
- **On-campus counseling:** +91-863-2344700

Please talk to someone right now. You matter. 💚"""
        return ChatResponse(
            answer=crisis_answer,
            sources=[],
            sentiment="crisis",
            mental_health_triggered=True,
            crisis_triggered=True,
            is_answered=True,
            confidence=1.0,
            session_id=request.session_id,
            message_id=message_id,
            response_time_ms=int((time.time() - start_time) * 1000),
        )

    docs, confidence = await retrieve_with_fallback(
        request.message, vectorstore, request.module
    )

    history = sessions.get(request.session_id, [])

    prompt = build_prompt(
        request.message,
        docs,
        history,
        lang_instruction,
        request.module,
        request.student_profile,
    )

    if _USE_GROQ:
        from groq import Groq as _Groq
        _client = _Groq(api_key=_GROQ_API_KEY)
        _resp = _client.chat.completions.create(
            model=_GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1024,
        )
        answer = _resp.choices[0].message.content
    elif GEMINI_API_KEY:
        if _HAS_MODERN_GEMINI:
            client = modern_genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
            )
            answer = (response.text or "").strip()
        else:
            import warnings

            warnings.filterwarnings("ignore", category=FutureWarning, module="google")
            import google.generativeai as legacy_genai

            legacy_genai.configure(api_key=GEMINI_API_KEY)
            model = legacy_genai.GenerativeModel(GEMINI_MODEL)
            response = model.generate_content(prompt)
            answer = response.text
    else:
        answer = (
            "I don't have that specific information right now.\n"
            "Please contact: +91-863-2344700 | info@vignan.ac.in"
        )

    is_grounded = check_hallucination(answer, docs)
    if not is_grounded and confidence < 0.3:
        answer += "\n\n*Note: Please verify this information at vignan.ac.in*"

    not_answered_phrases = [
        "don't have that",
        "not in my knowledge",
        "please contact admin",
        "i cannot find",
        "no information available",
    ]
    is_answered = not any(phrase in answer.lower() for phrase in not_answered_phrases)

    history.append({"user": request.message, "bot": answer})
    sessions[request.session_id] = history[-MAX_HISTORY_PAIRS:]

    sources = format_sources(docs)

    response_time = int((time.time() - start_time) * 1000)

    await log_query(
        session_id=request.session_id,
        message_id=message_id,
        question=request.message,
        answer=answer,
        module=request.module or "general",
        language=language,
        answered=is_answered,
        confidence=confidence,
        response_time_ms=response_time,
    )

    return ChatResponse(
        answer=answer,
        sources=sources,
        sentiment=sentiment_result["sentiment"],
        mental_health_triggered=sentiment_result["mental_health_triggered"],
        crisis_triggered=False,
        is_answered=is_answered,
        confidence=round(confidence, 2),
        session_id=request.session_id,
        message_id=message_id,
        response_time_ms=response_time,
    )
