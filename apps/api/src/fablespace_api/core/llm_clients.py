"""
LLM Client Factory — supports 24+ backends inspired by SillyTavern.

Backends: openai, claude, openrouter, ollama, azure_openai, groq,
deepseek, mistral, cohere, fireworks, moonshot, custom (OpenAI-compatible),
ai21, makersuite, vertexai, perplexity, xai, aimlapi, siliconflow,
chutes, pollinations, cometapi, zai, nanogpt, electronhub, featherless,
huggingface, mancer, vllm, aphrodite, tabby, koboldcpp, togetherai,
llamacpp, infermaticai, dreamgen, generic

Each backend implements the same interface for consistency.
"""

from __future__ import annotations

import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Generator, Optional

logger = logging.getLogger(__name__)

# ─── Config Types ────────────────────────────────────────────────────────────


@dataclass
class LLMConfig:
    """LLM configuration — mirrors tavern.py LLMConfig."""
    backend: str = "openai"
    model: str = "gpt-4o-mini"
    api_key: str = ""
    base_url: str = ""
    temperature: float = 1.0
    max_tokens: int = 2048
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    seed: int = -1
    # Backend-specific options
    reasoning_effort: str = ""  # claude extended_thinking
    json_schema: Optional[dict] = None  # function calling schema
    thinking_budget: Optional[int] = None  # claude thinking budget
    extra: dict[str, Any] = field(default_factory=dict)

    def is_configured(self) -> bool:
        """Check if the LLM config has actual credentials or is a rules-based backend.

        Rules-based backends (rules, rule_based, public_welfare) don't need credentials
        as they use built-in response rules instead of calling an external LLM API.
        """
        backend = str(self.backend or "").strip().lower()
        rules_backends = {"rules", "rule_based", "public_welfare"}
        if backend in rules_backends:
            return True
        return bool(self.api_key or self.base_url)

    def to_dict(self) -> dict[str, Any]:
        return {
            "backend": self.backend,
            "model": self.model,
            "api_key": self.api_key,
            "base_url": self.base_url,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
        }


# ─── Response Types ────────────────────────────────────────────────────────────


@dataclass
class LLMResponse:
    content: str
    model: str
    usage: Optional[dict[str, int]] = None
    finish_reason: str = "stop"
    raw: Optional[dict] = None
    # Streaming support
    streaming: bool = False
    _stream_queue: list = field(default_factory=list, repr=False)

    @classmethod
    def from_chunk(cls, chunk: str, model: str) -> "LLMResponse":
        """Create a streaming chunk response."""
        return cls(content=chunk, model=model, streaming=True)


# ─── Abstract Base ────────────────────────────────────────────────────────────


class LLMBackend(ABC):
    """Abstract base for all LLM backends."""

    def __init__(self, config: LLMConfig):
        self.config = config
        self._stream_buffer: list[str] = []

    @abstractmethod
    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        """
        Send a completion request and return the full response.
        messages: list of {"role": "user"|"system"|"assistant", "content": "..."}
        """
        ...

    def complete_stream(
        self, messages: list[dict[str, str]], **kwargs
    ) -> Generator[LLMResponse, None, None]:
        """
        Stream the response. Default implementation calls complete() and yields in one chunk.
        Override for true streaming support.
        """
        response = self.complete(messages, **kwargs)
        if response.content:
            yield LLMResponse.from_chunk(response.content, response.model)

    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """Estimate token count for the given text."""
        ...

    @abstractmethod
    def supports_streaming(self) -> bool:
        ...

    def _default_headers(self, api_key: str, extra: dict = None) -> dict:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "FableSpace/0.1 Python",
            "Authorization": f"Bearer {api_key}",
        }
        if extra:
            headers.update(extra)
        return headers

    def _build_body(
        self,
        messages: list[dict[str, str]],
        model: str,
        stream: bool = False,
        **kwargs,
    ) -> dict[str, Any]:
        """Build request body — override per backend."""
        body = {
            "model": model,
            "messages": messages,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
            "top_p": self.config.top_p,
            "stream": stream,
        }
        if self.config.frequency_penalty:
            body["frequency_penalty"] = self.config.frequency_penalty
        if self.config.presence_penalty:
            body["presence_penalty"] = self.config.presence_penalty
        if self.config.seed >= 0:
            body["seed"] = self.config.seed
        body.update(kwargs)
        return body

    def _estimate_tokens(self, text: str) -> int:
        """Fallback: estimate tokens as ~1/4 of characters for Chinese, ~1/6 for English."""
        chinese_chars = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
        non_chinese = len(text) - chinese_chars
        return int(chinese_chars * 0.5 + non_chinese * 0.2)


