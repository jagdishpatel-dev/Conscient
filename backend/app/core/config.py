from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongodb_uri: str
    mongodb_db_name: str = "conscient"
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60 * 24
    cors_origins: list[str] = ["http://localhost:3000"]

    openrouter_api_key: str
    openrouter_model: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    chroma_persist_dir: str = "chroma_data"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    emotion_model: str = "j-hartmann/emotion-english-distilroberta-base"


settings = Settings()
