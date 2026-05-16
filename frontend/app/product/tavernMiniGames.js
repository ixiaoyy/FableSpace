export const MINI_GAME_TEMPLATES = [
  {
    id: 'npc-rps-duel',
    title: 'NPC 猜拳心理战',
    icon: '✊',
    duration: '1-3 分钟',
    summary: '和当前 NPC 来一局三手小对局，胜负由规则判定，不计排行。',
    tags: ['duel', 'npc', 'family-friendly'],
    duelType: 'rps',
    startInstruction: '请以轻松口吻说明这是一局三手猜拳小对局：石头、剪刀、布；胜负只按规则结算，不涉及排行、奖励、等级或真实输赢压力。',
  },
  {
    id: 'clue-trail',
    title: '线索调查',
    icon: '🔎',
    duration: '5-8 分钟',
    summary: '灯下有一条线索等你翻开。',
    tags: ['clue', 'family-friendly'],
    startInstruction: '请给出一个和这间空间氛围相关的小线索，再用【目标】【已知线索】【可选行动】三块开始；每轮只推进一个安全动作。',
  },
  {
    id: 'riddle-quiz',
    title: '猜谜问答',
    icon: '🧩',
    duration: '3-5 分钟',
    summary: '一小题，一点提示，一声揭晓。',
    tags: ['riddle', 'family-friendly'],
    startInstruction: '请先出一道和这间空间氛围相关、无需专业知识的谜题，再给出【规则】【谜题】【可选回答方式】【提示次数】。',
  },
  {
    id: 'story-relay',
    title: '故事接龙',
    icon: '📚',
    duration: '5-8 分钟',
    summary: '你添一句，故事就往前走。',
    tags: ['story', 'family-friendly'],
    startInstruction: '请用 2-3 句话开一个温和短故事，并给出【接龙规则】【开头】【轮到我续写】；每次只续一小段。',
  },
  {
    id: 'card-reading',
    title: '抽卡占卜',
    icon: '🃏',
    duration: '3-5 分钟',
    summary: '抽一张象征卡，听一段轻松解读。',
    tags: ['card', 'family-friendly'],
    startInstruction: '请为我抽一张象征卡，用轻松的象征解读给出【卡面】【象征】【今日小提醒】【可选行动】；不做命运断言。',
  },
  {
    id: 'twenty-questions',
    title: '二十问',
    icon: '❓',
    duration: '5-10 分钟',
    summary: '猜一个藏在空间里的小东西。',
    tags: ['question', 'family-friendly'],
    startInstruction: '请在心里想一个和这间空间相关的物品、地点或人物，并用【规则】【剩余问题】【可以开始问】开局；你只能回答是、否、不确定或接近。',
  },
  {
    id: 'tiny-quest',
    title: '小委托',
    icon: '📜',
    duration: '3-8 分钟',
    summary: '领取一张短探索卡，得到一段文字纪念。',
    tags: ['quest', 'family-friendly'],
    startInstruction: '请设计一个 3 分钟内可完成的安全小委托探索卡，并给出【委托标题】【目标】【完成条件】【可选行动】【文字纪念】【回访提示】。',
  },
  {
    id: 'signal-decoder',
    title: '共鸣解码',
    icon: '📡',
    duration: '5-10 分钟',
    summary: '捕捉并解密来自坐标深处的加密记忆片段。',
    tags: ['puzzle', 'terminal', 'family-friendly'],
    startInstruction: '请给出一个加密的“记忆片段”（可以是乱码、诗句或谜语），要求访客通过【分析片段】【尝试破译】【比对资料】等步骤解开背后的故事。',
  },
  {
    id: 'spectral-scanner',
    title: '共鸣扫描',
    icon: '📻',
    duration: '3-5 分钟',
    summary: '扫描当前坐标的“历史回声”。',
    tags: ['exploration', 'terminal', 'family-friendly'],
    startInstruction: '请描述一段在这个坐标曾经发生过的、温和且非恐怖的“视觉片段”，并给出 3 个【同步共鸣】的可选行动，让访客决定深入查看哪个片段。',
  },
  {
    id: 'constellation-map',
    title: '星图测绘',
    icon: '🌌',
    duration: '5 分钟',
    summary: '根据当前坐标与星空的夹角，推演今日运势。',
    tags: ['divination', 'astronomy', 'family-friendly'],
    startInstruction: '请结合当前的真实经纬度坐标，模拟一次星象观测，给出【观测方位】【主星位】【相位影响】【今日指引】；用轻松象征语气，不做命运断言。',
  },
]

const PLAY_MODE_PRIORITY = {
  clue_game: ['signal-decoder', 'clue-trail'],
  guild: ['tiny-quest', 'clue-trail'],
  text_game: ['spectral-scanner', 'signal-decoder', 'tiny-quest'],
  divination: ['constellation-map', 'card-reading'],
}

const SAFETY_BOUNDARY = '不要涉及血腥、成人、真实危险行动，不索取隐私，不给医疗、法律或金融结论。'

