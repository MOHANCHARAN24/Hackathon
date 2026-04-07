from typing import List, Optional

from pydantic import BaseModel


class SourceDoc(BaseModel):
    filename: str
    page: int
    snippet: str
    topic: str = "general"
    confidence: float = 0.0


class ChatRequest(BaseModel):
    message: str
    session_id: str
    language: str = "en"
    module: Optional[str] = None
    student_profile: Optional[dict] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceDoc]
    sentiment: str
    mental_health_triggered: bool
    crisis_triggered: bool
    is_answered: bool
    confidence: float
    session_id: str
    message_id: str
    response_time_ms: int


class FeedbackRequest(BaseModel):
    message_id: str
    session_id: str
    rating: int


class ApplicationStatusRequest(BaseModel):
    application_id: str


class AppointmentBookingRequest(BaseModel):
    session_id: str
    student_name: str = "Student"
    email: str = "not-provided"
    phone: str = "not-provided"
    preferred_date: str
    preferred_time: str = "10:00 AM"
    reason: str = "Counseling appointment"


class StudentProfile(BaseModel):
    name: str = "Student"
    department: str = ""
    year: str = ""
    roll_number: str = ""


class AdminStatsResponse(BaseModel):
    total_queries: int
    answered_count: int
    unanswered_count: int
    positive_feedback: int
    negative_feedback: int
    satisfaction_score: float
    module_distribution: dict
    top_unanswered: List[dict]
    recent_negative: List[dict]
    avg_response_time_ms: float
    queries_today: int
    queries_this_week: int
    queries_by_day: List[dict] = []


class DocumentInfo(BaseModel):
    filename: str
    topic: str
    chunk_count: int
    file_size_kb: float
    indexed_at: str
