import random
from datetime import datetime, UTC
from typing import Any, Dict

def is_cultivation_space(tavern: Any) -> bool:
    """
    检查空间是否属于修行类型。
    依据 special_type, layout_style 或是否启用了 cultivation-play-pack。
    """
    if not tavern:
        return False
    # 优先检查专门的特殊类型字段
    if getattr(tavern, 'special_type', '') == 'cultivation':
        return True
    # 检查布局风格
    if getattr(tavern, 'layout_style', '') == 'quest-play':
        return True
    # 检查技能包
    skill_packs = getattr(tavern, 'skill_packs', [])
    for pack in skill_packs:
        if isinstance(pack, dict) and pack.get('id') == 'cultivation-play-pack' and pack.get('enabled') is not False:
            return True
    return False

def calculate_cultivation_receipt(tavern: Any, visitor_state: Any, now_iso: str) -> Dict[str, Any]:
    """
    计算离线修行进度并生成一段叙事回执。
    """
    last_visit_iso = visitor_state.last_visit
    if not last_visit_iso:
        return {}
    
    try:
        # 标准化 ISO 时间格式
        now_ts = now_iso.replace('Z', '+00:00')
        last_ts = last_visit_iso.replace('Z', '+00:00')
        now = datetime.fromisoformat(now_ts)
        last = datetime.fromisoformat(last_ts)
        delta = now - last
        hours = delta.total_seconds() / 3600
    except (ValueError, TypeError):
        return {}

    # 至少离线 1 小时才触发结算（避免频繁进入产生碎段回执）
    if hours < 1.0:
        return {}

    # 上限 48 小时，防止长时间不来一次性刷满
    effective_hours = min(hours, 48.0)
    
    # 基础数值模型：1000 修为/小时
    progress_delta = int(effective_hours * 1000)
    
    # 获取原有元数据
    meta = visitor_state.metadata.get('cultivation', {})
    total_progress = meta.get('total_progress', 0) + progress_delta
    
    # 获取 NPC 名称增强代入感
    npc_name = tavern.characters[0].name if tavern.characters else "引路人"
    
    narratives = [
        f"你在洞府中闭关修行，感觉周身灵气运行愈发顺畅。{npc_name}曾在大门外为你护法，见你进境神速，略感欣慰。",
        f"这段时间你一直在参悟《长生经》，虽然进展缓慢，但心境却开阔了许多，举手投足间初现出尘之气。",
        f"你离开空间前往后山灵泉边静坐，听泉鸣鹤唳，修为不知不觉中已有精进。{npc_name}评价说这是“顿悟”的前兆。",
        f"梦中你回到了问道茶寮，与{npc_name}论道良久，醒来后只觉灵台清明，往日滞涩的经脉已豁然贯通。",
        f"你在山门附近的药园打理灵草，虽是杂务，却在俯仰间感受到了草木枯荣的生机力量，灵力随之律动。",
    ]
    summary = random.choice(narratives)
    
    receipt = {
        "title": "修行感悟 / 历练回执",
        "summary": summary,
        "hours": round(hours, 1),
        "effective_hours": round(effective_hours, 1),
        "progress_delta": progress_delta,
        "total_progress": total_progress,
        "timestamp": now_iso
    }
    
    # 更新元数据
    visitor_state.metadata['cultivation'] = {
        "total_progress": total_progress,
        "last_receipt": receipt,
        "updated_at": now_iso
    }
    
    return receipt

def update_cultivation_chat_count(visitor_state: Any) -> None:
    """
    增加对话轮次计数。
    """
    meta = visitor_state.metadata.setdefault('cultivation', {})
    meta['chat_count'] = meta.get('chat_count', 0) + 1

def get_progression_status(visitor_state: Any) -> Dict[str, Any]:
    """
    获取当前的修行进度、境界以及距离下一境界的差距。
    """
    meta = visitor_state.metadata.get('cultivation', {})
    progress = meta.get('total_progress', 0)
    chat_count = meta.get('chat_count', 0)
    visit_count = visitor_state.visit_count or 0
    
    # 境界定义
    thresholds = [
        {"stage": "炼气", "progress": 0, "chats": 0, "visits": 0},
        {"stage": "筑基", "progress": 5000, "chats": 10, "visits": 2},
        {"stage": "金丹", "progress": 20000, "chats": 40, "visits": 5},
        {"stage": "元婴", "progress": 100000, "chats": 150, "visits": 15},
        {"stage": "化神", "progress": 500000, "chats": 500, "visits": 30},
    ]
    
    current_stage = thresholds[0]
    next_stage = None
    
    for i, t in enumerate(thresholds):
        if progress >= t['progress'] and chat_count >= t['chats'] and visit_count >= t['visits']:
            current_stage = t
            if i + 1 < len(thresholds):
                next_stage = thresholds[i+1]
        else:
            next_stage = t
            break
            
    # 计算百分比 (针对 progress)
    if next_stage:
        prev_progress = current_stage['progress']
        target_progress = next_stage['progress']
        if target_progress > prev_progress:
            percent = min(100, int((progress - prev_progress) / (target_progress - prev_progress) * 100))
        else:
            percent = 100
    else:
        percent = 100

    return {
        "current_stage": current_stage['stage'],
        "next_stage": next_stage['stage'] if next_stage else "登峰造极",
        "progress": progress,
        "chat_count": chat_count,
        "visit_count": visit_count,
        "percent": percent,
        "requirements": next_stage if next_stage else None,
        "collection": meta.get('collection', [])
    }

def grant_cultivation_card(visitor_state: Any, card_type: str, title: str, summary: str, image: str = "") -> Dict[str, Any]:
    """
    为访客颁发一张修行卡片（成就/纪要/线索）。
    """
    import uuid
    meta = visitor_state.metadata.setdefault('cultivation', {})
    collection = meta.setdefault('collection', [])
    
    # 避免重复颁发完全相同的标题（简单去重）
    for card in collection:
        if card.get('title') == title and card.get('type') == card_type:
            return card

    new_card = {
        "id": f"card_{uuid.uuid4().hex[:12]}",
        "type": card_type, # retreat | mind | message | clue | stage
        "title": title,
        "summary": summary,
        "image": image or "/assets/cultivation/cards/default_card.webp",
        "timestamp": datetime.now(UTC).isoformat()
    }
    
    collection.append(new_card)
    return new_card

# 覆盖原有的 calculate_cultivation_receipt 以支持卡片颁发
def calculate_cultivation_receipt_with_card(tavern: Any, visitor_state: Any, now_iso: str) -> Dict[str, Any]:
    receipt = calculate_cultivation_receipt(tavern, visitor_state, now_iso)
    if receipt and receipt.get('effective_hours', 0) >= 4.0:
        # 如果闭关超过 4 小时，颁发一张闭关纪要卡
        grant_cultivation_card(
            visitor_state, 
            "retreat", 
            f"闭关纪要：{receipt['hours']}小时", 
            receipt['summary']
        )
    return receipt
