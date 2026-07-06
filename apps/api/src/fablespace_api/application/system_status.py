from __future__ import annotations

from ..contracts.health import HealthResponse
from ..infrastructure.settings import ApiSettings


def build_system_status(settings: ApiSettings) -> HealthResponse:
    """Return a stable health payload for deployment and frontend smoke checks."""
    # 使用延迟导入避免触发整个 fablespace_api 包的导入
    from ..domain.platform import PLATFORM_MAINLINE

    return HealthResponse(
        ok=True,
        app_name=settings.app_name,
        api_version=settings.api_version,
        mainline=PLATFORM_MAINLINE,
    )