# ─── OpenAI Backend ───────────────────────────────────────────────────────────


class OpenAIBackend(LLMBackend):
    """OpenAI Chat Completions API."""

    DEFAULT_URL = "https://api.openai.com/v1/chat/completions"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)

        # Add reasoning effort for o-series models
        if self.config.reasoning_effort and "o" in self.config.model.lower():
            body["thinking"] = {"type": "enabled", "budget_tokens": self.config.thinking_budget or 2000}

        # Add function calling
        if self.config.json_schema:
            body["tools"] = [{"type": "function", "function": self.config.json_schema}]
            body["tool_choice"] = {"type": "function", "function": {"name": self.config.json_schema["name"]}}

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                # Handle function call response
                if "tool_calls" in data["choices"][0]["message"]:
                    tool_call = data["choices"][0]["message"]["tool_calls"][0]
                    content = f"[TOOL_CALL: {tool_call['function']['name']}]({tool_call['function']['arguments']})"
                return LLMResponse(
                    content=content,
                    model=data.get("model", self.config.model),
                    usage=data.get("usage", {}),
                    raw=data,
                )
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            logger.error(f"OpenAI API error {e.code}: {error_body}")
            raise LLMError(f"OpenAI API error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            logger.error(f"OpenAI request failed: {e}")
            raise LLMError(f"OpenAI request failed: {e}") from e

    def complete_stream(
        self, messages: list[dict[str, str]], **kwargs
    ) -> Generator[LLMResponse, None, None]:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                for line in resp:
                    line = line.decode("utf-8").strip()
                    if not line or not line.startswith("data: "):
                        continue
                    if line.startswith("data: "):
                        data_str = line[7:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            logger.error(f"OpenAI stream error: {e}")
            raise LLMError(f"OpenAI stream failed: {e}") from e

    def count_tokens(self, text: str) -> int:
        try:
            import tiktoken
            enc = tiktoken.get_encoding("cl100k_base")
            return len(enc.encode(text))
        except Exception:
            return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── Claude Backend (Anthropic) ────────────────────────────────────────────────


class ClaudeBackend(LLMBackend):
    """Anthropic Claude API."""

    DEFAULT_URL = "https://api.anthropic.com/v1/messages"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.config.api_key,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
        }

        # Convert messages to Claude format
        claude_messages = self._convert_messages(messages)

        body = {
            "model": self.config.model,
            "messages": claude_messages,
            "max_tokens": max(self.config.max_tokens, 1024),
            "temperature": self.config.temperature,
            "top_p": self.config.top_p if self.config.top_p < 1.0 else None,
        }
        if self.config.thinking_budget:
            body["thinking"] = {
                "type": "enabled",
                "budget_tokens": self.config.thinking_budget,
            }
        if self.config.json_schema:
            body["tools"] = [{"name": self.config.json_schema["name"], "description": self.config.json_schema.get("description", ""), "input_schema": self.config.json_schema["parameters"]}]
            body["tool_choice"] = {"type": "tool", "name": self.config.json_schema["name"]}
        body = {k: v for k, v in body.items() if v is not None}

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = ""
                if data.get("content"):
                    for block in data["content"]:
                        if block.get("type") == "text":
                            content += block["text"]
                        elif block.get("type") == "tool_use":
                            content += f"[TOOL_CALL: {block['name']}]({block['input']})"
                return LLMResponse(
                    content=content,
                    model=data.get("model", self.config.model),
                    usage={
                        "input_tokens": data.get("usage", {}).get("input_tokens", 0),
                        "output_tokens": data.get("usage", {}).get("output_tokens", 0),
                    },
                    raw=data,
                )
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            logger.error(f"Claude API error {e.code}: {error_body}")
            raise LLMError(f"Claude API error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            logger.error(f"Claude request failed: {e}")
            raise LLMError(f"Claude request failed: {e}") from e

    def complete_stream(
        self, messages: list[dict[str, str]], **kwargs
    ) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.config.api_key,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true",
        }

        claude_messages = self._convert_messages(messages)
        body = {
            "model": self.config.model,
            "messages": claude_messages,
            "max_tokens": max(self.config.max_tokens, 1024),
            "temperature": self.config.temperature,
            "stream": True,
        }
        if self.config.thinking_budget:
            body["thinking"] = {"type": "enabled", "budget_tokens": self.config.thinking_budget}

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line:
                    continue
                if line.startswith("event:"):
                    event_type = line[6:].strip()
                    continue
                if line.startswith("data:"):
                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        data = json.loads(data_str)
                        if event_type == "content_block_delta":
                            delta = data.get("delta", {})
                            if delta.get("type") == "thinking_delta":
                                continue  # skip thinking blocks
                            if delta.get("type") == "text_delta":
                                yield LLMResponse.from_chunk(delta.get("text", ""), self.config.model)
                    except json.JSONDecodeError:
                        continue

    def _convert_messages(self, messages: list[dict[str, str]]) -> list[dict]:
        """Convert OpenAI-style messages to Claude format."""
        result = []
        system = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                system.append({"type": "text", "text": content})
            elif role == "user":
                result.append({"role": "user", "content": [{"type": "text", "text": content}]})
            elif role == "assistant":
                result.append({"role": "assistant", "content": [{"type": "text", "text": content}]})
        if system:
            result.insert(0, {"role": "user", "content": [{"type": "text", "text": "System context:\n" + "\n".join(s["text"] for s in system)}]})
        return result

    def count_tokens(self, text: str) -> int:
        try:
            from anthropic import Anthropic
            client = Anthropic(api_key=self.config.api_key)
            result = client.count_tokens(text)
            return result
        except Exception:
            return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── Ollama Backend ───────────────────────────────────────────────────────────


class OllamaBackend(LLMBackend):
    """Ollama local LLM API."""

    DEFAULT_URL = "http://localhost:11434"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/api/chat"
        body = {
            "model": self.config.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": self.config.temperature,
                "top_p": self.config.top_p,
                "num_predict": self.config.max_tokens,
            },
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["message"]["content"]
                return LLMResponse(
                    content=content,
                    model=data.get("model", self.config.model),
                    usage=data.get("eval_count"),
                    raw=data,
                )
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"Ollama error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"Ollama request failed: {e}") from e

    def complete_stream(
        self, messages: list[dict[str, str]], **kwargs
    ) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/api/chat"
        body = {
            "model": self.config.model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": self.config.temperature,
                "top_p": self.config.top_p,
                "num_predict": self.config.max_tokens,
            },
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=300) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line:
                    continue
                try:
                    data = json.loads(line)
                    if "message" in data and "content" in data["message"]:
                        yield LLMResponse.from_chunk(data["message"]["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        try:
            import urllib.request
            url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/api/tokens"
            req = urllib.request.Request(
                url,
                data=json.dumps({"content": text, "model": self.config.model}).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("count", self._estimate_tokens(text))
        except Exception:
            return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── OpenRouter Backend ────────────────────────────────────────────────────────


class OpenRouterBackend(LLMBackend):
    """OpenRouter — multi-model aggregator."""

    DEFAULT_URL = "https://openrouter.ai/api/v1/chat/completions"
    HEADERS = {
        "HTTP-Referer": "https://fablespace.app",
        "X-Title": "FableSpace",
    }

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)
        # OpenRouter-specific: provider selection
        if self.config.extra.get("openrouter_provider"):
            body["provider"] = {
                "order": self.config.extra["openrouter_provider"].split(","),
                "allow_fallbacks": True,
            }
        if self.config.extra.get("openrouter_models"):
            body["models"] = self.config.extra["openrouter_models"].split(",")

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key, self.HEADERS),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                # OpenRouter may nest in data.data[0]
                choice = data.get("choices", [{}])[0]
                if not choice and data.get("data"):
                    choice = data["data"][0].get("choices", [{}])[0]
                content = choice.get("message", {}).get("content", "")
                return LLMResponse(
                    content=content,
                    model=data.get("model", self.config.model),
                    usage=data.get("usage", {}),
                    raw=data,
                )
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"OpenRouter error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"OpenRouter request failed: {e}") from e

    def complete_stream(
        self, messages: list[dict[str, str]], **kwargs
    ) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)
        if self.config.extra.get("openrouter_provider"):
            body["provider"] = {"order": self.config.extra["openrouter_provider"].split(","), "allow_fallbacks": True}

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key, self.HEADERS),
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── Azure OpenAI Backend ──────────────────────────────────────────────────────


