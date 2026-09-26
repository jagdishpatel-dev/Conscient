from datetime import UTC, datetime
from typing import Literal

from beanie import Document
from pydantic import BaseModel, Field


class CitedEntryRef(BaseModel):
    entry_id: str
    title: str
    date: str


class ChatMessage(Document):
    user_id: str
    role: Literal["user", "assistant"]
    content: str
    cited_entries: list[CitedEntryRef] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "chat_messages"
