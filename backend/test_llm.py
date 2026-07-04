import sys

sys.path.append("src")

from app.application.rag.llm_service import LLMService

llm = LLMService()

response = llm.generate(
    "Explain Retrieval Augmented Generation in one paragraph."
)

print(response)