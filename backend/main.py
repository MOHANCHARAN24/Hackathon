import os
import time
from typing import Any, Dict, List

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from chat_handler import process_chat, sessions
from config import (
    ADMIN_PASSWORD,
    APP_NAME,
    COLLEGE_NAME,
    CORS_ORIGINS,
    DOCS_PATH,
    GEMINI_API_KEY,
    GROQ_API_KEY,
    STRICT_STARTUP_VALIDATION,
)
from feedback_db import (
    create_appointment,
    get_application_status,
    get_document_list,
    get_stats,
    get_unanswered_questions,
    init_db,
    save_feedback,
)
from handlers.actions import handle_action
from handlers.crisis import handle_crisis
from handlers.transactional import handle_transactional
from ingest import ingest
from models import (
    ApplicationStatusRequest,
    AppointmentBookingRequest,
    ChatRequest,
    ChatResponse,
    FeedbackRequest,
)
from rag_engine import load_vector_store
from router import classify_intent, detect_language
from sentiment import analyze_sentiment

app = FastAPI(title=APP_NAME)
vectorstore = None

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


MODULES: List[Dict[str, Any]] = [
    {
        "id": "admission",
        "name": "Admission",
        "icon": "🎓",
        "description": "Programs, eligibility, and admission process",
        "color": "blue",
        "starter_questions": [
            "What are the eligibility criteria for B.Tech?",
            "What documents are needed for admission?",
            "When does the academic year start?",
            "What is VSAT exam information?",
        ],
    },
    {
        "id": "academic",
        "name": "Academic",
        "icon": "📚",
        "description": "Courses, credits, regulations, and exams",
        "color": "purple",
        "starter_questions": [
            "How many credits are required to pass semester?",
            "What is the exam schedule?",
            "How do I register for electives?",
            "Where can I find academic regulations?",
        ],
    },
    {
        "id": "financial",
        "name": "Financial",
        "icon": "💰",
        "description": "Fees, scholarships, and payment support",
        "color": "green",
        "starter_questions": [
            "What is the B.Tech fee structure?",
            "What scholarships are available?",
            "How do I pay tuition fee online?",
            "What is the hostel fee?",
        ],
    },
    {
        "id": "campus",
        "name": "Campus",
        "icon": "🏛️",
        "description": "Hostel, bus transport, library, and facilities",
        "color": "amber",
        "starter_questions": [
            "What are the hostel rules?",
            "What is the bus route schedule?",
            "What library resources are available?",
            "What sports facilities are available?",
        ],
    },
    {
        "id": "support",
        "name": "Support",
        "icon": "💚",
        "description": "Grievance, wellness, counseling, anti-ragging",
        "color": "teal",
        "starter_questions": [
            "How do I raise grievance?",
            "I am feeling stressed about exams",
            "What mental health resources are available?",
            "What is anti-ragging contact?",
        ],
    },
]


def _validate_admin_password(x_admin_password: str):
    if not ADMIN_PASSWORD:
        raise HTTPException(
            status_code=503,
            detail="Admin password is not configured on the server",
        )
    if x_admin_password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")


def _safe_docs_path(filename: str) -> str:
    clean_name = os.path.basename(filename)
    if clean_name != filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    return os.path.join(DOCS_PATH, clean_name)


def _validate_startup_config() -> None:
    if not STRICT_STARTUP_VALIDATION:
        return

    missing = []
    if not ADMIN_PASSWORD:
        missing.append("ADMIN_PASSWORD")
    if not CORS_ORIGINS:
        missing.append("CORS_ORIGINS")
    if not GEMINI_API_KEY and not GROQ_API_KEY:
        missing.append("GEMINI_API_KEY or GROQ_API_KEY")

    if missing:
        raise RuntimeError(
            "Missing required runtime configuration: " + ", ".join(missing)
        )


