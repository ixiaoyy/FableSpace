from pathlib import Path

from fablemap_api.core.default_taverns import (
    DEFAULT_PUBLIC_WELFARE_NPC_NEUTRAL_ASSETS,
    public_welfare_npc_asset_url,
)
from fablemap_api.core.public_welfare_rules import resolve_public_welfare_tavern_rule_response


ROOT = Path(__file__).resolve().parents[1]


def test_public_welfare_rules_are_config_driven_for_known_taverns():
    assert "立即求助" in resolve_public_welfare_tavern_rule_response(
        tavern_id="pw_hospital_night_care",
        message="胸痛和呼吸困难怎么办",
        character_name="弥夏",
    )
    assert "旧英雄卡" in resolve_public_welfare_tavern_rule_response(
        tavern_id="pw_after_school_hero_supply",
        message="我想取一个英雄名",
        character_name="阿衡",
    )
    assert "高危词" in resolve_public_welfare_tavern_rule_response(
        tavern_id="pw_third_shelf_observatory",
        message="随便吃点什么",
        character_name="9-Delta",
    )
    assert "委托卡" in resolve_public_welfare_tavern_rule_response(
        tavern_id="pw_midnight_commission_board",
        message="我发现一张纸条线索",
        character_name="墨栈",
    )


def test_public_welfare_rule_services_do_not_embed_tavern_id_branches():
    web_service = (ROOT / "backend/src/fablemap_api/core/web/service.py").read_text(encoding="utf-8")
    runtime_service = (ROOT / "backend/src/fablemap_api/application/services/runtime.py").read_text(encoding="utf-8")

    assert 'if tavern_id == "pw_' not in web_service
    assert 'if tavern.id == "pw_' not in runtime_service


def test_public_welfare_default_assets_use_shared_url_builder():
    assert DEFAULT_PUBLIC_WELFARE_NPC_NEUTRAL_ASSETS["char_pw_9_delta"] == public_welfare_npc_asset_url(
        "char_pw_9_delta",
        "neutral",
    )
    assert public_welfare_npc_asset_url("char_pw_9_delta", "joy") == "/assets/npcs/public-welfare/char_pw_9_delta/joy.png"
