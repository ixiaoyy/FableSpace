from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class EnterSpaceRequest(BaseModel):
    visitor_gender: str = ""
    play_identity_id: Literal["beggar"] | None = None


__all__ = ["EnterSpaceRequest"]
