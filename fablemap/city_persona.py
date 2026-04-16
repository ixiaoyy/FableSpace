"""AIO5 · 城市人格代理（City Persona Agent）

城市基于玩家的 MeaningVector（来自 AIO4 行为编译器）
形成持续人格回应，包括：称谓生成、问候语调、回应倾向、城市情绪。
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from .behavior_compiler import MeaningVector


# ---------------------------------------------------------------------------
# 城市人格档案
# ---------------------------------------------------------------------------

@dataclass
class CityPersona:
    """城市对单个玩家所持有的持续人格状态。"""
    player_id: str

    # 城市给玩家的称谓（基于 myth_entry）
    address: str = "过路人"

    # 城市当前对玩家的情绪倾向
    # warm / curious / respectful / wary / silent
    emotional_tone: str = "curious"

    # 城市问候语（用于 UI broadcast / 个性化 toast）
    greeting: str = ""

    # 城市回应偏好：倾向提供什么类型的内容
    # story / repair / mystery / solitude / resonance / drift
    response_bias: str = "drift"

    # 城市对玩家的信任度 [0.0, 1.0]
    trust_level: float = 0.3

    # 城市人格标签（可供前端渲染徽章/图鉴）
    persona_tags: List[str] = field(default_factory=list)

    # 原始 dominant_meaning（便于上层索引）
    dominant_meaning: str = "wanderer"


# ---------------------------------------------------------------------------
# 人格配置表
# ---------------------------------------------------------------------------

@dataclass
class _PersonaConfig:
    address: str
    emotional_tone: str
    greeting_template: str   # {address} 占位符
    response_bias: str
    trust_base: float
    persona_tags: List[str]


_PERSONA_CATALOG: Dict[str, _PersonaConfig] = {
    "explorer": _PersonaConfig(
        address="幽灵制图者",
        emotional_tone="curious",
        greeting_template="{address}，你又踏入了我不曾命名的角落。",
        response_bias="mystery",
        trust_base=0.5,
        persona_tags=["cartographer", "boundary_walker", "unnamed_territories"],
    ),
    "chronicler": _PersonaConfig(
        address="记忆守护者",
        emotional_tone="respectful",
        greeting_template="{address}，这座城把它的故事托付给你。",
        response_bias="story",
        trust_base=0.6,
        persona_tags=["archivist", "echo_listener", "myth_thread"],
    ),
    "restorer": _PersonaConfig(
        address="圣域编织者",
        emotional_tone="warm",
        greeting_template="{address}，你的手让这里变得稍微完整了一些。",
        response_bias="repair",
        trust_base=0.65,
        persona_tags=["healer", "ritual_keeper", "broken_mender"],
    ),
    "recluse": _PersonaConfig(
        address="虚空行者",
        emotional_tone="wary",
        greeting_template="{address}，你选择了那些城市不愿提起的地方。",
        response_bias="solitude",
        trust_base=0.35,
        persona_tags=["shadow_dweller", "edge_seeker", "veil_walker"],
    ),
    "resonant": _PersonaConfig(
        address="回声承载者",
        emotional_tone="warm",
        greeting_template="{address}，城市在你每次停留后都变得更响亮了一点。",
        response_bias="resonance",
        trust_base=0.7,
        persona_tags=["attunement_high", "oracle_listener", "city_mirror"],
    ),
    "wanderer": _PersonaConfig(
        address="过路人",
        emotional_tone="curious",
        greeting_template="{address}，城市还没有认清你的脸。",
        response_bias="drift",
        trust_base=0.3,
        persona_tags=["unnamed", "drifting"],
    ),
}


# ---------------------------------------------------------------------------
# 信任度修正规则
# ---------------------------------------------------------------------------

def _compute_trust(meaning: MeaningVector, base: float) -> float:
    """根据行为向量对基础信任度进行微调。"""
    trust = base

    # 高共鸣者额外加分
    trust += meaning.resonant_score * 0.15

    # 高探索者：城市对其既好奇又保留
    trust += meaning.explorer_score * 0.05

    # 修复者：城市最信任
    trust += meaning.restorer_score * 0.1

    # 隐者：城市对其保持距离
    trust -= meaning.recluse_score * 0.1

    return round(min(1.0, max(0.0, trust)), 3)


# ---------------------------------------------------------------------------
# 城市人格代理
# ---------------------------------------------------------------------------

class CityPersonaAgent:
    """基于 MeaningVector 生成并更新城市对玩家的人格状态。"""

    def generate(self, meaning: MeaningVector) -> CityPersona:
        """从 MeaningVector 生成 CityPersona。"""
        dominant = meaning.dominant_meaning
        config = _PERSONA_CATALOG.get(dominant, _PERSONA_CATALOG["wanderer"])

        trust = _compute_trust(meaning, config.trust_base)
        greeting = config.greeting_template.format(address=config.address)

        # 高信任度玩家额外获得 myth_entry 标签
        tags = list(config.persona_tags)
        if meaning.myth_entry and trust >= 0.6:
            tags.append(f"myth:{meaning.myth_entry}")

        return CityPersona(
            player_id=meaning.player_id,
            address=config.address,
            emotional_tone=config.emotional_tone,
            greeting=greeting,
            response_bias=config.response_bias,
            trust_level=trust,
            persona_tags=tags,
            dominant_meaning=dominant,
        )

    def evolve_with_home(self, persona: CityPersona, comfort_score: float) -> CityPersona:
        """根据玩家据点舒适度提升城市信任度，并添加 home_bound 标签。"""
        boost = round(comfort_score * 0.2, 3)
        new_trust = round(min(1.0, persona.trust_level + boost), 3)
        new_tags = list(persona.persona_tags)
        if "home_bound" not in new_tags:
            new_tags.append("home_bound")
        return CityPersona(
            player_id=persona.player_id,
            address=persona.address,
            emotional_tone=persona.emotional_tone,
            greeting=persona.greeting,
            response_bias=persona.response_bias,
            trust_level=new_trust,
            persona_tags=new_tags,
            dominant_meaning=persona.dominant_meaning,
        )

    def merge(self, existing: CityPersona, new_meaning: MeaningVector) -> CityPersona:
        """将新的 MeaningVector 与现有人格状态合并（滑动更新）。

        信任度使用指数滑动平均（alpha=0.3），其余字段直接替换。
        """
        fresh = self.generate(new_meaning)
        alpha = 0.3
        merged_trust = round(alpha * fresh.trust_level + (1 - alpha) * existing.trust_level, 3)
        fresh.trust_level = merged_trust
        return fresh
