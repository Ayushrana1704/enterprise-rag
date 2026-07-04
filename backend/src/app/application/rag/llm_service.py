import requests


class LLMService:
    def __init__(self):
        self.url = "http://127.0.0.1:1234/v1/chat/completions"
        self.model = "gemma-3-1b-instruct"

    def generate(self, context: str, question: str) -> str:

        response = requests.post(
            self.url,
            json={
                "model": self.model,
                "temperature": 0.0,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are an enterprise RAG assistant. "
                            "Answer ONLY using the supplied context. "
                            "If the context does not contain the answer, "
                            "reply exactly with: "
                            "'I don't have enough information to answer that.'"
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"""
Context:

{context}

Question:

{question}

Answer:
""",
                    },
                ],
            },
            timeout=60,
        )

        response.raise_for_status()

        return response.json()["choices"][0]["message"]["content"]