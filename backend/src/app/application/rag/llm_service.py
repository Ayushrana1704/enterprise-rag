import json
import logging
from collections.abc import AsyncGenerator

import httpx
import requests

from app.application.exceptions import LLMError
from app.infrastructure.config.settings import get_settings

logger = logging.getLogger(__name__)

# Shared system prompt -- used by both the sync and streaming generation paths.
_SYSTEM_PROMPT = """\
You are an expert enterprise knowledge assistant with access to a company's indexed document library.

## Your behavior

**When the user greets you or makes small talk** (e.g., "Hi", "Hello", "Thanks", "How are you"):
Respond warmly and naturally. Do not reference documents or context.

**When context documents are provided and relevant**:
Answer the question thoroughly using the provided context. You may synthesize, infer, and summarize -- the answer does not need to appear verbatim. Structure your answer with clear headings, bullet points, and code blocks where appropriate. Always be specific and cite details from the context.

**When context documents are provided but not relevant to the question**:
Answer from your general knowledge if you can do so helpfully. Briefly note that the indexed documents don't cover this topic, then provide a useful general answer.

**When no context is provided and the question is a general knowledge question**:
Answer helpfully from your general knowledge. You are a capable AI assistant beyond just document retrieval.

**When no context is provided and the question requires specific company/document knowledge**:
Politely explain that you don't have relevant documents indexed for this question yet, and suggest the user upload relevant documents.

## Response format

- Use markdown formatting: `##` headings, bullet lists, numbered lists, `code blocks`, **bold**, *italic*
- Keep answers focused and well-structured
- For factual questions, be direct and specific
- For complex topics, use headings to organize your response
- Aim for thorough, useful answers -- not terse one-liners

## Tone

Professional, clear, and helpful. Like a knowledgeable colleague, not a stiff corporate tool.\
"""


class LLMService:
    def __init__(self) -> None:
        settings = get_settings()

        # Build the completions endpoint from the base URL so callers only need
        # to set LLM_BASE_URL (e.g. "http://127.0.0.1:1234/v1" or
        # "https://api.groq.com/openai/v1") without caring about path details.
        base = settings.llm_base_url.rstrip("/")
        self.url: str = f"{base}/chat/completions"

        self.model: str = settings.llm_model_name
        self.temperature: float = settings.llm_temperature
        self.timeout: int = settings.llm_request_timeout_seconds
        self.provider: str = settings.llm_provider

        # Build the Authorization header once.
        # An empty or unset LLM_API_KEY means no header is sent -- correct for
        # local providers like LM Studio that require no authentication.
        api_key = settings.llm_api_key.strip()
        self._auth_headers: dict[str, str] = (
            {"Authorization": f"Bearer {api_key}"} if api_key else {}
        )

        logger.info(
            "LLMService ready: provider=%s, url=%s, model=%s, auth=%s",
            self.provider,
            self.url,
            self.model,
            "yes" if api_key else "no",
        )

    def generate(self, context: str, question: str) -> str:
        logger.info(
            "LLM request: provider=%s, model=%s, context_length=%d, question_length=%d",
            self.provider,
            self.model,
            len(context),
            len(question),
        )

        user_content = (
            f"Context documents:\n\n{context}\n\nUser question: {question}"
            if context.strip()
            else f"User question: {question}"
        )

        try:
            response = requests.post(
                self.url,
                headers=self._auth_headers,
                json={
                    "model": self.model,
                    "temperature": self.temperature,
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
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

    async def generate_stream(
        self, context: str, question: str
    ) -> AsyncGenerator[str, None]:
        """Stream answer tokens from the LLM as an async generator.

        Yields each non-empty content delta as a plain string.
        Raises LLMError on connection, timeout, or HTTP failures.
        Malformed delta chunks are logged and skipped rather than aborting.

        Cancellation: when the caller is cancelled (client disconnect),
        asyncio propagates CancelledError through the httpx stream context
        manager, which closes the underlying connection automatically.
        """
        logger.info(
            "LLM streaming request: provider=%s, model=%s, context_length=%d, question_length=%d",
            self.provider,
            self.model,
            len(context),
            len(question),
        )

        user_content = (
            f"Context documents:\n\n{context}\n\nUser question: {question}"
            if context.strip()
            else f"User question: {question}"
        )

        payload = {
            "model": self.model,
            "temperature": self.temperature,
            "stream": True,
            "messages": [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
        }

        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    self.url,
                    headers=self._auth_headers,
                    json=payload,
                    timeout=self.timeout,
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line.startswith("data: "):
                            continue
                        raw = line[len("data: "):]
                        if raw == "[DONE]":
                            break
                        try:
                            chunk = json.loads(raw)
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield delta
                        except (json.JSONDecodeError, KeyError, IndexError) as e:
                            logger.warning("Skipping malformed streaming chunk: %s", e)
                            continue

        except httpx.TimeoutException as e:
            logger.error(
                "LLM streaming request timed out after %ds: model=%s",
                self.timeout,
                self.model,
            )
            raise LLMError("LLM request timed out") from e

        except httpx.ConnectError as e:
            logger.error("LLM service unreachable during streaming: url=%s", self.url)
            raise LLMError("LLM service is unreachable") from e

        except httpx.HTTPStatusError as e:
            logger.error(
                "LLM returned HTTP error during streaming: status=%s, model=%s",
                e.response.status_code,
                self.model,
            )
            raise LLMError(f"LLM returned HTTP {e.response.status_code}") from e

        logger.info("LLM streaming response complete")
