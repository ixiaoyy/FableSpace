"""Production-safe provider probe for the configured StoryWorld dialogue route."""

from __future__ import annotations

import sys
from dataclasses import replace

from .app_factory import build_system_story_llm_config
from .core.llm_clients import LLMError, complete
from .infrastructure.settings import ApiSettings

PROBE_MESSAGES = [
    {"role": "system", "content": "Return a short plain-text response."},
    {"role": "user", "content": "Reply with OK."},
]


def run_story_llm_probe() -> int:
    """Call the configured provider with fixed text and return a process exit code."""

    config = build_system_story_llm_config(ApiSettings())
    if config is None:
        print(
            "story_llm_probe=failed reason=config_unavailable",
            file=sys.stderr,
        )
        return 1

    probe_config = replace(
        config,
        temperature=0.0,
        max_tokens=min(config.max_tokens, 128),
        top_p=1.0,
    )
    try:
        response = complete(probe_config, PROBE_MESSAGES)
    except LLMError as exc:
        diagnostic = exc.diagnostic or type(exc).__name__
        print(
            "story_llm_probe=failed "
            f"backend={config.backend} diagnostic={diagnostic}",
            file=sys.stderr,
        )
        return 1
    except Exception as exc:
        print(
            "story_llm_probe=failed "
            f"backend={config.backend} diagnostic=unexpected_{type(exc).__name__}",
            file=sys.stderr,
        )
        return 1

    if not str(getattr(response, "content", "") or "").strip():
        print(
            f"story_llm_probe=failed backend={config.backend} diagnostic=empty_content",
            file=sys.stderr,
        )
        return 1

    print(f"story_llm_probe=ok backend={config.backend} response=non-empty")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_story_llm_probe())
