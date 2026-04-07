import os

from dotenv import load_dotenv

load_dotenv()


def _csv_env(name: str, default: str = ""):
    raw = os.getenv(name, default)
    return [item.strip() for item in raw.split(",") if item.strip()]

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_MODEL = "gemini-1.5-flash"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHROMA_PERSIST_PATH = os.getenv("CHROMA_PERSIST_PATH", "./vectorstore")
DOCS_PATH = os.getenv("DOCS_PATH", "./docs")
CHUNK_SIZE = 600
CHUNK_OVERLAP = 80
TOP_K_RETRIEVAL = 3
FETCH_K = 20
LAMBDA_MULT = 0.7
MAX_HISTORY_PAIRS = 4
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "./feedback.db")
APP_NAME = "CampusAI"
COLLEGE_NAME = "Vignan University (VFSTR)"
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
STRICT_STARTUP_VALIDATION = (
    os.getenv("STRICT_STARTUP_VALIDATION", "").strip().lower() in {"1", "true", "yes"}
    or APP_ENV == "production"
)
CORS_ORIGINS = _csv_env(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
CONFIDENCE_THRESHOLD = 0.75
CACHE_TTL_SECONDS = 3600
MAX_QUERY_LENGTH = 500
RATE_LIMIT_PER_MINUTE = 30

DISTRESS_KEYWORDS = [
    "stressed",
    "depressed",
    "anxious",
    "overwhelmed",
    "hopeless",
    "failing",
    "cant cope",
    "breakdown",
    "alone",
    "scared",
    "give up",
    "mental",
    "suicide",
    "crying",
    "lonely",
    "helpless",
    "worthless",
    "panic",
    "afraid",
    "desperate",
    "exhausted",
    "no point",
    "end it",
    "cant go on",
    "hate myself",
]

CRISIS_KEYWORDS = [
    "suicide",
    "end my life",
    "kill myself",
    "want to die",
    "no reason to live",
    "cant go on",
    "end it all",
]

TOPIC_MAP = {
    "fee": "financial",
    "scholar": "financial",
    "pay": "financial",
    "tuition": "financial",
    "cost": "financial",
    "refund": "financial",
    "hostel": "campus",
    "transport": "campus",
    "bus": "campus",
    "library": "campus",
    "sports": "campus",
    "canteen": "campus",
    "exam": "academic",
    "regulation": "academic",
    "calendar": "academic",
    "course": "academic",
    "credit": "academic",
    "result": "academic",
    "attendance": "academic",
    "placement": "academic",
    "moodle": "academic",
    "admission": "admission",
    "program": "admission",
    "ug": "admission",
    "pg": "admission",
    "btech": "admission",
    "vsat": "admission",
    "grievance": "support",
    "counsel": "support",
    "anti": "support",
    "contact": "support",
    "mental": "support",
    "health": "support",
    "quick_reference": "all",
    "vignan_reference": "all",
}
