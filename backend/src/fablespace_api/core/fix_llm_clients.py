import sys
import os

path = r"d:\work\ai-\backend\src\fablespace_api\core\llm_clients.py"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
inserted_class = False
inserted_registry = False

maker_suite_class = """
class MakerSuiteBackend(LLMBackend):
    \"\"\"Google AI Studio (Gemini) API.\"\"\"

    DEFAULT_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        model = self.config.model or "gemini-1.5-flash"
        url = f"{self.DEFAULT_URL}/{model}:generateContent?key={self.config.api_key}"
        
        contents = []
        for msg in messages:
            role = "user" if msg["role"] in ("user", "system") else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })

        body = {
            "contents": contents,
            "generationConfig": {
                "temperature": self.config.temperature,
                "maxOutputTokens": self.config.max_tokens,
                "topP": self.config.top_p,
            }
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["candidates"][0]["content"]["parts"][0]["text"]
                return LLMResponse(
                    content=content,
                    model=model,
                    usage={
                        "prompt_tokens": data.get("usageMetadata", {}).get("promptTokenCount", 0),
                        "completion_tokens": data.get("usageMetadata", {}).get("candidatesTokenCount", 0),
                    },
                    raw=data,
                )
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"Gemini API error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"Gemini request failed: {e}") from e

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return False

"""

for line in lines:
    if "# ─── Factory ───" in line and not inserted_class:
        new_lines.append(maker_suite_class)
        inserted_class = True
    
    if '"rules": RulesBackend,' in line and not inserted_registry:
        new_lines.append('    "gemini": MakerSuiteBackend,\n')
        new_lines.append('    "makersuite": MakerSuiteBackend,\n')
        new_lines.append(line)
        inserted_registry = True
    else:
        new_lines.append(line)

with open(path, "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Done")
