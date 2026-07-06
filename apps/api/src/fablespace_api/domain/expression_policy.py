from __future__ import annotations


def infer_expression_keyword(text: str) -> str:
    """Infer a SillyTavern expression label without an external model."""
    text_lower = str(text or "").lower()

    positive_keywords = {
        "joy": ["开心", "高兴", "快乐", "太好了", "棒", "喜欢", "幸福", "哈哈", "真好", "joy", "happy", "glad", "wonderful"],
        "admiration": ["佩服", "钦佩", "羡慕", "崇拜", "厉害", "优秀", "棒极了", "admire", "respect", "impressive"],
        "amusement": ["好玩", "有趣", "逗", "笑", "有意思", "amusing", "funny", "laugh", "haha"],
        "approval": ["好", "对", "不错", "可以", "赞同", "同意", "approve", "good", "right", "agree"],
        "caring": ["关心", "担心", "照顾", "心疼", "关爱", "care", "worry", "concerned", "love"],
        "desire": ["想要", "希望", "想", "渴望", "期盼", "desire", "want", "wish", "hope", "miss"],
        "excitement": ["激动", "兴奋", "期待", "太棒了", "excited", "exciting", "thrilled", "eager"],
        "gratitude": ["谢谢", "感谢", "感激", "帮大忙", "thank", "thanks", "grateful", "appreciate"],
        "love": ["爱", "喜欢", "心", "想你", "love", "adore", "fond"],
        "optimism": ["一定会", "相信", "希望", "没问题", "乐观", "optimistic", "hopefully", "sure"],
        "pride": ["骄傲", "自豪", "得意", "厉害", "proud", "pride", "accomplished"],
        "relief": ["终于", "松口气", "放心", "安心", "relieved", "relief", "whew"],
    }
    negative_keywords = {
        "anger": ["生气", "愤怒", "讨厌", "滚", "气", "怒", "angry", "mad", "furious", "hate"],
        "annoyance": ["烦", "讨厌", "麻烦", "无聊", "annoyed", "irritated", "boring", "annoying"],
        "confusion": ["疑惑", "不懂", "奇怪", "怎么回事", "迷茫", "confused", "puzzled", "what"],
        "disappointment": ["失望", "可惜", "遗憾", "没希望", "disappointed", "sad", "unfortunate"],
        "disapproval": ["不对", "不行", "不同意", "反对", "disapprove", "wrong", "bad"],
        "disgust": ["恶心", "讨厌", "反感", "disgusted", "gross", "nasty"],
        "embarrassment": ["尴尬", "不好意思", "丢脸", "脸红", "embarrassed", "awkward", "shy"],
        "fear": ["害怕", "担心", "恐惧", "怕", "恐怖", "fear", "afraid", "scared", "worried"],
        "grief": ["悲伤", "难过", "伤心", "哭", "悲痛", "grief", "sad", "cry", "upset"],
        "nervousness": ["紧张", "不安", "忐忑", "害怕", "nervous", "anxious", "tense"],
        "remorse": ["抱歉", "对不起", "后悔", "自责", "remorse", "sorry", "regret", "guilt"],
        "sadness": ["难过", "伤心", "悲伤", "痛苦", "sad", "unhappy", "depressed", "sorrow"],
    }
    neutral_keywords = {
        "curiosity": ["好奇", "想知道", "问问", "什么意思", "curious", "wonder", "ask"],
        "realization": ["原来", "竟然", "原来如此", "明白了", "realize", "oh", "now"],
        "surprise": ["惊讶", "意外", "吃惊", "没想到", "surprised", "amazing", "unexpected"],
        "neutral": ["嗯", "哦", "好的", "明白", "okay", "ok", "yes", "alright"],
    }

    for groups in (positive_keywords, negative_keywords, neutral_keywords):
        for emotion, keywords in groups.items():
            if any(keyword in text_lower for keyword in keywords):
                return emotion
    return "neutral"


def normalize_sprite_map(value: object) -> dict[str, str]:
    """Keep only non-empty expression->URL strings for character sprites."""
    if not isinstance(value, dict):
        return {}
    return {str(key).strip(): str(url).strip() for key, url in value.items() if str(key).strip() and str(url).strip()}
