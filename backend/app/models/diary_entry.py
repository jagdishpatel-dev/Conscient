from datetime import UTC, datetime

from beanie import Document
from pydantic import Field


class DiaryEntry(Document):
    user_id: str
    title: str
    content: str
    ai_access: bool = True
    mood: str | None = None
    mood_confidence: float | None = None
    date: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "diary_entries"
