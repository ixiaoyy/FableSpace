from __future__ import annotations

from typing import Any


class SpaceAccessApplicationMixin:
    """Read and enter published story containers during the runtime migration."""

    def get_space(
        self,
        space_id: str,
        user_id: str = "",
        view: str = "",
    ) -> dict[str, Any]:
        space = self._resolve_public_space_reference_or_404(space_id)
        return self.taverns.get_space(space.id, user_id, view=view)

    def enter_space(
        self,
        space_id: str,
        password: str = "",
        user_id: str = "",
        visitor_gender: str = "",
        play_identity_id: str | None = None,
    ) -> dict[str, Any]:
        return self.taverns.enter_space(
            space_id,
            password,
            user_id,
            visitor_gender,
            play_identity_id,
        )
