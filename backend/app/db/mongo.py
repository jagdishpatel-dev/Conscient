from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.chat_message import ChatMessage
from app.models.connection_request import ConnectionRequest
from app.models.diary_entry import DiaryEntry
from app.models.user import User

_client: AsyncIOMotorClient | None = None


async def init_db() -> None:
    global _client
    _client = AsyncIOMotorClient(settings.mongodb_uri, tlsAllowInvalidCertificates=True)
    await init_beanie(
        database=_client[settings.mongodb_db_name],
        document_models=[User, DiaryEntry, ChatMessage, ConnectionRequest],
    )


async def close_db() -> None:
    if _client is not None:
        _client.close()
