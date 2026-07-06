import logging

import requests

from app.application.exceptions import LLMError
from app.infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self) -> None:
        settings = get_settings()
        self.url: str = settings.llm_api_url
        self.model: str = settings.llm_model_name
        self.temperature: float = settings.llm_temperature
        self.timeout: int = settings.llm_request_timeout_seconds

    def generate(self, context: str, question: str) -> str:
        logger.info(
            "LLM request: model=%s, context_length=%d, question_length=%d",
            self.model,
            len(context),
            len(question),
        )

        try:
            response = requests.post(
                self.url,
                json={
                    "model": self.model,
                    "temperature": self.temperature,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are an enterprise RAG assistant. "
                                "Answer the user's question using only the context provided. "
                                "You may summarize, infer, or synthesize from the context — "
                                "the answer does not need to appear verbatim. "
                                "If asked what a document is about, describe its topic or "
                                "content based on what the context reveals. "
                                "Only if the context is completely empty or contains nothing "
                                "relevant to the question should you reply exactly: "
                                "'I don't have enough information to answer that.'"
                            ),
                        },
                        {
                            "role": "user",
                            "content": (
                                f"\nContext:\n\n{context}"
                                f"\n\nQuestion:\n\n{question}"
                                f"\n\nAnswer:\n"
                            ),
                        },
                    ],
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
            answer: str = response.json()["choices"][0]["message"]["content"]

        except requests.Timeout as e:
            logger.error("LLM request timed out after %ds: model=%s", self.timeout, self.model)
            raise LLMError("LLM request timed out") from e

        except requests.ConnectionError as e:
            logger.error("LLM service unreachable: url=%s", self.url)
            raise LLMError("LLM service is unreachable") from e

        except requests.HTTPError as e:
            logger.error(
                "LLM returned HTTP error: status=%s, model=%s",
                e.response.status_code,
                self.model,
            )
            raise LLMError(f"LLM returned HTTP {e.response.status_code}") from e

        except (KeyError, IndexError) as e:
            logger.error("Unexpected LLM response format: %s", e)
            raise LLMError("Unexpected LLM response format") from e

        logger.info("LLM response received: %d chars", len(answer))
        return answer
