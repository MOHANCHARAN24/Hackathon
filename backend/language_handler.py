from langdetect import detect


def detect_language(text: str) -> str:
    try:
        detected = detect(text or "")
        if detected in {"te", "hi", "en"}:
            return detected
    except Exception:
        pass
    return "en"


def get_language_instruction(language: str) -> str:
    if language == "te":
        return "Respond in Telugu only. Use Telugu script."
    if language == "hi":
        return "Respond in Hindi only. Use Devanagari script."
    return "Respond in English only."
