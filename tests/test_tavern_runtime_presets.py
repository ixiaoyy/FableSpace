import pytest

from fablemap.presets import default_runtime_presets, normalize_runtime_presets, safe_llm_preset_config
from fablemap.web.config import ApiSettings


def test_runtime_presets_strip_secrets_and_include_default_bundles():
    safe = safe_llm_preset_config(
        {
            "backend": "openai",
            "model": "gpt-4o-mini",
            "api_key": "sk-secret",
            "token_used": 999,
            "temperature": "1.2",
            "max_tokens": "8192",
            "top_p": "0.8",
        }
    )

    assert safe == {
        "backend": "openai",
        "model": "gpt-4o-mini",
        "temperature": 1.2,
        "max_tokens": 8192,
        "top_p": 0.8,
    }
    assert "api_key" not in safe
    assert "token_used" not in safe

    defaults = default_runtime_presets()
    assert len(defaults) >= 3
    assert defaults[0]["prompt_blocks"]
    assert defaults[0]["output_rules"]
    assert defaults[0]["memory_policy"]["mode"] == "visitor_state"


def test_runtime_presets_normalize_custom_payload():
    presets = normalize_runtime_presets(
        [
            {
                "id": "custom",
                "name": "自定义",
                "built_in": False,
                "llm_config": {"backend": "deepseek", "api_key": "secret", "temperature": 3},
                "memory_policy": {"mode": "unknown", "budget_tokens": -1},
                "prompt_blocks": [{"id": "x", "name": "X", "type": "bad", "template": "hi"}],
            }
        ]
    )

    assert presets[0]["llm_config"]["temperature"] == 2.0
    assert "api_key" not in presets[0]["llm_config"]
    assert presets[0]["memory_policy"]["mode"] == "visitor_state"
    assert presets[0]["memory_policy"]["budget_tokens"] == 0
    assert presets[0]["prompt_blocks"][0]["type"] == "custom"


def test_runtime_presets_api_save_apply_export_and_authz(tmp_path):
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient
    from fablemap.web.app import create_web_app

    app = create_web_app(ApiSettings(output_root=tmp_path, fixture_file=None, frontend_root=None))
    headers = {"X-User-Id": "owner_runtime_presets"}

    custom_preset = {
        "id": "custom_story_mode",
        "name": "自定义剧情模式",
        "description": "测试运行预设",
        "built_in": False,
        "model_hint": "OpenAI compatible",
        "llm_config": {
            "backend": "openai",
            "model": "gpt-4o-mini",
            "temperature": 1.15,
            "max_tokens": 3072,
            "top_p": 0.88,
            "api_key": "must-not-save",
        },
        "prompt_blocks": [
            {
                "id": "custom_block",
                "name": "自定义段落",
                "enabled": True,
                "type": "custom",
                "order": 5,
                "template": "【预设段落】{{char}}",
                "token_budget": 200,
            }
        ],
        "output_rules": [
            {
                "id": "strip_prefix",
                "name": "去前缀",
                "enabled": True,
                "kind": "literal",
                "pattern": "旁白：",
                "replacement": "",
            }
        ],
        "memory_policy": {
            "mode": "balanced",
            "short_term": True,
            "mid_term": True,
            "long_term": False,
            "budget_tokens": 1500,
        },
    }

    with TestClient(app) as client:
        tavern_response = client.post(
            "/api/taverns",
            headers=headers,
            json={
                "id": "tavern_runtime_presets",
                "name": "Runtime Presets Tavern",
                "description": "A tavern for runtime preset tests.",
                "lat": 31.23,
                "lon": 121.47,
                "llm_config": {
                    "backend": "openai",
                    "model": "gpt-4o-mini",
                    "api_key": "sk-owner-secret",
                    "temperature": 0.7,
                    "max_tokens": 4096,
                    "top_p": 0.95,
                },
            },
        )
        assert tavern_response.status_code == 200

        defaults_response = client.get("/api/taverns/tavern_runtime_presets/runtime-presets", headers=headers)
        assert defaults_response.status_code == 200
        assert len(defaults_response.json()["default_presets"]) >= 3
        assert defaults_response.json()["custom_presets"] == []

        save_response = client.put(
            "/api/taverns/tavern_runtime_presets/runtime-presets",
            headers=headers,
            json={"presets": [custom_preset]},
        )
        assert save_response.status_code == 200
        saved = save_response.json()
        assert [preset["id"] for preset in saved["custom_presets"]] == ["custom_story_mode"]
        assert "api_key" not in saved["custom_presets"][0]["llm_config"]

        apply_response = client.post(
            "/api/taverns/tavern_runtime_presets/runtime-presets/apply",
            headers=headers,
            json={"preset_id": "custom_story_mode"},
        )
        assert apply_response.status_code == 200
        applied = apply_response.json()
        tavern = applied["tavern"]
        assert tavern["active_preset_id"] == "custom_story_mode"
        assert tavern["llm_config"]["temperature"] == 1.15
        assert tavern["llm_config"]["api_key"] == "sk-owner-secret"
        assert tavern["prompt_blocks"][0]["id"] == "custom_block"
        assert tavern["output_rules"][0]["id"] == "strip_prefix"
        assert tavern["memory_policy"]["mode"] == "balanced"

        package_response = client.get("/api/taverns/tavern_runtime_presets/package", headers=headers)
        assert package_response.status_code == 200
        package = package_response.json()
        assert package["active_preset_id"] == "custom_story_mode"
        assert package["runtime_presets"][0]["id"] == "custom_story_mode"
        assert "api_key" not in package["runtime_presets"][0]["llm_config"]
        assert "api_key" not in package["tavern"]["llm_config"]
        assert package["memory_policy"]["mode"] == "balanced"

        forbidden = client.post(
            "/api/taverns/tavern_runtime_presets/runtime-presets/apply",
            headers={"X-User-Id": "other_owner"},
            json={"preset_id": "custom_story_mode"},
        )
        assert forbidden.status_code == 403
