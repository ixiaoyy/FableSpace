from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_OUTPUT_ROOT = REPO_ROOT / ".fablemap-api"
DEFAULT_FIXTURE_FILE = REPO_ROOT / "tests" / "fixtures" / "overpass_sample.json"
DEFAULT_FRONTEND_ROOT = REPO_ROOT / "frontend"


def _default_mysql_url() -> str:
    """从环境变量获取 MySQL URL，默认空（使用 JSON 文件存储）"""
    return os.environ.get("FABLEMAP_MYSQL_URL", "")


@dataclass(frozen=True)
class ApiSettings:
    app_name: str = "FableMap API"
    api_version: str = "0.1.0-enterprise-native"
    cors_origins: list[str] = field(default_factory=lambda: ["http://127.0.0.1:5173", "http://localhost:5173"])
    output_root: Path = DEFAULT_OUTPUT_ROOT
    fixture_file: Path | None = DEFAULT_FIXTURE_FILE
    frontend_root: Path | None = DEFAULT_FRONTEND_ROOT
    sillytavern_url: str = "http://127.0.0.1:8000"

    # MySQL 配置
    mysql_url: str = field(default_factory=_default_mysql_url)
    mysql_pool_size: int = 5
    mysql_max_overflow: int = 10
    mysql_echo: bool = False