class AzureOpenAIBackend(LLMBackend):
    """Azure OpenAI — uses deployment ID instead of model name."""

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        base = (self.config.base_url or "").rstrip("/")
        if not base:
            raise LLMError("Azure OpenAI requires base_url (e.g. https://xxx.openai.azure.com)")

        api_version = self.config.extra.get("azure_api_version", "2024-02-01")
        # Model field in LLMConfig is used as deployment name for Azure
        deployment = self.config.model
        url = f"{base}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"

        body = self._build_body(messages, deployment, stream=False, **kwargs)
        # Azure doesn't support seed
        body.pop("seed", None)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "api-key": self.config.api_key,
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(
                    content=content,
                    model=deployment,
                    usage=data.get("usage", {}),
                    raw=data,
                )
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"Azure OpenAI error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"Azure OpenAI request failed: {e}") from e

    def complete_stream(
        self, messages: list[dict[str, str]], **kwargs
    ) -> Generator[LLMResponse, None, None]:
        import urllib.request

        base = (self.config.base_url or "").rstrip("/")
        api_version = self.config.extra.get("azure_api_version", "2024-02-01")
        deployment = self.config.model
        url = f"{base}/openai/deployments/{deployment}/chat/completions?api-version={api_version}"

        body = self._build_body(messages, deployment, stream=True, **kwargs)
        body.pop("seed", None)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "api-key": self.config.api_key},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], deployment)
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── Groq Backend ──────────────────────────────────────────────────────────────


