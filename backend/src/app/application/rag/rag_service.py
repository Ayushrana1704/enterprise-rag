import logging

from app.application.rag.llm_service import LLMService
from app.application.rag.retrieval_service import RetrievalService

logger = logging.getLogger(__name__)


class RAGService:

    def __init__(self):
        self.retrieval_service = RetrievalService()
        self.llm_service = LLMService()

    def ask(self, question: str) -> dict:
        logger.info("RAG pipeline started: question_length=%d", len(question))

        context, sources = self.retrieval_service.retrieve_with_context(question)

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
