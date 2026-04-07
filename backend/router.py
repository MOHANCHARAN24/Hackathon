from langdetect import detect
from sentence_transformers import SentenceTransformer, util

# Reuse MiniLM for lightweight intent routing.
_model = SentenceTransformer("all-MiniLM-L6-v2")

INTENT_EXAMPLES = {
    "distress": [
        "I feel depressed",
        "I want to quit",
        "nobody cares",
        "I'm overwhelmed",
    ],
    "track_application": [
        "application status",
        "track my admission",
        "did I get selected",
    ],
    "book_appointment": [
        "book counseling",
        "schedule appointment",
        "meet a counselor",
    ],
    "navigate": [
        "where is the library",
        "how to reach",
        "location of canteen",
    ],
    "doc_query": [
        "fee structure",
        "scholarship criteria",
        "exam rules",
        "hostel policy",
    ],
}

_INTENT_EMBEDDINGS = {
    intent: _model.encode(examples, convert_to_tensor=True)
    for intent, examples in INTENT_EXAMPLES.items()
}


def classify_intent(query: str, threshold: float = 0.45) -> str:
    q_emb = _model.encode(query, convert_to_tensor=True)
    scores = {}
    for intent, embs in _INTENT_EMBEDDINGS.items():
        scores[intent] = float(util.cos_sim(q_emb, embs).max())

    best = max(scores, key=scores.get)
    return best if scores[best] > threshold else "doc_query"


def detect_language(query: str) -> str:
    try:
        return detect(query)
    except Exception:
        return "en"
