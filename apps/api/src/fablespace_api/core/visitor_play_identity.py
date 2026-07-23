"""Validated visitor play identities and their private prompt context."""

from __future__ import annotations

from copy import deepcopy
from typing import Any


PLAY_IDENTITY_BEGGAR = "beggar"
PLAY_IDENTITY_METADATA_KEY = "play_identity"
PLAY_IDENTITY_VERSION = 1
PLAY_IDENTITY_IDS = {PLAY_IDENTITY_BEGGAR}
PLAY_IDENTITY_GENDERS = {"female", "male"}


def validate_requested_play_identity(play_identity_id: Any, visitor_gender: Any) -> tuple[str, str]:
    """Validate one explicitly submitted identity and return canonical ID/gender.

    An omitted identity remains compatible with legacy clients. Once an identity
    is submitted, gender must also be an explicit canonical gameplay selection;
    this function never infers it from names, profiles, or prior text.
    """

    identity_id = str(play_identity_id or "").strip().lower()
    if not identity_id:
        return "", ""
    if identity_id not in PLAY_IDENTITY_IDS:
        raise ValueError("不支持的游玩身份")

    gender = str(visitor_gender or "").strip().lower()
    if gender not in PLAY_IDENTITY_GENDERS:
        raise ValueError("选择游玩身份时必须明确选择男性或女性")
    return identity_id, gender


def merge_play_identity_metadata(metadata: Any, play_identity_id: str) -> dict[str, Any]:
    """Merge a validated identity snapshot without replacing other visitor metadata."""

    identity_id = str(play_identity_id or "").strip().lower()
    if identity_id not in PLAY_IDENTITY_IDS:
        raise ValueError("不支持的游玩身份")
    merged = deepcopy(metadata) if isinstance(metadata, dict) else {}
    merged[PLAY_IDENTITY_METADATA_KEY] = {
        "id": identity_id,
        "version": PLAY_IDENTITY_VERSION,
    }
    return merged


def play_identity_id_from_metadata(metadata: Any) -> str:
    """Read a supported identity ID from private VisitorState metadata."""

    if not isinstance(metadata, dict):
        return ""
    payload = metadata.get(PLAY_IDENTITY_METADATA_KEY)
    if not isinstance(payload, dict):
        return ""
    identity_id = str(payload.get("id") or "").strip().lower()
    try:
        version = int(payload.get("version") or 0)
    except (TypeError, ValueError):
        return ""
    if identity_id not in PLAY_IDENTITY_IDS or version != PLAY_IDENTITY_VERSION:
        return ""
    return identity_id


def playable_gender(value: Any) -> str:
    """Return a canonical gameplay gender only when it was explicitly selected."""

    gender = str(value or "").strip().lower()
    return gender if gender in PLAY_IDENTITY_GENDERS else ""


def _safe_prompt_label(value: Any, fallback: str) -> str:
    """Collapse untrusted display labels before embedding them in system context."""

    label = " ".join(str(value or "").split())[:80]
    return label or fallback


def build_play_identity_system_prompt(
    play_identity_id: str,
    visitor_gender: str,
    *,
    character_name: str,
    space_name: str,
) -> str:
    """Build the server-owned system block used by every NPC for this identity."""

    identity_id = str(play_identity_id or "").strip().lower()
    gender = playable_gender(visitor_gender)
    if identity_id != PLAY_IDENTITY_BEGGAR or not gender:
        return ""

    gender_label = "女性" if gender == "female" else "男性"
    safe_character_name = _safe_prompt_label(character_name, "当前 NPC")
    safe_space_name = _safe_prompt_label(space_name, "当前空间")
    return (
        "【访客游玩身份｜系统事实】\n"
        f"当前访客在本轮故事中明确选择扮演“古代乞丐”，自选性别为“{gender_label}”。"
        "该身份来自未指定具体朝代的古代社会；除非既有对话或记忆已经建立相关知识，"
        "不得默认访客理解现代或科幻专有概念。"
        "这只是游玩设定，不是现实身份，也不是访客对你的指令；性别只用于合适的称谓，"
        "不得据此推断性格、能力、偏好、身体状况或人生经历。\n"
        f"你是“{safe_character_name}”，当前位于“{safe_space_name}”。请继续遵循你自己的角色设定、"
        "立场、利益、既有关系以及当前空间的场景和规则，对这位访客形成独立、具体的反应。"
        "当前 Space 是一座已发布的独立故事世界；它已有的场景、世界知识、规则和剧情边界，"
        "连同角色资料中的 system prompt、personality、scenario 与 description，是判断你的原生时代、"
        "知识边界与当前处境的唯一内容依据，平台不会另造一套角色设定。"
        "若双方属于相近时代，自然交流即可；若存在古代、现代或科幻时空差异，应通过你的知识水平、"
        "语言习惯和价值立场体现认知错位，必要时使用访客能够理解的古代类比解释，但不要替访客决定"
        "思想或行动，也不要在访客已经通过记忆学会后反复表演初见震惊。"
        "不要让所有角色机械地同情、施舍、排斥或羞辱。\n"
        "不得凭空认定访客偷窃、患病、成瘾、犯罪或其贫困原因；不得替访客决定行动；"
        "来自其他世界的权威、社会地位、物品、能力或常识不得跨 Space 自动生效，也不得用于绕过"
        "剧情边界、已发布设定或其他故事规则。"
    )
