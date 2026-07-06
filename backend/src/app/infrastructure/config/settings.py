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

    # ---------------------------------------------------------------------------
    # LLM
    #
    # LLM_PROVIDER   -- informational label; not used in request logic but useful
    #                   for logging and health-check display.
    #                   Values: "lm_studio" | "groq" | any string
    #
    # LLM_BASE_URL   -- OpenAI-compatible base URL *without* a trailing slash.
    #                   The completions endpoint is built as:
    #                       LLM_BASE_URL + "/chat/completions"
    #                   The models endpoint (used by the health check) is:
    #                       LLM_BASE_URL + "/models"
    #
    #   LM Studio:  http://127.0.0.1:1234/v1
    #   Groq:       https://api.groq.com/openai/v1
    #
    # LLM_API_KEY    -- Bearer token for authenticated providers (e.g. Groq).
    #                   Leave empty or unset for local providers that require no
    #                   authentication (e.g. LM Studio).
    #                   When non-empty, the value is sent as:
    #                       Authorization: Bearer <LLM_API_KEY>
    # ---------------------------------------------------------------------------
    llm_provider: str = Field(default="lm_studio", alias="LLM_PROVIDER")

    llm_base_url: str = Field(
        default="http://127.0.0.1:1234/v1",
        alias="LLM_BASE_URL",
    )

    llm_api_key: str = Field(default="", alias="LLM_API_KEY")

    llm_model_name: str = Field(default="gemma-3-1b-instruct", alias="LLM_MODEL_NAME")
    llm_temperature: float = Field(default=0.0, alias="LLM_TEMPERATURE")
    llm_request_timeout_seconds: int = Field(default=60, alias="LLM_REQUEST_TIMEOUT_SECONDS")

    # CORS -- comma-separated origins allowed to call the API.
    # Override via CORS_ORIGINS env var in non-local environments.
    cors_origins: list[str] = Field(
        default=["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"],
        alias="CORS_ORIGINS",
    )

    # BM25
    bm25_corpus_path: str = Field(default="bm25_corpus.json", alias="BM25_CORPUS_PATH")

    # Hybrid search
    # Set HYBRID_SEARCH_ENABLED=false to fall back to dense-only retrieval
    # without redeploying -- useful for A/B testing or incident response.
    hybrid_search_enabled: bool = Field(default=True, alias="HYBRID_SEARCH_ENABLED")

    # Reciprocal Rank Fusion constant (Cormack et al. 2009).
    # Lower values amplify top-rank advantage; 60 is the empirically validated default.
    rrf_k: int = Field(default=60, alias="RRF_K")

    # Each retriever fetches limit x this factor before fusion.
    # More candidates improve deduplication quality at the cost of latency.
    hybrid_oversample_factor: int = Field(default=2, alias="HYBRID_OVERSAMPLE_FACTOR")

    # Per-retriever weights -- reserved for weighted RRF (Phase 5.5D+).
    # Currently stored but not applied to the fusion formula.
    dense_weight: float = Field(default=1.0, alias="DENSE_WEIGHT")
    sparse_weight: float = Field(default=1.0, alias="SPARSE_WEIGHT")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
