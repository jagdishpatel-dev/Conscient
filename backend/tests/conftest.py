import asyncio
import os
import uuid

os.environ.setdefault("MONGODB_URI", "mongodb://localhost:27017")
os.environ.setdefault("MONGODB_DB_NAME", "conscient_test")
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-prod")
os.environ.setdefault("OPENROUTER_API_KEY", "test-key-not-used")

import pytest
from starlette.testclient import TestClient

from app.core.config import settings
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _reset_test_db():
    from motor.motor_asyncio import AsyncIOMotorClient

    async def _drop():
        db_client = AsyncIOMotorClient(settings.mongodb_uri)
        await db_client.drop_database(settings.mongodb_db_name)
        db_client.close()

    asyncio.run(_drop())
    yield


@pytest.fixture(scope="session")
def client(_reset_test_db):
    with TestClient(app) as c:
        yield c


@pytest.fixture
def unique_username():
    return f"user_{uuid.uuid4().hex[:8]}"
