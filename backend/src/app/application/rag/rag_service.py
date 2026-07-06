import asyncio
import functools
import logging
from collections.abc import AsyncGenerator

from app.application.rag.llm_service import LLMService
from app.application.rag.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)


class RAGService:

    def __init__(self, retrieval_service: RetrievalService) -> None:
        self.retrieval_service = retrieval_service
        self.llm_service = LLMService()

    def ask(
        self,
        question: str,
        user_id: str | None = None,
    ) -> dict:
        logger.info("RAG pipeline started: question_length=%d", len(question))

        context, sources = self.retrieval_service.retrieve_with_context(
            question, user_id=user_id
        )

        answer = self.llm_service.generate(
            context=context,
            question=question,
        )

        logger.info(
            "RAG pipeline complete: answer_length=%d, citations=%d",
            len(answer),
            len(sources),
        )

        return {
            "answer": answer,
            "context": context,
            "sources": sources,
        }

    async def ask_stream(
        self,
        question: str,
        user_id: str | None = None,
    ) -> AsyncGenerator[dict, None]:
        """Stream the RAG pipeline response as SSE-ready event dicts.

        Yields events in order:
          1. {"type": "citations", "citations": [...]} — immediately after retrieval
          2. {"type": "token", "delta": "..."} — one per LLM token
          3. {"type": "done"} — on clean completion

        ``user_id`` is forwarded to the retrieval layer so vector search is
        scoped to documents owned by that user.  Pass ``None`` for anonymous
        (global) searches.

        LLMError propagates to the caller unchanged; the route catches it and
        emits a {"type": "error"} event so the client always gets a clean signal.

        Retrieval runs in a thread-pool executor to avoid blocking the asyncio
        event loop (QdrantService and EmbeddingService are synchronous).
        """
        logger.info("RAG streaming pipeline started: question_length=%d", len(question))

        loop = asyncio.get_running_loop()
        fn = functools.partial(
            self.retrieval_service.retrieve_with_context,
            question,
            user_id=user_id,
        )
        context, sources = await loop.run_in_executor(None, fn)

        citations = [
            {
                "filename": s.payload["filename"],
                "chunk_index": s.payload.get("chunk_index"),
                "score": s.score,
                "preview": s.payload["text"][:300],
            }
            for s in sources
        ]

        yield {"type": "citations", "citations": citations}
        logger.info("RAG streaming: citations emitted (%d sources)", len(citations))

        token_count = 0
        async for delta in self.llm_service.generate_stream(context=context, question=question):
            yield {"type": "token", "delta": delta}
            token_count += 1

        yield {"type": "done"}
        logger.info("RAG streaming pipeline complete: tokens=%d", token_count)