@app.on_event("startup")
async def startup():
    _validate_startup_config()
    await init_db()
    os.makedirs(DOCS_PATH, exist_ok=True)
    global vectorstore
    vectorstore = load_vector_store()
    print("CampusAI backend ready")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "vectorstore": "loaded",
        "app": APP_NAME,
        "university": "VFSTR",
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if vectorstore is None:
        raise HTTPException(status_code=503, detail="Vectorstore is not loaded")

    # Safety first: handle crisis signals before intent routing.
    language = detect_language(request.message)
    sentiment_result = analyze_sentiment(request.message)
    if sentiment_result["crisis_triggered"]:
        return await handle_crisis(request.message, request.session_id, language)

    intent = classify_intent(request.message)
    if intent == "track_application":
        transactional_response = await handle_transactional(
            request.message, request.session_id
        )
        if transactional_response is not None:
            return transactional_response
    elif intent == "book_appointment":
        action_response = await handle_action(
            request.message,
            request.session_id,
            request.student_profile,
        )
        if action_response is not None:
            return action_response

    return await process_chat(request, vectorstore)


@app.post("/feedback")
async def feedback(request: FeedbackRequest):
    await save_feedback(request.message_id, request.session_id, request.rating)
    return {"status": "saved"}


@app.post("/applications/status")
async def application_status(request: ApplicationStatusRequest):
    details = await get_application_status(request.application_id)
    if not details:
        raise HTTPException(status_code=404, detail="Application ID not found")
    return details


@app.post("/appointments/book")
async def book_appointment(request: AppointmentBookingRequest):
    import uuid

    booking_id = f"BK{uuid.uuid4().hex[:8].upper()}"
    booking = await create_appointment(
        booking_id=booking_id,
        session_id=request.session_id,
        student_name=request.student_name,
        email=request.email,
        phone=request.phone,
        preferred_date=request.preferred_date,
        preferred_time=request.preferred_time,
        reason=request.reason,
    )
    return booking


@app.get("/modules")
async def modules():
    return MODULES


@app.get("/admin/stats")
async def admin_stats(x_admin_password: str = Header(default="")):
    _validate_admin_password(x_admin_password)
    return await get_stats()


@app.post("/admin/reindex")
async def admin_reindex(x_admin_password: str = Header(default="")):
    _validate_admin_password(x_admin_password)

    start = time.time()
    chunks_indexed = await ingest()

    global vectorstore
    vectorstore = load_vector_store()

    return {
        "status": "ok",
        "chunks_indexed": chunks_indexed,
        "time_taken_s": round(time.time() - start, 2),
    }


@app.post("/admin/upload-document")
async def admin_upload_document(
    file: UploadFile = File(...),
    x_admin_password: str = Header(default=""),
):
    _validate_admin_password(x_admin_password)
    os.makedirs(DOCS_PATH, exist_ok=True)

    filepath = _safe_docs_path(file.filename)
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    chunks = await ingest()
    global vectorstore
    vectorstore = load_vector_store()

    return {"status": "ok", "filename": file.filename, "chunks": chunks}


@app.get("/admin/documents")
async def admin_documents(x_admin_password: str = Header(default="")):
    _validate_admin_password(x_admin_password)
    return await get_document_list()


@app.delete("/admin/documents/{filename}")
async def admin_delete_document(filename: str, x_admin_password: str = Header(default="")):
    _validate_admin_password(x_admin_password)

    filepath = _safe_docs_path(filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Document not found")

    os.remove(filepath)
    await ingest()

    global vectorstore
    vectorstore = load_vector_store()

    return {"status": "deleted", "filename": filename}


@app.get("/admin/unanswered")
async def admin_unanswered(x_admin_password: str = Header(default="")):
    _validate_admin_password(x_admin_password)
    return await get_unanswered_questions(limit=20)


@app.post("/chat/clear-history/{session_id}")
async def clear_history(session_id: str):
    sessions.pop(session_id, None)
    return {"status": "cleared"}
