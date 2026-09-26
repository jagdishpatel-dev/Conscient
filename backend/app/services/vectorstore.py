from functools import lru_cache

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import settings


@lru_cache
def get_vectorstore() -> Chroma:
    embeddings = HuggingFaceEmbeddings(model_name=settings.embedding_model)
    return Chroma(
        collection_name="diary_entries",
        embedding_function=embeddings,
        persist_directory=settings.chroma_persist_dir,
    )


def index_entry(
    entry_id: str,
    user_id: str,
    title: str,
    content: str,
    date: str,
    mood: str | None = None,
) -> None:
    metadata = {"user_id": user_id, "entry_id": entry_id, "title": title, "date": date}
    if mood is not None:
        metadata["mood"] = mood

    vectorstore = get_vectorstore()
    vectorstore.add_documents(
        documents=[Document(page_content=f"{title}\n\n{content}", metadata=metadata)],
        ids=[entry_id],
    )


def search_entries(user_id: str, query: str, k: int = 3) -> list[Document]:
    vectorstore = get_vectorstore()
    return vectorstore.similarity_search(query, k=k, filter={"user_id": user_id})
