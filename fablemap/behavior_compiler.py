"""AIO4 · Behavior-to-Meaning Compiler

把连续行为模式编译成高阶世界含义，为个性化反馈与私人神话层提供中间层。
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional


# ---------------------------------------------------------------------------
# Input: BehaviorTrace
# ---------------------------------------------------------------------------

@dataclass
class BehaviorEvent:
    """单次玩家行为事件。"""
    action: str          # observe / dwell / mark / revisit / co_create
    target_id: str       # POI / zone / route id
    district_type: str   # 区域类型（来自 district_classifier）
    duration: float = 0.0   # 停留时长（秒），observe/dwell 有意义
    lens_id: str = ""       # 当时激活的镜头 id
    timestamp: float = 0.0


@dataclass
class BehaviorTrace:
    """一段连续行为序列（单次会话或滑动窗口）。"""
    player_id: str
    events: List[BehaviorEvent] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Output: MeaningVector
# ---------------------------------------------------------------------------

@dataclass
class MeaningVector:
    """从行为序列提炼的高阶世界含义。

    所有 score 取值 [0.0, 1.0]，代表对应倾向的强度。
    """
    player_id: str

    # 探索倾向：偏好发现新地点 vs. 反复回访
    explorer_score: float = 0.0

    # 叙事倾向：偏好在故事/历史节点停留
    chronicler_score: float = 0.0

    # 修复倾向：偏好 repair_rituals / healing_oasis 区域
    restorer_score: float = 0.0

    # 隐匿倾向：偏好 private 可见性、低密度地点
    recluse_score: float = 0.0

    # 共鸣倾向：高 attunement 行为 + oracle/hearth 镜头下的停留
    resonant_score: float = 0.0

    # 漂泊倾向：无明显归属地的随机移动
    wanderer_score: float = 0.0

    # 主导含义标签（由编译器从上面五个 score 中择优选出）
    dominant_meaning: str = "wanderer"  # wanderer / chronicler / restorer / recluse / resonant

    # 私人神话层入口标签（给上层个性化反馈使用）
    myth_entry: str = ""  # 例如 "ghost_cartographer" / "memory_keeper" / "void_walker"

    # 原始行为摘要（调试用）
    action_counts: Dict[str, int] = field(default_factory=dict)
    dominant_district: str = ""


# ---------------------------------------------------------------------------
# Compiler
# ---------------------------------------------------------------------------

# 五个维度各自感兴趣的信号
_EXPLORER_ACTIONS = {"observe", "revisit"}
_CHRONICLER_ACTIONS = {"observe", "co_create"}
_RESTORER_ACTIONS = {"mark", "co_create"}
_RESTORER_DISTRICTS = {"healing_oasis", "memory_grove"}
_RECLUSE_ACTIONS = {"dwell"}
_RECLUSE_LENSES = {"veil", "hearth"}
_RESONANT_LENSES = {"oracle", "hearth"}
_RESONANT_ACTIONS = {"dwell", "mark"}

# 含义标签 → myth_entry 映射
_MYTH_ENTRIES: Dict[str, str] = {
    "explorer": "ghost_cartographer",
    "chronicler": "memory_keeper",
    "restorer": "sanctuary_weaver",
    "recluse": "void_walker",
    "resonant": "echo_bearer",
    "wanderer": "unnamed_drifter",
}


class BehaviorCompiler:
    """把 BehaviorTrace 编译为 MeaningVector。"""

    def compile(self, trace: BehaviorTrace) -> MeaningVector:
        events = trace.events
        if not events:
            return MeaningVector(player_id=trace.player_id, myth_entry="unnamed_drifter")

        counts: Dict[str, int] = {}
        district_counts: Dict[str, int] = {}
        total = len(events)

        explorer_hits = 0
        chronicler_hits = 0
        restorer_hits = 0
        recluse_hits = 0
        resonant_hits = 0

        seen_targets: set = set()
        unique_visits = 0

        for ev in events:
            counts[ev.action] = counts.get(ev.action, 0) + 1
            district_counts[ev.district_type] = district_counts.get(ev.district_type, 0) + 1

            # explorer: 偏好访问新地点（unique targets / total）
            if ev.action in _EXPLORER_ACTIONS:
                if ev.target_id not in seen_targets:
                    unique_visits += 1
                seen_targets.add(ev.target_id)
                explorer_hits += 1

            # chronicler: observe + co_create，尤其是 chronicle 镜头下
            if ev.action in _CHRONICLER_ACTIONS:
                chronicler_hits += 1
                if ev.lens_id == "chronicle":
                    chronicler_hits += 1  # 权重加倍

            # restorer: mark/co_create 在修复类区域
            if ev.action in _RESTORER_ACTIONS and ev.district_type in _RESTORER_DISTRICTS:
                restorer_hits += 2
            elif ev.action in _RESTORER_ACTIONS:
                restorer_hits += 1

            # recluse: dwell 且镜头为 veil/hearth
            if ev.action in _RECLUSE_ACTIONS:
                recluse_hits += 1
                if ev.lens_id in _RECLUSE_LENSES:
                    recluse_hits += 1

            # resonant: dwell/mark 在 oracle/hearth 镜头下
            if ev.action in _RESONANT_ACTIONS and ev.lens_id in _RESONANT_LENSES:
                resonant_hits += 2
            elif ev.action in _RESONANT_ACTIONS:
                resonant_hits += 1

        def _norm(hits: int, weight: float = 2.0) -> float:
            return min(1.0, hits / max(1, total * weight))

        # explorer_score 额外考虑唯一性比例
        explorer_base = _norm(explorer_hits)
        uniqueness = unique_visits / max(1, len(seen_targets or {1}))
        explorer_score = min(1.0, (explorer_base + uniqueness) / 2)

        scores = {
            "explorer": explorer_score,
            "chronicler": _norm(chronicler_hits),
            "restorer": _norm(restorer_hits),
            "recluse": _norm(recluse_hits),
            "resonant": _norm(resonant_hits),
        }

        dominant = max(scores, key=lambda k: scores[k])
        # 若最高分 < 0.15，归为 wanderer
        if scores[dominant] < 0.15:
            dominant = "wanderer"

        dominant_district = max(district_counts, key=lambda k: district_counts[k]) if district_counts else ""

        return MeaningVector(
            player_id=trace.player_id,
            explorer_score=round(scores["explorer"], 3),
            chronicler_score=round(scores["chronicler"], 3),
            restorer_score=round(scores["restorer"], 3),
            recluse_score=round(scores["recluse"], 3),
            resonant_score=round(scores["resonant"], 3),
            dominant_meaning=dominant,
            myth_entry=_MYTH_ENTRIES.get(dominant, "unnamed_drifter"),
            action_counts=counts,
            dominant_district=dominant_district,
        )


# ---------------------------------------------------------------------------
# Convenience builder
# ---------------------------------------------------------------------------

def build_trace(player_id: str, raw_events: List[Dict]) -> BehaviorTrace:
    """从原始 dict 列表快速构建 BehaviorTrace。

    raw_events 每项应包含 action, target_id, district_type，
    其余字段可选。
    """
    events = [
        BehaviorEvent(
            action=e["action"],
            target_id=e["target_id"],
            district_type=e["district_type"],
            duration=float(e.get("duration", 0.0)),
            lens_id=e.get("lens_id", ""),
            timestamp=float(e.get("timestamp", 0.0)),
        )
        for e in raw_events
    ]
    return BehaviorTrace(player_id=player_id, events=events)
