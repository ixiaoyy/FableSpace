"""
NPC 仿真引擎 (Simulation Engine)
负责计算 NPC 的生理状态衰减与自主寻路动机。
"""

from __future__ import annotations
import random
from datetime import datetime, UTC
from typing import TYPE_CHECKING, List

if TYPE_CHECKING:
    from .tavern import Tavern, TavernCharacter, NpcSimulationState

# 状态衰减速率（每 Tick 降低的点数，一个 Tick 假设为 15 分钟）
BASE_DECAY_RATES = {
    "energy": 2.0,
    "hunger": 3.0,
    "thirst": 5.0,
    "social": 4.0,
    "entertainment": 2.0
}

# 心情均值回归速率（每 Tick 向 50 靠拢的点数）
MOOD_REGRESSION_RATE = 1.0

# 传闻情绪关键词
_POSITIVE_KEYWORDS: set[str] = {
    "不错", "挺好", "棒", "喜欢", "开心", "有趣", "温馨", "舒适",
    "推荐", "赞", "精彩", "美味", "漂亮", "nice", "good", "great",
}
_NEGATIVE_KEYWORDS: set[str] = {
    "无聊", "差", "糟", "讨厌", "难吃", "吵", "脏", "失望",
    "糟糕", "难受", "无趣", "bad", "boring", "terrible",
}

# 状态回升速率（每 Tick 增加的点数）
RECOVERY_RATES = {
    "energy": 15.0,        # 在 home 休息
    "hunger": 25.0,        # 在 restaurant 进食
    "thirst": 30.0,        # 在 cafe/milk-tea-shop 饮水
    "social": 12.0,        # 在 tavern 社交
    "entertainment": 20.0  # 在 board-game 娱乐
}

# 空间类型与需求的匹配关系
PLACE_RECOVERY_MAP = {
    "home": ["energy"],
    "cafe": ["thirst", "social"],
    "milk-tea-shop": ["thirst"],
    "restaurant": ["hunger"],
    "tavern": ["social", "thirst", "entertainment"],
    "board-game": ["entertainment", "social"],
    "convenience-store": ["hunger", "thirst"],
    "bookstore": ["entertainment"]
}

# 性格特质对衰减率的影响倍率
TRAIT_MULTIPLIERS = {
    "workaholic": {"energy": 0.8, "social": 1.2},
    "glutton": {"hunger": 2.0},
    "socialite": {"social": 1.5, "energy": 1.1},
    "loner": {"social": 0.5},
    "curious": {"entertainment": 1.5}
}

# 性格特质对回升率的影响倍率 (Synergy)
RECOVERY_MULTIPLIERS = {
    "glutton": {"hunger": 1.5},
    "socialite": {"social": 1.3},
    "curious": {"entertainment": 1.2}
}

def tick_npc_simulation(npc: TavernCharacter, current_tavern_type: str = "", current_time: datetime | None = None) -> bool:
    """
    更新单个 NPC 的仿真状态。
    current_tavern_type: NPC 当前所在空间的类型，用于计算恢复。
    返回 True 表示状态发生了实质性变化需要持久化。
    """
    if not npc.simulation_state:
        return False

    state = npc.simulation_state
    now = current_time or datetime.now(UTC)
    
    # 1. 计算衰减
    for attr, base_rate in BASE_DECAY_RATES.items():
        rate = base_rate
        # 应用性格修正衰减
        for trait in npc.traits:
            if trait in TRAIT_MULTIPLIERS and attr in TRAIT_MULTIPLIERS[trait]:
                rate *= TRAIT_MULTIPLIERS[trait][attr]
        
        current_val = getattr(state, attr, 100.0)
        new_val = max(0.0, current_val - rate)
        setattr(state, attr, new_val)

    # 2. 计算回升（如果当前地点匹配需求）
    recovered_attrs = PLACE_RECOVERY_MAP.get(current_tavern_type, [])
    for attr in recovered_attrs:
        if attr in RECOVERY_RATES:
            rate = RECOVERY_RATES[attr]
            # 应用性格修正回升
            for trait in npc.traits:
                if trait in RECOVERY_MULTIPLIERS and attr in RECOVERY_MULTIPLIERS[trait]:
                    rate *= RECOVERY_MULTIPLIERS[trait][attr]
            
            current_val = getattr(state, attr, 0.0)
            # 加上衰减掉的部分（抵消衰减并增加）
            # 注意：实际代码中 new_val 已经是减去衰减后的了，这里直接加回升速率
            new_val = min(100.0, current_val + rate)
            setattr(state, attr, new_val)

    # 3. 心情均值回归（mood 向 50 靠拢）
    if state.mood > 50.0:
        state.mood = max(50.0, state.mood - MOOD_REGRESSION_RATE)
    elif state.mood < 50.0:
        state.mood = min(50.0, state.mood + MOOD_REGRESSION_RATE)

    state.last_tick_at = now.isoformat()
    return True


