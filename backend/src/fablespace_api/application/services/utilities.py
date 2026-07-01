from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException

from fablespace_api.core.memory import ChatSummarizer, HistoryTruncator, ImportanceScorer
from fablespace_api.core.token_counter import SUPPORTED_TOKENIZERS, TokenCounter, normalize_tokenizer_backend


logger = logging.getLogger(__name__)


class UtilityApplicationMixin:
    """Prompt-budget and deterministic memory utility use cases."""

    def list_tokenizers(self) -> dict[str, Any]:
        return {"tokenizers": list(SUPPORTED_TOKENIZERS)}

    def count_tokens(self, data: dict[str, Any]) -> dict[str, Any]:
        payload = data or {}
        text = str(payload.get("text") or "")
        backend = normalize_tokenizer_backend(str(payload.get("backend") or "cl100k_base"))
        try:
            counter = TokenCounter(backend)
            return {"count": len(counter.encode(text)), "backend": backend}
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    def count_message_tokens(self, data: dict[str, Any]) -> dict[str, Any]:
        payload = data or {}
        messages = payload.get("messages", [])
        if not isinstance(messages, list):
            raise HTTPException(status_code=400, detail="messages must be a list")
        backend = normalize_tokenizer_backend(str(payload.get("backend") or "cl100k_base"))
        try:
            counter = TokenCounter(backend)
            total = 0
            for message in messages:
                total += len(counter.encode(self._token_count_message_content(message)))
            return {"count": total, "backend": backend}
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    def summarize_memory(self, data: dict[str, Any]) -> dict[str, Any]:
        payload = data or {}
        messages = payload.get("messages", [])
        if not isinstance(messages, list):
            raise HTTPException(status_code=400, detail="messages must be a list")
        strategy = str(payload.get("strategy") or "incremental").strip() or "incremental"
        previous_summary = str(payload.get("previous_summary") or "")
        summarizer = ChatSummarizer(llm_client=None)
        if not summarizer.llm_client:
            raise HTTPException(status_code=501, detail="LLM client not configured for summarization")
        try:
            return {"summary": summarizer.summarize(messages, strategy, previous_summary)}
        except Exception as exc:
            logger.warning("Memory summarization failed: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def truncate_memory(self, data: dict[str, Any]) -> dict[str, Any]:
        payload = data or {}
        messages = payload.get("messages", [])
        if not isinstance(messages, list):
            raise HTTPException(status_code=400, detail="messages must be a list")
        max_tokens = self._safe_int(payload.get("max_tokens"), 8192)
        if max_tokens <= 0:
            max_tokens = 8192
        try:
            truncator = HistoryTruncator()
            truncated = truncator.truncate(messages, max_tokens)
            return {"messages": truncated, "count": len(truncated)}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

    def score_memory_importance(self, data: dict[str, Any]) -> dict[str, Any]:
        payload = data or {}
        messages = payload.get("messages", [])
        if not isinstance(messages, list):
            raise HTTPException(status_code=400, detail="messages must be a list")
        scorer = ImportanceScorer()
        try:
            scores = [{"index": index, "importance": scorer.score(message)} for index, message in enumerate(messages)]
            return {"scores": scores}
        except Exception as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    def _token_count_message_content(self, message: Any) -> str:
        if not isinstance(message, dict):
            raise HTTPException(status_code=400, detail="messages must contain objects")
        content = message.get("content", "")
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if isinstance(item, dict):
                    if item.get("text") is not None:
                        parts.append(str(item.get("text") or ""))
                    elif item.get("content") is not None:
                        parts.append(str(item.get("content") or ""))
                elif item is not None:
                    parts.append(str(item))
            return "\n".join(part for part in parts if part)
        if isinstance(content, dict):
            if content.get("text") is not None:
                return str(content.get("text") or "")
            if content.get("content") is not None:
                return str(content.get("content") or "")
        return str(content)