class GroqBackend(LLMBackend):
    """Groq — fast inference."""

    DEFAULT_URL = "https://api.groq.com/openai/v1/chat/completions"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(content=content, model=data.get("model", self.config.model), usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"Groq error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"Groq request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=60) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── DeepSeek Backend ─────────────────────────────────────────────────────────


class DeepSeekBackend(LLMBackend):
    """DeepSeek API."""

    DEFAULT_URL = "https://api.deepseek.com/v1/chat/completions"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(content=content, model=data.get("model", self.config.model), usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"DeepSeek error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"DeepSeek request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── Mistral Backend ───────────────────────────────────────────────────────────


class MistralBackend(LLMBackend):
    """Mistral AI API."""

    DEFAULT_URL = "https://api.mistral.ai/v1/chat/completions"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(content=content, model=data.get("model", self.config.model), usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"Mistral error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"Mistral request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── Cohere Backend ────────────────────────────────────────────────────────────


class CohereBackend(LLMBackend):
    """Cohere Command/R API."""

    DEFAULT_URL = "https://api.cohere.ai/v1/chat"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat"
        # Convert messages to Cohere format
        chat_history = []
        preamble = ""
        for msg in messages:
            if msg["role"] == "system":
                preamble += msg["content"] + "\n"
            elif msg["role"] == "user":
                chat_history.append({"role": "USER", "message": msg["content"]})
            elif msg["role"] == "assistant":
                chat_history.append({"role": "CHATBOT", "message": msg["content"]})

        last_msg = ""
        for msg in reversed(messages):
            if msg["role"] == "user":
                last_msg = msg["content"]
                break

        body = {
            "model": self.config.model,
            "preamble": preamble.strip() or None,
            "chat_history": chat_history,
            "message": last_msg,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }
        body = {k: v for k, v in body.items() if v is not None}

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.config.api_key}",
                "Cohere-Version": "2024-10-01",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data.get("text", "")
                return LLMResponse(content=content, model=self.config.model, usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"Cohere error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"Cohere request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        # Cohere streaming is more complex, fall back to non-streaming
        response = self.complete(messages, **kwargs)
        if response.content:
            yield LLMResponse.from_chunk(response.content, response.model)

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return False


# ─── Fireworks Backend ────────────────────────────────────────────────────────


class FireworksBackend(LLMBackend):
    """Fireworks AI API."""

    DEFAULT_URL = "https://api.fireworks.ai/inference/v1/chat/completions"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(content=content, model=data.get("model", self.config.model), usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"Fireworks error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"Fireworks request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── Moonshot (Kimi) Backend ───────────────────────────────────────────────────


class MoonshotBackend(LLMBackend):
    """Moonshot AI (Kimi) API."""

    DEFAULT_URL = "https://api.moonshot.cn/v1/chat/completions"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(content=content, model=data.get("model", self.config.model), usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"Moonshot error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"Moonshot request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── xAI (Grok) Backend ────────────────────────────────────────────────────────


class XAIBackend(LLMBackend):
    """xAI (Grok) API."""

    DEFAULT_URL = "https://api.x.ai/v1/chat/completions"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(content=content, model=data.get("model", self.config.model), usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"xAI error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"xAI request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/") + "/chat/completions"
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── Custom / Generic OpenAI-Compatible Backend ───────────────────────────────


class CustomBackend(LLMBackend):
    """Generic OpenAI-compatible API — for custom deployments."""

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        if not self.config.base_url:
            raise LLMError("Custom backend requires base_url")

        url = self.config.base_url.rstrip("/")
        # Try common paths
        for path in ["/v1/chat/completions", "/chat/completions", "/completions"]:
            try_url = url + path
            body = self._build_body(messages, self.config.model, stream=False, **kwargs)
            # Some custom backends don't support seed
            body.pop("seed", None)

            req = urllib.request.Request(
                try_url,
                data=json.dumps(body).encode("utf-8"),
                headers=self._default_headers(self.config.api_key),
                method="POST",
            )

            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    content = ""
                    if "choices" in data:
                        content = data["choices"][0]["message"].get("content", "")
                    elif "text" in data:
                        content = data["text"]
                    elif "output" in data:
                        content = data["output"]
                    return LLMResponse(content=content, model=data.get("model", self.config.model), usage=data.get("usage", {}), raw=data)
            except (urllib.error.HTTPError, Exception):
                continue

        raise LLMError(f"Custom backend: no compatible endpoint found at {url}")

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        if not self.config.base_url:
            raise LLMError("Custom backend requires base_url")

        url = self.config.base_url.rstrip("/")
        for path in ["/v1/chat/completions", "/chat/completions"]:
            try_url = url + path
            body = self._build_body(messages, self.config.model, stream=True, **kwargs)
            body.pop("seed", None)

            req = urllib.request.Request(
                try_url,
                data=json.dumps(body).encode("utf-8"),
                headers=self._default_headers(self.config.api_key),
                method="POST",
            )

            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    for line in resp:
                        line = line.decode("utf-8").strip()
                        if not line or not line.startswith("data: "):
                            continue
                        data_str = line[7:]
                        if data_str == "[DONE]":
                            return
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            if "content" in delta:
                                yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                        except json.JSONDecodeError:
                            continue
                    return
            except Exception:
                continue

        raise LLMError("Custom backend: streaming not available")

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── Perplexity Backend ────────────────────────────────────────────────────────


class PerplexityBackend(LLMBackend):
    """Perplexity Sonar API."""

    DEFAULT_URL = "https://api.perplexity.ai/chat/completions"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)
        # Perplexity uses meta to enable web search
        body["model"] = self.config.model

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(content=content, model=data.get("model", self.config.model), usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"Perplexity error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"Perplexity request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── Pollinations Backend ──────────────────────────────────────────────────────


class PollinationsBackend(LLMBackend):
    """Pollinations — free model aggregator."""

    DEFAULT_URL = "https://api.ppollinations.com"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        model = self.config.model or "openai"
        url = f"{(self.config.base_url or self.DEFAULT_URL).rstrip('/')}/v1/chat/completions"
        body = self._build_body(messages, model, stream=False, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(content=content, model=data.get("model", model), usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"Pollinations error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"Pollinations request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        model = self.config.model or "openai"
        url = f"{(self.config.base_url or self.DEFAULT_URL).rstrip('/')}/v1/chat/completions"
        body = self._build_body(messages, model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── SiliconFlow Backend ──────────────────────────────────────────────────────


class SiliconFlowBackend(LLMBackend):
    """SiliconFlow API."""

    DEFAULT_URL = "https://api.siliconflow.cn/v1/chat/completions"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(content=content, model=data.get("model", self.config.model), usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"SiliconFlow error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"SiliconFlow request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── AIML API Backend ─────────────────────────────────────────────────────────


class AIMLAPIBackend(LLMBackend):
    """AIML API."""

    DEFAULT_URL = "https://api.aimlapi.com/v1/chat/completions"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(content=content, model=data.get("model", self.config.model), usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"AIML API error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"AIML API request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── Z.AI Backend ──────────────────────────────────────────────────────────────


class ZAIBackend(LLMBackend):
    """Z.AI API."""

    DEFAULT_URL = "https://api.z.ai/v1/chat/completions"

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        body = self._build_body(messages, self.config.model, stream=False, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"].get("content", "")
                return LLMResponse(content=content, model=data.get("model", self.config.model), usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"Z.AI error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"Z.AI request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        url = (self.config.base_url or self.DEFAULT_URL).rstrip("/")
        body = self._build_body(messages, self.config.model, stream=True, **kwargs)

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=self._default_headers(self.config.api_key),
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=120) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    delta = data["choices"][0].get("delta", {})
                    if "content" in delta:
                        yield LLMResponse.from_chunk(delta["content"], data.get("model", self.config.model))
                except json.JSONDecodeError:
                    continue

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True


# ─── TextGen Backends (Ooba/Mancer/vLLM/etc.) ────────────────────────────────


class RulesBackend(LLMBackend):
    """Rule-based backend for public welfare taverns. Returns local responses."""

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        # Simple reactive logic
        user_msg = ""
        system_prompt = ""
        for msg in messages:
            if msg["role"] == "user":
                user_msg = msg["content"]
            elif msg["role"] == "system":
                system_prompt = msg["content"]
        
        content = f"（提示：此区域目前使用规则引擎响应）\n我很理解你的意思。关于“{user_msg[:20]}”，作为这里的向导，我会说：在现实的锚点上，我们每个人都在寻找属于自己的那枚徽章。你觉得呢？"
        
        if "阿衡" in system_prompt or "英雄" in system_prompt:
            content = f"阿衡放下手里的镊子，抬头看你一眼：“{user_msg[:30]}”——这种事，写在英雄卡上可能不太起眼，但在我这柜台里，它值得一个位置。你想把它放哪儿？"

        return LLMResponse(
            content=content,
            model=self.config.model,
            usage={"prompt_tokens": 0, "completion_tokens": 0},
        )

    def count_tokens(self, text: str) -> int:
        return 0

    def supports_streaming(self) -> bool:
        return False


class TextGenBackend(LLMBackend):
    """Text completion backend (Ooba, Mancer, vLLM, Tabby, KoboldCPP, etc.)."""

    def complete(self, messages: list[dict[str, str]], **kwargs) -> LLMResponse:
        import urllib.request
        import urllib.error

        if not self.config.base_url:
            raise LLMError("TextGen backend requires base_url")

        # Build prompt from messages
        prompt = self._messages_to_prompt(messages)

        # Determine endpoint
        url = self.config.base_url.rstrip("/")
        if self.config.backend in ("ooba", "tabby", "mancer", "vllm", "aphrodite"):
            url += "/v1/completions"
        elif self.config.backend == "koboldcpp":
            url += "/v1/generate"
        elif self.config.backend == "ollama":
            url = url.rstrip("/") + "/api/generate"
        else:
            url += "/v1/completions"

        body = {
            "prompt": prompt,
            "max_tokens": self.config.max_tokens,
            "temperature": self.config.temperature,
            "top_p": self.config.top_p,
            "stream": False,
        }
        if self.config.frequency_penalty:
            body["frequency_penalty"] = self.config.frequency_penalty
        if self.config.presence_penalty:
            body["presence_penalty"] = self.config.presence_penalty
        if self.config.seed >= 0:
            body["seed"] = self.config.seed

        headers = {"Content-Type": "application/json"}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = ""
                if "choices" in data:
                    content = data["choices"][0].get("text", "")
                elif "text" in data:
                    content = data["text"]
                elif "content" in data:
                    content = data["content"]
                elif "response" in data:
                    content = data["response"]
                return LLMResponse(content=content, model=self.config.model, usage=data.get("usage", {}), raw=data)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            raise LLMError(f"TextGen error {e.code}: {error_body[:200]}") from e
        except Exception as e:
            raise LLMError(f"TextGen request failed: {e}") from e

    def complete_stream(self, messages: list[dict[str, str]], **kwargs) -> Generator[LLMResponse, None, None]:
        import urllib.request

        if not self.config.base_url:
            raise LLMError("TextGen backend requires base_url")

        prompt = self._messages_to_prompt(messages)
        url = self.config.base_url.rstrip("/")
        if self.config.backend in ("ooba", "tabby", "mancer", "vllm", "aphrodite"):
            url += "/v1/completions"
        else:
            url += "/v1/completions"

        body = {
            "prompt": prompt,
            "max_tokens": self.config.max_tokens,
            "temperature": self.config.temperature,
            "top_p": self.config.top_p,
            "stream": True,
        }

        headers = {"Content-Type": "application/json"}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers=headers,
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=300) as resp:
            for line in resp:
                line = line.decode("utf-8").strip()
                if not line or not line.startswith("data: "):
                    continue
                data_str = line[7:]
                if data_str == "[DONE]":
                    break
                try:
                    data = json.loads(data_str)
                    text = data.get("choices", [{}])[0].get("text", "")
                    if text:
                        yield LLMResponse.from_chunk(text, self.config.model)
                except json.JSONDecodeError:
                    continue

    def _messages_to_prompt(self, messages: list[dict[str, str]]) -> str:
        """Convert chat messages to text prompt for completion models."""
        parts = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                parts.append(f"### System:\n{content}\n")
            elif role == "user":
                parts.append(f"### User:\n{content}\n")
            elif role == "assistant":
                parts.append(f"### Assistant:\n{content}\n")
        parts.append("### Assistant:\n")
        return "\n".join(parts)

    def count_tokens(self, text: str) -> int:
        return self._estimate_tokens(text)

    def supports_streaming(self) -> bool:
        return True



class MakerSuiteBackend(LLMBackend):
    """Google AI Studio (Gemini) API."""

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

# ─── Factory ──────────────────────────────────────────────────────────────────


# Backend registry
_BACKENDS: dict[str, type[LLMBackend]] = {
    # Chat completion backends
    "openai": OpenAIBackend,
    "claude": ClaudeBackend,
    "openrouter": OpenRouterBackend,
    "ollama": OllamaBackend,
    "groq": GroqBackend,
    "deepseek": DeepSeekBackend,
    "mistral": MistralBackend,
    "cohere": CohereBackend,
    "fireworks": FireworksBackend,
    "moonshot": MoonshotBackend,
    "xai": XAIBackend,
    "perplexity": PerplexityBackend,
    "pollinations": PollinationsBackend,
    "siliconflow": SiliconFlowBackend,
    "aimlapi": AIMLAPIBackend,
    "zai": ZAIBackend,
    "azure_openai": AzureOpenAIBackend,
    "custom": CustomBackend,
    # TextGen backends
    "ooba": TextGenBackend,
    "mancer": TextGenBackend,
    "vllm": TextGenBackend,
    "aphrodite": TextGenBackend,
    "tabby": TextGenBackend,
    "koboldcpp": TextGenBackend,
    "togetherai": TextGenBackend,
    "llamacpp": TextGenBackend,
    "infermaticai": TextGenBackend,
    "dreamgen": TextGenBackend,
    "featherless": TextGenBackend,
    "huggingface": TextGenBackend,
    "generic": TextGenBackend,
    "gemini": MakerSuiteBackend,
    "makersuite": MakerSuiteBackend,
    "rules": RulesBackend,
    # Backward compatibility
    "local": OllamaBackend,  # alias
}


class LLMError(Exception):
    """Exception raised when LLM API call fails."""
    pass


def create_client(config: LLMConfig) -> LLMBackend:
    """Factory: create an LLM backend client from config."""
    backend_cls = _BACKENDS.get(config.backend.lower())
    if not backend_cls:
        available = ", ".join(sorted(_BACKENDS.keys()))
        raise LLMError(
            f"Unknown backend '{config.backend}'. Available: {available}"
        )
    return backend_cls(config)


def complete(
    config: LLMConfig,
    messages: list[dict[str, str]],
    stream: bool = False,
    **kwargs,
) -> LLMResponse | Generator[LLMResponse, None, None]:
    """
    Convenience function: create client and call complete() in one step.
    Usage:
        response = complete(config, messages)
        for chunk in complete(config, messages, stream=True):
            print(chunk.content, end="", flush=True)
    """
    client = create_client(config)
    if stream and client.supports_streaming():
        return client.complete_stream(messages, **kwargs)
    return client.complete(messages, **kwargs)


# ─── Default models per backend ───────────────────────────────────────────────


DEFAULT_MODELS: dict[str, str] = {
    "openai": "gpt-4o-mini",
    "claude": "claude-sonnet-4-20250514",
    "openrouter": "openai/gpt-4o-mini",
    "ollama": "llama3.2",
    "groq": "llama-3.3-70b-versatile",
    "deepseek": "deepseek-chat",
    "mistral": "mistral-small-latest",
    "cohere": "command-r-plus",
    "fireworks": "accounts/fireworks/models/llama-v3p3-70b-instruct",
    "moonshot": "moonshot-v1-8k",
    "xai": "grok-2",
    "perplexity": "sonar",
    "pollinations": "openai",
    "siliconflow": "Qwen/Qwen2.5-7B-Instruct",
    "aimlapi": "gpt-4o-mini",
    "zai": "gpt-4o-mini",
    "azure_openai": "",
    "custom": "",
    # TextGen
    "ooba": "",
    "mancer": "",
    "vllm": "",
    "aphrodite": "",
    "tabby": "",
    "koboldcpp": "",
    "togetherai": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "llamacpp": "",
    "infermaticai": "",
    "dreamgen": "",
    "featherless": "",
    "huggingface": "",
    "generic": "",
    "local": "llama3.2",
}


def get_default_model(backend: str) -> str:
    """Get the default model for a given backend."""
    return DEFAULT_MODELS.get(backend.lower(), "")


def list_supported_backends() -> list[dict[str, Any]]:
    """List all supported backends with metadata."""
    return [
        {
            "id": backend_id,
            "class": backend_cls.__name__,
            "supports_streaming": backend_cls(lambda: None).supports_streaming(),
            "is_textgen": backend_cls == TextGenBackend,
            "default_model": DEFAULT_MODELS.get(backend_id, ""),
        }
        for backend_id, backend_cls in _BACKENDS.items()
    ]
