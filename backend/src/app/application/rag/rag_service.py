from app.application.rag.llm_service import LLMService
from app.application.rag.retrieval_service import RetrievalService


class RAGService:

    def __init__(self):
        self.retrieval_service = RetrievalService()
        self.llm_service = LLMService()

    def ask(self, question: str):

        context = self.retrieval_service.build_context(question)

        prompt = f"""
You are an enterprise AI assistant specialized in answering questions from documents.

Your job is to answer the user's question using ONLY the information provided in the context below.

Instructions:
- Read the context carefully.
- If the answer exists in the context, answer it in your own words.
- Be clear and concise.
- Do NOT invent information.
- Only reply "I don't have enough information to answer that." if the answer truly cannot be found in the context.

========================
CONTEXT
========================
{context}

========================
QUESTION
========================
{question}

========================
ANSWER
========================
"""

        answer = self.llm_service.generate(
            context=context,
            question=question,
        )

        return {
            "answer": answer,
            "context": context,
        }