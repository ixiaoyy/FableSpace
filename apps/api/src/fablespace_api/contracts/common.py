from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class FlexibleBody(BaseModel):
    """Base model for dynamic request payloads."""

    model_config = ConfigDict(extra="allow")

    def to_payload(self) -> dict[str, Any]:
        payload = self.model_dump(exclude_none=True, by_alias=True)
        payload.update(self.model_extra or {})
        return payload


__all__ = ["FlexibleBody"]
