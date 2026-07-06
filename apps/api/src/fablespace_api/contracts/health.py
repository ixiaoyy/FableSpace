from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    ok: bool = Field(description="Whether the API process is responding.")
    app_name: str
    api_version: str
    mainline: str


class MetaResponse(BaseModel):
    app_name: str
    api_version: str
    architecture: str
    product: str
