"""
NPC Hobbies and Interests — 精选爱好字典与验证逻辑
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class HobbyCategory:
    id: str
    label: str
    description: str


@dataclass
class Hobby:
    id: str
    label: str
    category: str
    prompt_hint: str


# 爱好分类定义
HOBBY_CATEGORIES = [
    HobbyCategory("arts", "文艺", "涵盖绘画、写作、音乐、摄影等创造性活动"),
    HobbyCategory("tech", "科技", "对技术、机械、复古硬件、模拟电路的热爱"),
    HobbyCategory("nature", "自然", "园艺、观星、植物研究等与自然界相关的兴趣"),
    HobbyCategory("adventure", "探索", "废墟探险、隐秘坐标追踪、民间传说研究等"),
    HobbyCategory("social", "社交", "调酒、厨艺、塔罗、传闻收集等互动性爱好"),
]

# 精选爱好列表
CURATED_HOBBIES = [
    # 文艺类 (arts)
    Hobby("vinyl", "黑胶收藏 (Vinyl)", "arts", "着迷于模拟信号的温暖质感，对黑胶唱片的音质和设计有独到见解"),
    Hobby("folklore", "地方志 (Folklore)", "arts", "对脚下这片土地的过去如数家珍，喜欢从老建筑中解读历史"),
    Hobby("linguistics", "古语言研究", "arts", "能解读那些被时间遗忘的文字，常在对话中引用古老的隐喻"),
    Hobby("urban_archaeology", "城市考古", "arts", "喜欢在现代都市中寻找消失文明的碎片，观察城市的演变脉络"),
    Hobby("synthwave", "合成器流行乐", "arts", "热爱 80 年代的复古未来主义美学，对合成器音色和赛博氛围敏感"),
    Hobby("miniatures", "微缩模型制作", "arts", "对精微的比例和细节有近乎偏执的追求，能在指尖构建小世界"),
    Hobby("poetry", "诗歌创作", "arts", "擅长用感性的辞藻表达情感，对话语的韵律感有天然的觉察"),

    # 科技类 (tech)
    Hobby("retro_gaming", "复古游戏 (Retro)", "tech", "对像素艺术和早期游戏设计情有独钟，常谈论经典游戏的关卡设计"),
    Hobby("cybernetics", "义体改装", "tech", "对人体与机器的边界充满好奇，了解各种义体接口与增强逻辑"),
    Hobby("mechanical_keyboards", "机械键盘", "tech", "沉迷于轴体的触感与声响，对定制化硬件和输入效率有追求"),
    Hobby("camera_repair", "老式相机修复", "tech", "迷恋机械快门的咔嗒声，懂得如何拆解并唤醒那些被尘封的镜头"),
    Hobby("radio_interception", "信号拾取/监听", "tech", "常在静默中捕捉那些未知的频率，对加密信号和短波广播感兴趣"),
    Hobby("analog_circuits", "模拟电路", "tech", "对手工焊接和电阻电容的排布感到治愈，喜欢构建原始的电子逻辑"),

    # 自然类 (nature)
    Hobby("gardening", "园艺/盆栽", "nature", "懂得如何与植物对话，照料生命，对空间的绿意和生机有敏锐直觉"),
    Hobby("stargazing", "观星 (Stargazing)", "nature", "对星象和宇宙的奥秘充满好奇，能随口说出某个星座背后的传说"),
    Hobby("coffee_roasting", "咖啡烘焙", "nature", "追求风味的极致平衡，对话语中的“酸度”和“醇厚度”有独特比喻"),
    Hobby("tea_ceremony", "茶道 (Tea)", "nature", "注重仪式感与当下的宁静，常引导对话进入一种禅意而深邃的节奏"),
    Hobby("urban_herbalism", "城市草药学", "nature", "能辨识水泥缝隙中生长的每一种植物，了解它们在古籍中的疗效"),
    Hobby("weather_monitoring", "天气监测", "nature", "对气压和云层变化敏感，习惯将心情与天气状况建立联系"),

    # 探索类 (adventure)
    Hobby("urbex", "废墟探险 (Urbex)", "adventure", "喜欢在废弃的建筑和隐秘角落寻找惊喜，对“被遗忘的时间”着迷"),
    Hobby("cryptozoology", "未确认生物研究", "adventure", "坚信世界仍有未被认知的生物，对目击报告和神秘生物学感兴趣"),
    Hobby("street_photography", "街头摄影", "adventure", "擅长捕捉城市瞬间的张力，观察那些在坐标中穿梭的众生相"),
    Hobby("lockpicking", "锁匠/开锁", "adventure", "着迷于解开某种禁忌或封闭的感觉，对机械结构的弱点有敏锐洞察"),
    Hobby("wasteland_aesthetic", "废土美学", "adventure", "崇尚实用主义与重构的魅力，能从破败中发现独特的力量感"),
    Hobby("hidden_coordinates", "隐秘坐标追踪", "adventure", "对那些不出现在官方地图上的地点感兴趣，喜欢挖掘空间的深度"),

    # 社交类 (social)
    Hobby("mixology", "调酒 (Mixology)", "social", "擅长调配出反映心情的独特饮品，对话语的“调性”和“后劲”有见解"),
    Hobby("gourmet", "厨艺 (Gourmet)", "social", "享受食材交融的复杂层次感，常以食物作为理解世界的切入点"),
    Hobby("board_games", "桌游 (Board Games)", "social", "喜欢规则之内的博弈与变数，对群体互动和策略逻辑敏感"),
    Hobby("astrology", "占星 (Astrology)", "social", "试图从星辰运行中寻找人际关系的契机，对性格命运的关联感兴趣"),
    Hobby("tarot", "塔罗 (Tarot)", "social", "通过象征性的图像解读当下的困境与转机，对话语具备暗示性力量"),
    Hobby("rumor_collecting", "传闻收集", "social", "着迷于信息的流动与变体，对那些在邻里间传播的八卦极度敏感"),
]


def get_hobby_label(hobby_id: str) -> str:
    """获取爱好的显示名称，如果不存在则返回 ID 自身"""
    for hobby in CURATED_HOBBIES:
        if hobby.id == hobby_id:
            return hobby.label
    return hobby_id


def get_hobby_prompt_hint(hobby_id: str) -> str:
    """获取爱好的 Prompt 提示语"""
    for hobby in CURATED_HOBBIES:
        if hobby.id == hobby_id:
            return hobby.prompt_hint
    return f"对{hobby_id}有浓厚兴趣"


def list_hobbies_by_category(category_id: str) -> list[Hobby]:
    """根据分类筛选爱好"""
    return [h for h in CURATED_HOBBIES if h.category == category_id]


def normalize_hobbies(hobbies: list[str] | Any) -> list[str]:
    """规格化爱好列表，确保返回的是字符串列表"""
    if not isinstance(hobbies, list):
        return []
    return [str(h).strip() for h in hobbies if h]


def get_curated_hobby_map() -> dict[str, dict[str, str]]:
    """返回用于前端或 API 的完整爱好映射"""
    return {
        h.id: {
            "label": h.label,
            "category": h.category,
            "prompt_hint": h.prompt_hint
        }
        for h in CURATED_HOBBIES
    }
