from __future__ import annotations

from typing import Any

from pydantic import Field

from .common import FlexibleBody


class CharacterWriteRequest(FlexibleBody):
    name: str | None = None
    description: str | None = None
    personality: str | None = None
    scenario: str | None = None
    system_prompt: str | None = None
    first_mes: str | None = None
    tags: list[str] | None = None


class CharacterImportRequest(FlexibleBody):
    data: dict[str, Any] | None = None
    spec: str | None = None
    spec_version: str | None = None


class SpriteMapWriteRequest(FlexibleBody):
    sprites: dict[str, Any] | None = None


class ExpressionInferRequest(FlexibleBody):
    text: str | None = None
    character_name: str | None = None
    tavern_id: str | None = None
    character_id: str | None = None


class CharacterCardParseRequest(FlexibleBody):
    json_payload: dict[str, Any] | None = Field(default=None, alias="json")
    base64: str | None = None


class CharacterCardExportRequest(FlexibleBody):
    character: dict[str, Any] | None = None
    format: str | None = None


__all__ = [
    "CharacterCardExportRequest",
    "CharacterCardParseRequest",
    "CharacterImportRequest",
    "CharacterWriteRequest",
    "ExpressionInferRequest",
    "SpriteMapWriteRequest",
]
