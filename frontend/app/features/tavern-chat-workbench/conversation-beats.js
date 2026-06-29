export const CONVERSATION_INTENT_CHIPS = [
  {
    id: "comfort",
    label: "安慰一下",
    hint: "用温和方式接住 NPC 的情绪",
    context: "访客想用安慰、理解或陪伴的方式回应。请让 NPC 接住这份善意。",
  },
  {
    id: "test_attitude",
    label: "试探态度",
    hint: "观察 NPC 对某件事的真实反应",
    context: "访客想试探 NPC 的态度。请体现角色性格，但不要替访客做决定。",
  },
  {
    id: "ask_advice",
    label: "请 NPC 建议",
    hint: "让 NPC 给出下一步可聊的方向",
    context: "访客想请 NPC 给建议。请给出空间内可继续对话或探索的轻量方向。",
  },
  {
    id: "light_topic",
    label: "换个轻松话题",
    hint: "把对话转向轻松、日常、可继续聊的内容",
    context: "访客想把话题转轻松。请保持角色口吻，给出自然的日常接话。",
  },
]

export function findConversationIntent(intentId) {
  const id = String(intentId || "").trim()
  return CONVERSATION_INTENT_CHIPS.find((chip) => chip.id === id) || null
}

export function buildConversationIntentContext(intent) {
  if (!intent) return []
  return [
    {
      role: "system",
      content: `本轮访客选择了对话意图「${intent.label}」。${intent.context} 这个意图只用于理解语气和互动方向，不代表访客说出了额外事实。`,
    },
  ]
}

export function buildMessageWithConversationIntent(message, intent) {
  const text = String(message || "").trim()
  if (!intent) return text
  return `【对话意图：${intent.label}】\n${intent.context}\n\n访客原文：${text}`
}

function countList(value) {
  return Array.isArray(value) ? value.length : 0
}

function affinityStageLabel(affinity) {
  if (!affinity || typeof affinity !== "object") return ""
  return String(affinity.stage_label_zh || affinity.new_stage || "").trim()
}

// 简洁模式：不显示系统提示，让对话更自然

export function progressEchoesFromChatResult(result) {
  // 简洁模式：不显示系统提示，让对话更自然
  return []
}

export const progressSignalsFromChatResult = progressEchoesFromChatResult