export const RPS_MOVES = [
  { id: 'rock', label: '石头', icon: '✊', beats: 'scissors' },
  { id: 'scissors', label: '剪刀', icon: '✌️', beats: 'paper' },
  { id: 'paper', label: '布', icon: '🖐️', beats: 'rock' },
]

const RPS_MOVE_IDS = new Set(RPS_MOVES.map((move) => move.id))

function textOf(value) {
  return String(value || '').trim()
}

function stableHash(value) {
  const input = textOf(value)
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }
  return hash
}

function priorityIndex(template, priorityIds) {
  const index = priorityIds.indexOf(template.id)
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

export function getMiniGameTemplates(options = {}) {
  const priorityIds = PLAY_MODE_PRIORITY[textOf(options.playModeId)] || []
  if (priorityIds.length === 0) return [...MINI_GAME_TEMPLATES]
  return [...MINI_GAME_TEMPLATES].sort((left, right) => {
    const byPriority = priorityIndex(left, priorityIds) - priorityIndex(right, priorityIds)
    if (byPriority !== 0) return byPriority
    return MINI_GAME_TEMPLATES.indexOf(left) - MINI_GAME_TEMPLATES.indexOf(right)
  })
}

export function buildMiniGameStartPrompt(template, context = {}) {
  if (!template?.title) return ''
  const characterName = textOf(context.characterName) || '当前 NPC'
  const tavernName = textOf(context.tavernName)
  const locationText = tavernName ? `，地点是「${tavernName}」` : ''
  const instruction = textOf(template.startInstruction) || '请用清晰规则带我开始，并给出 2-3 个可选行动。'
  return [
    `我想和你玩一局《${template.title}》。`,
    `请你以${characterName}的身份主持一局 ${template.duration || '3-10 分钟'} 的老少皆宜小游戏${locationText}。`,
    instruction,
    SAFETY_BOUNDARY,
  ].join('\n')
}

export function isNpcRpsDuelTemplate(template) {
  return template?.id === 'npc-rps-duel' || template?.duelType === 'rps'
}

export function createRpsDuelState() {
  return {
    round: 0,
    playerScore: 0,
    npcScore: 0,
    drawCount: 0,
    lastRound: null,
  }
}

export function normalizeRpsMove(moveId) {
  const normalized = textOf(moveId)
  return RPS_MOVE_IDS.has(normalized) ? normalized : ''
}

export function decideRpsWinner(playerMoveId, npcMoveId) {
  const playerMove = RPS_MOVES.find((move) => move.id === normalizeRpsMove(playerMoveId))
  const npcMove = RPS_MOVES.find((move) => move.id === normalizeRpsMove(npcMoveId))
  if (!playerMove || !npcMove) {
    return { outcome: 'invalid', playerMove: playerMove || null, npcMove: npcMove || null }
  }
  if (playerMove.id === npcMove.id) {
    return { outcome: 'draw', playerMove, npcMove }
  }
  return {
    outcome: playerMove.beats === npcMove.id ? 'player_win' : 'npc_win',
    playerMove,
    npcMove,
  }
}

export function pickNpcRpsMove(context = {}) {
  const round = Number.isFinite(Number(context.round)) ? Number(context.round) : 0
  const seed = [
    context.characterName || '当前 NPC',
    context.tavernName || '',
    context.duelId || 'npc-rps-duel',
    round,
  ].join('|')
  return RPS_MOVES[stableHash(seed) % RPS_MOVES.length]
}

export function getRpsOutcomeLabel(outcome) {
  if (outcome === 'player_win') return '你赢了这一手'
  if (outcome === 'npc_win') return 'NPC 赢了这一手'
  if (outcome === 'draw') return '平局'
  return '无效出招'
}

export function buildRpsNpcLine(result, context = {}) {
  const name = textOf(context.characterName) || '当前 NPC'
  if (result?.outcome === 'player_win') {
    return `${name}眯起眼笑了笑：这手被你读到了。再来，我要换个节奏。`
  }
  if (result?.outcome === 'npc_win') {
    return `${name}轻轻敲了敲桌面：别只看手势，要看我停顿的时机。`
  }
  if (result?.outcome === 'draw') {
    return `${name}把手收回袖口：同步了，说明我们都在试探。`
  }
  return `${name}提醒你：这一局只接受石头、剪刀、布。`
}

export function playRpsRound(state = createRpsDuelState(), playerMoveId, context = {}) {
  const current = {
    ...createRpsDuelState(),
    ...(state && typeof state === 'object' ? state : {}),
  }
  const npcMove = pickNpcRpsMove({ ...context, round: current.round + 1 })
  const result = decideRpsWinner(playerMoveId, npcMove.id)
  const nextState = {
    ...current,
    round: current.round + 1,
    lastRound: {
      ...result,
      label: getRpsOutcomeLabel(result.outcome),
      npcLine: buildRpsNpcLine(result, context),
    },
  }
  if (result.outcome === 'player_win') nextState.playerScore += 1
  if (result.outcome === 'npc_win') nextState.npcScore += 1
  if (result.outcome === 'draw') nextState.drawCount += 1
  return nextState
}
