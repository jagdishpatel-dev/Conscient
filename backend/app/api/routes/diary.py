import logging

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_current_user
from app.models.diary_entry import DiaryEntry
from app.models.user import User
from app.services.emotion import classify_emotion
from app.services.vectorstore import index_entry

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/diary", tags=["diary"])


class DiaryEntryCreate(BaseModel):
    title: str
    content: str
    ai_access: bool = True


@router.get("", response_model=list[DiaryEntry])
async def list_entries(user: User = Depends(get_current_user)) -> list[DiaryEntry]:
    return await DiaryEntry.find(DiaryEntry.user_id == str(user.id)).sort("-date").to_list()


async def _tag_mood(entry_id) -> None:
    try:
        entry = await DiaryEntry.get(entry_id)
        if entry is None:
            return

        mood, confidence = await run_in_threadpool(classify_emotion, entry.content)
        entry.mood = mood
        entry.mood_confidence = confidence
        await entry.save()

        index_entry(
            entry_id=str(entry.id),
            user_id=entry.user_id,
            title=entry.title,
            content=entry.content,
            date=entry.date.isoformat(),
            mood=mood,
        )
    except Exception:
        logger.exception("Failed to classify mood for entry %s", entry_id)


@router.post("", response_model=DiaryEntry, status_code=201)
async def create_entry(
    payload: DiaryEntryCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
) -> DiaryEntry:
    entry = DiaryEntry(
        user_id=str(user.id),
        title=payload.title,
        content=payload.content,
        ai_access=payload.ai_access,
    )
    await entry.insert()

    if entry.ai_access:
        try:
            index_entry(
                entry_id=str(entry.id),
                user_id=entry.user_id,
                title=entry.title,
                content=entry.content,
                date=entry.date.isoformat(),
            )
        except Exception:
            logger.exception("Failed to index diary entry %s for retrieval", entry.id)

        background_tasks.add_task(_tag_mood, entry.id)

    return entry
