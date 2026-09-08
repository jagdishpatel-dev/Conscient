from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.chat_message import ChatMessage, CitedEntryRef
from app.models.user import User
from app.services.chat_chain import generate_reply

router = APIRouter(prefix="/chat", tags=["chat"])

HISTORY_TURNS = 6


class ChatRequest(BaseModel):
    content: str


class ChatResponse(BaseModel):
    response: str
    cited_entries: list[CitedEntryRef]


@router.get("/history", response_model=list[ChatMessage])
async def get_history(user: User = Depends(get_current_user)) -> list[ChatMessage]:
    return (
        await ChatMessage.find(ChatMessage.user_id == str(user.id))
        .sort("+created_at")
        .to_list()
    )


@router.post("", response_model=ChatResponse)
async def chat(payload: ChatRequest, user: User = Depends(get_current_user)) -> ChatResponse:
    user_id = str(user.id)

    recent_history = (
        await ChatMessage.find(ChatMessage.user_id == user_id)
        .sort("-created_at")
        .limit(HISTORY_TURNS)
        .to_list()
    )
    recent_history.reverse()

    reply, cited_docs = generate_reply(user_id, payload.content, recent_history)

    cited_entries = [
        CitedEntryRef(
            entry_id=doc.metadata["entry_id"],
            title=doc.metadata["title"],
            date=doc.metadata["date"],
        )
        for doc in cited_docs
    ]

    await ChatMessage(user_id=user_id, role="user", content=payload.content).insert()
    await ChatMessage(
        user_id=user_id,
        role="assistant",
        content=reply,
        cited_entries=cited_entries,
    ).insert()

    return ChatResponse(response=reply, cited_entries=cited_entries)
