from __future__ import annotations

from .common import FlexibleBody


class RoleplayConfigRequest(FlexibleBody):
    roleplay_mode: str | None = None


class RoleplayClaimRequest(FlexibleBody):
    character_id: str | None = None
    player_id: str | None = None
    player_name: str | None = None


class RoleplayClaimDecisionRequest(FlexibleBody):
    status: str | None = None
    note: str | None = None
