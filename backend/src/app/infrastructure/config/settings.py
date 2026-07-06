from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Enterprise AI Knowledge Assistant", alias="APP_NAME")

    app_env: Literal["local", "dev", "test", "staging", "prod"] = Field(
        default="local",
        alias="APP_ENV",
    )

    app_debug: bool = Field(default=False, alias="APP_DEBUG")
    app_log_level: str = Field(default="INFO", alias="APP_LOG_LEVEL")

    backend_host: str = Field(default="0.0.0.0", alias="BACKEND_HOST")
    backend_port: int = Field(default=8000, alias="BACKEND_PORT")

    jwt_secret_key: str = Field(
        default="change-me-in-production",
        alias="JWT_SECRET_KEY",
    )

    jwt_algorithm: str = Field(
        default="HS256",
        alias="JWT_ALGORITHM",
    )

    jwt_access_token_expire_minutes: int = Field(
        default=30,
        alias="JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
    )

    # PostgreSQL
    database_url: str = Field(
        default="postgresql+psycopg://enterprise:enterprise123@localhost:5432/enterprise_ai",
        alias="DATABASE_URL",
    )

    # Qdrant
    qdrant_host: str = Field(default="localhost", alias="QDRANT_HOST")
    qdrant_port: int = Field(default=6333, alias="QDRANT_PORT")
    qdrant_collection_name: str = Field(default="documents", alias="QDRANT_COLLECTION_NAME")

    # Embedding
    embedding_model_name: str = Field(default="BAAI/bge-m3", alias="EMBEDDING_MODEL_NAME")

    # LLM
    llm_api_url: str = Field(
        default="http://127.0.0.1:1234/v1/chat/completions",
        alias="LLM_API_URL",
    )
    llm_model_name: str = Field(default="gemma-3-1b-instruct", alias="LLM_MODEL_NAME")
    llm_temperature: float = Field(default=0.0, alias="LLM_TEMPERATURE")
    llm_request_timeout_seconds: int = Field(default=60, alias="LLM_REQUEST_TIMEOUT_SECONDS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