def classify_rumor_sentiment(text: str) -> str:
    """对传闻文本做简易情绪分类。

    Returns:
        "positive" | "negative" | "neutral"
    """
    lower = text.lower()
    pos = sum(1 for kw in _POSITIVE_KEYWORDS if kw in lower)
    neg = sum(1 for kw in _NEGATIVE_KEYWORDS if kw in lower)
    if pos > neg:
        return "positive"
    if neg > pos:
        return "negative"
    return "neutral"


def decide_npc_mobility(npc: TavernCharacter, all_taverns: List[Tavern]) -> str | None:
    """
    决定 NPC 是否需要移动到另一个坐标。
    如果需要移动，返回目标 Tavern ID，否则返回 None。
    """
    if not npc.simulation_state:
        return None

    state = npc.simulation_state
    
    # 确定最高优先级的需求
    needs = {
        "thirst": state.thirst,
        "hunger": state.hunger,
        "entertainment": state.entertainment,
        "social": state.social,
        "energy": state.energy
    }
    
    # 找出低于阈值 (30) 的最紧急需求
    urgent_needs = [k for k, v in needs.items() if v < 30.0]
    if not urgent_needs:
        # 如果是工作狂且不在家，有概率回家
        if "workaholic" in npc.traits and npc.current_tavern_id != npc.home_tavern_id:
            if random.random() < 0.2:
                return npc.home_tavern_id
        return None

    # 按紧急程度排序
    urgent_needs.sort(key=lambda k: needs[k])
    top_need = urgent_needs[0]

    # 根据需求筛选目标空间类型
    target_types = []
    if top_need == "thirst":
        target_types = ["cafe", "milk-tea-shop", "convenience-store", "tavern"]
    elif top_need == "hunger":
        target_types = ["restaurant", "convenience-store"]
    elif top_need == "entertainment":
        target_types = ["board-game", "bookstore", "tavern"]
    elif top_need == "social":
        target_types = ["tavern", "cafe", "school"]
    elif top_need == "energy":
        return npc.home_tavern_id

    # 寻找匹配的空间
    candidates = [t for t in all_taverns if t.place_type in target_types and t.id != npc.current_tavern_id]
    
    if candidates:
        # 简单策略：随机选一个候选（未来可改为选最近的一个）
        dest = random.choice(candidates)
        return dest.id

    return None

def generate_npc_feeling(npc: TavernCharacter, tavern_type: str = "") -> str:
    """
    根据仿真状态生成一段描述 NPC 当前生理与心理感受的文字（注入 Prompt）。
    """
    if not npc.simulation_state:
        return ""

    state = npc.simulation_state
    feelings = []

    # 1. 生理需求描述
    if state.hunger < 20:
        feelings.append("饥肠辘辘，感觉胃里在翻江倒海，非常渴望吃点东西")
    elif state.hunger < 50:
        feelings.append("肚子有点饿，开始想念热腾腾的食物")

    if state.thirst < 20:
        feelings.append("口渴难耐，喉咙像冒火一样，急需大口喝水")
    elif state.thirst < 50:
        feelings.append("口干舌燥，想喝点清爽的饮料")

    if state.energy < 20:
        feelings.append("极度疲惫，眼皮打架，随时都想找个地方倒头大睡")
    elif state.energy < 50:
        feelings.append("有些倦意，身体沉甸甸的，想休息一下")

    if state.social < 20:
        feelings.append("感到强烈的孤独和被冷落，极度渴望找人倾诉或拥抱")
    elif state.social < 50:
        feelings.append("有点寂寞，希望能有热闹的交谈")

    if state.entertainment < 30:
        feelings.append("感觉生活枯燥乏味，无聊透顶，急需找点乐子发泄一下")

    # 2. 心情描述
    if state.mood >= 80:
        feelings.append("心情非常好，脸上洋溢着笑容，觉得世界格外美好")
    elif state.mood >= 60:
        feelings.append("心情不错，内心平静而满足")
    elif state.mood <= 20:
        feelings.append("心情极度低落，看什么都不顺眼，几乎不想说话")
    elif state.mood <= 40:
        feelings.append("心情有些沉重，隐约感到不开心")

    # 3. 环境反馈描述 (Recovery context)
    from .simulation import PLACE_RECOVERY_MAP
    recovering_needs = PLACE_RECOVERY_MAP.get(tavern_type, [])
    
    if tavern_type == "cafe" and "thirst" in recovering_needs:
        feelings.append("闻着店里的咖啡香，感觉干渴稍稍缓解了一些")
    elif tavern_type == "home" and "energy" in recovering_needs:
        feelings.append("回到家里，整个人都放松了下来，感到很安心")
    elif tavern_type == "board-game" and "entertainment" in recovering_needs:
        feelings.append("这里的桌游氛围很棒，心情正在变好")

    if not feelings:
        return "当前状态良好，心情平和。"

    # 4. 组合
    return "；".join(feelings) + "。"
