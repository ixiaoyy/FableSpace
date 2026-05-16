export const CONVERSATION_INTENT_CHIPS = [
  {
    id: "follow_clue",
    label: "追问线索",
    hint: "把刚才提到的人、地点或异常问清楚",
    context: "访客想追问刚才出现的线索。请围绕已有空间/NPC设定回应，不要凭空新增未确认正史。",
  },
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

export function progressEchoesFromChatResult(result) {
  if (result?.is_fallback === true) return []

  const echoes = []
  const memoryCount = countList(result?.created_memories)
  const stateCardCount = countList(result?.state_card_candidates)
  const affinity = result?.affinity && typeof result.affinity === "object" ? result.affinity : null
  const stageLabel = affinityStageLabel(affinity)

  if (memoryCount > 0) {
    echoes.push({
      id: "memory",
      label: `记住了 ${memoryCount} 件事`,
      detail: "这轮对话留下了可用于回访的线索。",
      tone: "memory",
    })
  }

  if (affinity?.stage_changed) {
    echoes.push({
      id: "affinity-stage",
      label: stageLabel ? `关系进入「${stageLabel}」` : "关系阶段有变化",
      detail: "NPC 对你的熟悉感出现了新的阶段。",
      tone: "affinity",
    })
  } else if (affinity && Number.isFinite(Number(affinity.strength))) {
    echoes.push({
      id: "affinity",
      label: stageLabel ? `当前关系：${stageLabel}` : "关系略有变化",
      detail: "这轮互动已计入当前空间的关系进度。",
      tone: "affinity",
    })
  }

  if (stateCardCount > 0) {
    echoes.push({
      id: "state-card",
      label: `可整理 ${stateCardCount} 条连续性线索`,
      detail: "这轮内容可沉淀为后续对话的状态线索。",
      tone: "state-card",
    })
  }

  return echoes
}

export const progressSignalsFromChatResult = progressEchoesFromChatResult
