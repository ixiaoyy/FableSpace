import pytest

from fablemap.output_rules import apply_output_rules
from fablemap.web.config import ApiSettings


def test_apply_output_rules_removes_roleplay_breaking_prefixes_and_keeps_going_on_bad_regex():
    result = apply_output_rules("作为AI语言模型，（OOC：解释）剧情总结：柜台后的灯亮了。\n\n\n雨还在下。")

    assert result["changed"] is True
    assert result["text"].startswith("柜台后的灯亮了。")
    assert "\n\n\n" not in result["text"]
    assert [item["id"] for item in result["applied"]] == [
        "anti_ai_disclaimer",
        "remove_ooc_prefix",
        "remove_meta_heading",
        "collapse_blank_lines",
    ]

    bad = apply_output_rules(
        "hello",
        [{"id": "bad_regex", "name": "坏正则", "enabled": True, "pattern": "(", "replacement": ""}],
    )
    assert bad["text"] == "hello"
    assert bad["errors"][0]["id"] == "bad_regex"


def test_output_rules_api_save_preview_and_authz(tmp_path):
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient
    from fablemap.web.app import create_web_app

    app = create_web_app(ApiSettings(output_root=tmp_path, fixture_file=None, frontend_root=None))
    headers = {"X-User-Id": "owner_output_rules"}

    with TestClient(app) as client:
        tavern_response = client.post(
            "/api/taverns",
            headers=headers,
            json={
                "id": "tavern_output_rules",
                "name": "Output Rules Tavern",
                "description": "A tavern for output rule tests.",
                "lat": 31.23,
                "lon": 121.47,
            },
        )
        assert tavern_response.status_code == 200

        default_response = client.get("/api/taverns/tavern_output_rules/output-rules", headers=headers)
        assert default_response.status_code == 200
        assert len(default_response.json()["rules"]) >= 3

        rules = [
            {
                "id": "remove_narrator",
                "name": "去除旁白前缀",
                "enabled": True,
                "kind": "regex",
                "pattern": "^旁白[:：]\\s*",
                "replacement": "",
                "flags": {"ignore_case": False, "multiline": False, "dotall": False},
            }
        ]
        save_response = client.put(
            "/api/taverns/tavern_output_rules/output-rules",
            headers=headers,
            json={"rules": rules},
        )
        assert save_response.status_code == 200
        assert save_response.json()["rules"][0]["id"] == "remove_narrator"

        preview_response = client.post(
            "/api/taverns/tavern_output_rules/output-rules/test",
            headers=headers,
            json={"text": "旁白：雨停了。"},
        )
        assert preview_response.status_code == 200
        preview = preview_response.json()
        assert preview["changed"] is True
        assert preview["text"] == "雨停了。"
        assert preview["applied"][0]["id"] == "remove_narrator"

        forbidden = client.put(
            "/api/taverns/tavern_output_rules/output-rules",
            headers={"X-User-Id": "other_owner"},
            json={"rules": []},
        )
        assert forbidden.status_code == 403
