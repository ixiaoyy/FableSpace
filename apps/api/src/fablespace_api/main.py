from __future__ import annotations

from .app_factory import create_app
from .infrastructure.env import load_env_file

load_env_file()
app = create_app()
