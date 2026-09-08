import logging
import time

from langchain_core.documents import Document
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI

from app.core.config import settings
from app.models.chat_message import ChatMessage
from app.services.vectorstore import search_entries

logger = logging.getLogger(__name__)

llm = ChatOpenAI(
    base_url=settings.openrouter_base_url,
    api_key=settings.openrouter_api_key,
    model=settings.openrouter_model,
)

SYSTEM_PROMPT = """You are a highly empathetic Diary Assistant AI. Your role is to help the \
user reflect on their thoughts and feelings, drawing on their own past diary entries when \
relevant. Your tone should feel warm, understanding, and supportive, like a trusted friend.

Guidelines:
- Show empathy, understanding, and encouragement.
- Use conversational language (contractions like "I'm" instead of "I am").
- Be supportive and engaging, encouraging the user to share more or reflect.
- Vary your phrasing rather than repeating the same structure.
- If a past diary entry is relevant to what the user is saying, refer to it naturally \
(e.g. "You mentioned something similar in your entry about..."). Don't force a reference \
if nothing is relevant.

Relevant past diary entries for this user (may be empty if nothing relevant was found):
{context}
"""

prompt = ChatPromptTemplate.from_messages(
    [
        ("system", SYSTEM_PROMPT),
        MessagesPlaceholder("history"),
        ("human", "{question}"),
    ]
)

chain = prompt | llm | StrOutputParser()

FALLBACK_REPLY = (
    "The AI model is a bit overloaded right now (it's a free-tier model). "
    "Please try again in a moment."
)


def _format_context(docs: list[Document]) -> str:
    if not docs:
        return "(No relevant diary entries found.)"
    lines = []
    for doc in docs:
        title = doc.metadata.get("title", "Untitled")
        date = doc.metadata.get("date", "")
        mood = doc.metadata.get("mood")
        mood_note = f" [mood: {mood}]" if mood else ""
        lines.append(f'- "{title}" ({date}){mood_note}: {doc.page_content}')
    return "\n".join(lines)


def _to_lc_messages(history: list[ChatMessage]) -> list[HumanMessage | AIMessage]:
    messages: list[HumanMessage | AIMessage] = []
    for msg in history:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        else:
            messages.append(AIMessage(content=msg.content))
    return messages


def generate_reply(
    user_id: str, message: str, history: list[ChatMessage]
) -> tuple[str, list[Document]]:
    retrieved = search_entries(user_id, message, k=3)
    context = _format_context(retrieved)
    lc_history = _to_lc_messages(history)

    reply: str | None = None
    for attempt in range(3):
        try:
            reply = chain.invoke(
                {"context": context, "history": lc_history, "question": message}
            )
        except Exception:
            logger.exception("Chat completion attempt %s failed", attempt)
            reply = None

        if reply and reply.strip():
            break
        time.sleep(1.5)

    if not reply or not reply.strip():
        return FALLBACK_REPLY, []

    return reply, retrieved
