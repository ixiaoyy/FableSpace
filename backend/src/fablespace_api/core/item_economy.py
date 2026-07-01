"""
叙事道具经济系统（Item Economy）

提供：
- 默认物品目录 DEFAULT_ITEM_CATALOG
- NPC 对话中 [GIVE:物品名:数量] 标记的解析
- 金币计算与账本写入
- 文本清洗（移除标记）
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

# ─── 常量 ───────────────────────────────────────────────────────────────────

# 触发馈赠所需的最低关系阶段（含）
GIFT_MIN_STAGE = "familiar"

# 阶段排序（数字越大越亲近）
_STAGE_ORDER = {
    "stranger": 0,
    "acquaintance": 1,
    "familiar": 2,
    "friend": 3,
    "close_friend": 4,
    "best_friend": 5,
}


def _stage_qualifies(stage: str) -> bool:
    """判断关系阶段是否达到馈赠门槛"""
    return _STAGE_ORDER.get(stage, 0) >= _STAGE_ORDER.get(GIFT_MIN_STAGE, 2)


# ─── 物品定义 ────────────────────────────────────────────────────────────────


@dataclass
class ItemDefinition:
    """单个物品的定义"""
    id: str
    name: str
    coin_value: int
    icon: str = ""
    description: str = ""


# 全局默认物品表（空间未配置时使用）
DEFAULT_ITEM_CATALOG: list[ItemDefinition] = [
    ItemDefinition(id="item_fish",       name="小鱼",   coin_value=2, icon="🐟", description="新鲜的小鱼"),
    ItemDefinition(id="item_tea",        name="热茶",   coin_value=1, icon="🍵", description="一杯暖茶"),
    ItemDefinition(id="item_badge",      name="纸徽章", coin_value=3, icon="🏅", description="手工制作的纸质徽章"),
    ItemDefinition(id="item_old_coin",   name="旧硬币", coin_value=1, icon="🪙", description="一枚旧硬币"),
    ItemDefinition(id="item_dried_fish", name="鱼干",   coin_value=5, icon="🐡", description="猫铃空间特产鱼干"),
    ItemDefinition(id="item_clue_card",  name="线索卡", coin_value=3, icon="📋", description="委托板发出的线索卡"),
    ItemDefinition(id="item_lucky_star", name="幸运星", coin_value=1, icon="⭐", description="折纸幸运星"),
    ItemDefinition(id="item_candy",      name="糖果",   coin_value=1, icon="🍬", description="普通糖果"),
    ItemDefinition(id="item_book",       name="旧书",   coin_value=4, icon="📖", description="一本旧书"),
    ItemDefinition(id="item_flower",     name="小花",   coin_value=2, icon="🌸", description="路边摘的小花"),
]

# 名称 → 物品定义的快查表
_DEFAULT_CATALOG_BY_NAME: dict[str, ItemDefinition] = {
    item.name: item for item in DEFAULT_ITEM_CATALOG
}

# ─── 标记解析 ────────────────────────────────────────────────────────────────

# 匹配 [GIVE:物品名:数量] 格式
_GIVE_TAG_PATTERN = re.compile(r'\[GIVE:([^:\]]+):(\d+)\]')


@dataclass
class GiveEvent:
    """一次 NPC 给予事件"""
    item_name: str
    quantity: int
    coin_value_each: int
    total_coins: int


def parse_give_tags(text: str, catalog: list[ItemDefinition] | None = None) -> list[GiveEvent]:
    """
    从 LLM 返回文本中解析 [GIVE:物品名:数量] 标记。

    Args:
        text: LLM 返回的原始文本
        catalog: 物品目录（None 则使用默认目录）

    Returns:
        GiveEvent 列表
    """
    if catalog is None:
        catalog = DEFAULT_ITEM_CATALOG

    name_map: dict[str, ItemDefinition] = {item.name: item for item in catalog}
    # fallback to default catalog
    name_map.update({k: v for k, v in _DEFAULT_CATALOG_BY_NAME.items() if k not in name_map})

    events: list[GiveEvent] = []
    for match in _GIVE_TAG_PATTERN.finditer(text):
        item_name = match.group(1).strip()
        quantity = int(match.group(2))
        item_def = name_map.get(item_name)
        if item_def:
            events.append(GiveEvent(
                item_name=item_name,
                quantity=quantity,
                coin_value_each=item_def.coin_value,
                total_coins=item_def.coin_value * quantity,
            ))
        # 未知物品：跳过（不发放金币，但仍清除标记）
    return events


def strip_give_tags(text: str) -> str:
    """
    从文本中移除所有 [GIVE:...] 标记，返回干净的展示文本。

    Args:
        text: 含标记的原始文本

    Returns:
        移除标记后的文本（自动清理多余空白）
    """
    cleaned = _GIVE_TAG_PATTERN.sub('', text)
    # 清理可能产生的多余空行
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


def calculate_total_coins(events: list[GiveEvent]) -> int:
    """计算给予事件的总金币数"""
    return sum(e.total_coins for e in events)


# ─── 钱包更新 ────────────────────────────────────────────────────────────────

def apply_gifts_to_wallet(
    wallet: dict[str, Any],
    ledger: list[dict[str, Any]],
    events: list[GiveEvent],
    source_id: str = "",
    character_id: str = "",
    created_at: str = "",
) -> dict[str, Any]:
    """
    将给予事件的金币写入访客钱包，并记录账本。

    Args:
        wallet: VisitorEngagementProgress.wallet dict（in-place 修改）
        ledger: VisitorEngagementProgress.ledger list（in-place 修改）
        events: GiveEvent 列表
        source_id: 来源消息 ID
        character_id: 给予物品的 NPC ID
        created_at: ISO 时间戳

    Returns:
        包含本次事务汇总的 dict
    """
    import uuid
    from datetime import datetime, timezone

    if not events:
        return {"coins_added": 0, "events": []}

    if not created_at:
        created_at = datetime.now(timezone.utc).isoformat()

    total = calculate_total_coins(events)

    # 更新钱包余额
    wallet["balance"] = wallet.get("balance", 0) + total
    wallet["lifetime_earned"] = wallet.get("lifetime_earned", 0) + total

    # 写入账本
    for event in events:
        ledger.append({
            "id": f"led_{uuid.uuid4().hex[:12]}",
            "type": "earn",
            "source_type": "npc_gift",
            "source_id": source_id,
            "character_id": character_id,
            "item_name": event.item_name,
            "quantity": event.quantity,
            "amount": event.total_coins,
            "created_at": created_at,
        })

    return {
        "coins_added": total,
        "events": [
            {
                "item_name": e.item_name,
                "quantity": e.quantity,
                "coins": e.total_coins,
            }
            for e in events
        ],
    }


# ─── 公共接口 ──────────────────────────────────────────────────────────────────

def process_npc_response(
    llm_text: str,
    *,
    relationship_stage: str = "stranger",
    catalog: list[ItemDefinition] | None = None,
    wallet: dict[str, Any] | None = None,
    ledger: list[dict[str, Any]] | None = None,
    source_id: str = "",
    character_id: str = "",
    created_at: str = "",
) -> dict[str, Any]:
    """
    一站式处理 NPC 回复：解析物品标记 → 计算金币 → 更新钱包 → 清洗文本。

    Args:
        llm_text: LLM 原始返回文本
        catalog: 物品目录（None 则使用默认）
        wallet: 访客钱包 dict（None 则只计算不写入）
        ledger: 账本 list（None 则不记录）
        source_id: 来源消息 ID
        character_id: NPC ID
        created_at: ISO 时间戳

    Returns:
        {
            "clean_text": str,           # 移除标记后的文本
            "coins_added": int,          # 本次发放金币数
            "events": list[dict],        # 给予事件列表
            "wallet_balance": int | None # 更新后余额（仅 wallet 非 None 时）
        }
    """
    events = parse_give_tags(llm_text, catalog)
    clean_text = strip_give_tags(llm_text)

    # 关系未达门槛：清除标记但不发放金币
    txn = {"coins_added": 0, "events": []}
    if events and wallet is not None and _stage_qualifies(relationship_stage):
        if ledger is None:
            ledger = []
        txn = apply_gifts_to_wallet(
            wallet, ledger, events,
            source_id=source_id,
            character_id=character_id,
            created_at=created_at,
        )

    return {
        "clean_text": clean_text,
        "coins_added": txn["coins_added"],
        "events": txn.get("events", []),
        "wallet_balance": wallet.get("balance") if wallet is not None else None,
    }


__all__ = [
    "ItemDefinition",
    "DEFAULT_ITEM_CATALOG",
    "GiveEvent",
    "parse_give_tags",
    "strip_give_tags",
    "calculate_total_coins",
    "apply_gifts_to_wallet",
    "process_npc_response",
]
