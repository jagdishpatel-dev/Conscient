from functools import lru_cache

from transformers import pipeline

from app.core.config import settings


@lru_cache
def _get_classifier():
    return pipeline("text-classification", model=settings.emotion_model)


def classify_emotion(text: str) -> tuple[str, float]:
    classifier = _get_classifier()
    result = classifier(text[:512], truncation=True)[0]
    return result["label"], float(result["score"])
