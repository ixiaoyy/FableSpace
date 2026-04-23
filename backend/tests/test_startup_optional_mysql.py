from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def test_default_native_app_startup_does_not_require_sqlalchemy(tmp_path: Path) -> None:
    repo_root = Path(__file__).resolve().parents[2]
    script = r"""
import builtins
import sys
from pathlib import Path

real_import = builtins.__import__

def blocked_import(name, globals=None, locals=None, fromlist=(), level=0):
    if name == "sqlalchemy" or name.startswith("sqlalchemy."):
        raise ImportError("blocked sqlalchemy for default-startup smoke test")
    return real_import(name, globals, locals, fromlist, level)

builtins.__import__ = blocked_import

from fastapi.testclient import TestClient
from fablemap_api.infrastructure.settings import ApiSettings
from fablemap_api.main import create_app

app = create_app(ApiSettings(output_root=Path(sys.argv[1]), fixture_file=None, frontend_root=None, mysql_url=""))
response = TestClient(app).get("/api/v1/health")
assert response.status_code == 200, response.text
assert response.json()["ok"] is True
"""
    env = os.environ.copy()
    env.pop("FABLEMAP_MYSQL_URL", None)
    env["PYTHONPATH"] = str(repo_root / "backend" / "src")
    result = subprocess.run(
        [sys.executable, "-c", script, str(tmp_path / "api")],
        cwd=repo_root,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout
