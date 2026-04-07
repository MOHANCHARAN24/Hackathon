from config import CRISIS_KEYWORDS, DISTRESS_KEYWORDS


def analyze_sentiment(text: str) -> dict:
    text_lower = text.lower()

    crisis_triggered = any(k in text_lower for k in CRISIS_KEYWORDS)

    mental_health_triggered = crisis_triggered or any(
        k in text_lower for k in DISTRESS_KEYWORDS
    )

    positive_words = [
        "thanks",
        "helpful",
        "great",
        "perfect",
        "awesome",
        "clear",
        "excellent",
        "good",
        "thank you",
        "understood",
    ]
    negative_words = [
        "wrong",
        "bad",
        "unhelpful",
        "confused",
        "unclear",
        "useless",
        "incorrect",
        "not right",
        "that's wrong",
    ]

    positive = any(w in text_lower for w in positive_words)
    negative = any(w in text_lower for w in negative_words)

    if crisis_triggered:
        sentiment = "crisis"
    elif mental_health_triggered:
        sentiment = "distress"
    elif positive:
        sentiment = "positive"
    elif negative:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    return {
        "sentiment": sentiment,
        "mental_health_triggered": mental_health_triggered,
        "crisis_triggered": crisis_triggered,
    }
