from datetime import UTC, datetime

from beanie import Document
from pydantic import Field


class ConnectionRequest(Document):
    from_user_id: str
    to_user_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    class Settings:
        name = "connection_requests"
