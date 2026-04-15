from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8950
DEFAULT_OUTPUT_ROOT = REPO_ROOT / ".fablemap-api"
DEFAULT_FIXTURE_FILE = REPO_ROOT / "tests" / "fixtures" / "overpass_sample.json"
DEFAULT_FRONTEND_ROOT = REPO_ROOT / "frontend"
DEFAULT_FRONTEND_DIST_DIRNAME = "dist"
DEFAULT_FRONTEND_PUBLIC_DIRNAME = "public"


@dataclass(frozen=True)
class ApiSettings:
    output_root: Path = DEFAULT_OUTPUT_ROOT
    fixture_file: Path | None = DEFAULT_FIXTURE_FILE
    frontend_root: Path | None = DEFAULT_FRONTEND_ROOT
    frontend_dist: Path | None = None
    frontend_public: Path | None = None
    sillytavern_url: str = "http://127.0.0.1:8000"

    def resolved(self) -> "ApiSettings":
        resolved_frontend_root = self.frontend_root.resolve() if self.frontend_root else None
        resolved_frontend_dist = self.frontend_dist.resolve() if self.frontend_dist else None
        resolved_frontend_public = self.frontend_public.resolve() if self.frontend_public else None
        if resolved_frontend_dist is None and resolved_frontend_root is not None:
            resolved_frontend_dist = resolved_frontend_root / DEFAULT_FRONTEND_DIST_DIRNAME
        if resolved_frontend_public is None and resolved_frontend_root is not None:
            resolved_frontend_public = resolved_frontend_root / DEFAULT_FRONTEND_PUBLIC_DIRNAME
        return ApiSettings(
            output_root=self.output_root.resolve(),
            fixture_file=self.fixture_file.resolve() if self.fixture_file else None,
            frontend_root=resolved_frontend_root,
            frontend_dist=resolved_frontend_dist,
            frontend_public=resolved_frontend_public,
        )
