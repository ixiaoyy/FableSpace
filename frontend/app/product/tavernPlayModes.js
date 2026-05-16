import { FARM_PROMPTS } from './tavernFarmModes.js'

const DEFAULT_PROMPTS = [
  '你好，我第一次来，这里怎么玩？',
  '请用三句话介绍这间空间。',
  '给我一个不用想太多的开始方式。',
  '如果我只想体验 3 分钟，应该先做什么？',
]

const TEXT_GAME_PROMPTS = [
  '开始文字游戏，用简单规则带我玩。',
  '查看当前目标、线索和可选行动。',
  '调查我身边最显眼的东西。',
  '给我 3 个选择，我选一个继续。',
]

const CLUE_PROMPTS = [
  '我想查线索，从哪里开始？',
  '帮我整理目前的疑点。',
  '查看我已经发现的线索。',
  '继续调查下一个异常细节。',
]

const HELP_PROMPTS = [
  '我需要一点帮助，请一步一步告诉我。',
  '我不会用，先带我完成一次。',
  '我想开一间自己的空间，最少要做什么？',
  '请解释公开、密码、私人空间有什么区别。',
]

const GUILD_PROMPTS = [
  '查看空间探索清单。',
  '我想领取一个适合新访客的小委托。',
  '查看我的完成记录、文字纪念章和回访提示。',
  '我想提交一个友善委托草稿，等店主确认。',
  '我完成清单项目了，帮我记录。',
]

const DIVINATION_PROMPTS = [
  '接入星图测绘，计算该坐标今日运势。',
  '开启共鸣扫描，捕捉这里的历史记忆。',
  '进行三牌塔罗破译：过去、现在、未来。',
  '执行共鸣解码，查看当前坐标的隐藏记忆。',
  '同步星象观测，获取基于地理偏移的指引。',
]

export const GUILD_REPUTATION_TIERS = [
  {
    id: 'first-visit',
    title: '初访记录',
    min: 0,
    badge: '到店贴纸',
    treatment: '先领取第一张探索卡；NPC 会说明真实坐标、店规和安全玩法边界。',
  },
  {
    id: 'returning-visitor',
    title: '回访记录',
    min: 2,
    badge: '回访印章',
    treatment: '可查看已记录清单，并收到下一次回访时该问哪位 NPC 的提示。',
  },
  {
    id: 'clue-keeper',
    title: '线索记录',
    min: 5,
    badge: '线索夹',
    treatment: 'NPC 会优先提醒已确认的店主设定、公开线索和可继续探索的入口。',
  },
  {
    id: 'neighborhood-witness',
    title: '街区见证',
    min: 9,
    badge: '街角纪念章',
    treatment: '清单记录会附带更多空间背景提示，但不形成访客排名或数值成长。',
  },
  {
    id: 'friendly-regular',
    title: '友善常客',
    min: 14,
    badge: '常客明信片',
    treatment: '可提交友善委托草稿，等待店主或主持 NPC 确认后再进入空间内容。',
  },
]

export const DEFAULT_GUILD_QUESTS = [
  {
    id: 'errand-postcard',
    title: '探索卡：吧台明信片',
    summary: '确认一张明信片与空间真实坐标、NPC 开场白有什么关系。',
    objective: '询问明信片上的公开线索，说出你认为的下一步或想问的 NPC。',
    difficulty: '初访',
    reward: 1,
    recordLabel: '明信片确认',
    returnHint: '下次回访可以问 NPC：这张明信片后来有没有寄出。',
    familyFriendly: true,
  },
  {
    id: 'clue-signboard',
    title: '探索卡：旧告示牌',
    summary: '观察门口旧告示牌，找出今天最适合你的探索方向。',
    objective: '选择一个关键词：方向、人物、物品；让 NPC 给出下一条公开线索。',
    difficulty: '轻松',
    reward: 2,
    recordLabel: '线索记录',
    returnHint: '下次回访可以从同一关键词继续问，不需要重新解释。',
    familyFriendly: true,
  },
  {
    id: 'welcome-guide',
    title: '空间委托：欢迎新访客',
    summary: '用一句温和公开的话欢迎后来者，学习这间空间的友好待客方式。',
    objective: '写一句不涉及隐私、让人安心的欢迎语。',
    difficulty: '轻松',
    reward: 2,
    recordLabel: '友善欢迎',
    returnHint: '下次回访时，NPC 可以延续这句欢迎语做轻量反馈。',
    familyFriendly: true,
  },
  {
    id: 'choice-trial',
    title: '探索卡：三岔路选择',
    summary: '从 3 个安全选项里做选择，让 NPC 主持一段 5 分钟微探索。',
    objective: '让 NPC 给出三个选项，回复序号推进到结算。',
    difficulty: '标准',
    reward: 3,
    recordLabel: '选择记录',
    returnHint: '下次回访可以直接查看上次选择后的空间反馈。',
    familyFriendly: true,
  },
]

function textOf(value) {
  return String(value || '').trim()
}

function collectTavernText(tavern = {}, character = null) {
  const characters = Array.isArray(tavern.characters) ? tavern.characters : []
  const bookmarks = Array.isArray(tavern.bookmarks) ? tavern.bookmarks : []
  return [
    tavern.name,
    tavern.description,
    tavern.scene_prompt,
    tavern.address,
    ...bookmarks.map((bookmark) => bookmark?.content),
    ...characters.flatMap((char) => [
      char?.name,
      char?.description,
      char?.personality,
      char?.scenario,
      char?.system_prompt,
      ...(Array.isArray(char?.tags) ? char.tags : []),
    ]),
    character?.name,
    character?.description,
    character?.personality,
    character?.scenario,
    character?.system_prompt,
    ...(Array.isArray(character?.tags) ? character.tags : []),
  ].map(textOf).filter(Boolean).join(' ').toLowerCase()
}

function hasAny(haystack, keywords) {
  return keywords.some((keyword) => haystack.includes(keyword))
}

function uniqueStrings(value) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map((item) => String(item || '').trim()).filter(Boolean)))
}

export function normalizeGuildProgress(progress = {}) {
  const reputation = Number.parseInt(progress?.reputation, 10)
  return {
    acceptedQuestIds: uniqueStrings(progress?.acceptedQuestIds),
    completedQuestIds: uniqueStrings(progress?.completedQuestIds),
    reputation: Number.isFinite(reputation) ? Math.max(0, reputation) : 0,
    updatedAt: progress?.updatedAt || null,
  }
}

export function getGuildTier(reputationOrProgress = 0) {
  const reputation = typeof reputationOrProgress === 'object'
    ? Number.parseInt(reputationOrProgress?.reputation, 10)
    : Number.parseInt(reputationOrProgress, 10)
  const safeReputation = Number.isFinite(reputation) ? Math.max(0, reputation) : 0
  return [...GUILD_REPUTATION_TIERS]
    .reverse()
    .find((tier) => safeReputation >= tier.min) || GUILD_REPUTATION_TIERS[0]
}

function getQuestSource(tavern = {}) {
  const customQuests = Array.isArray(tavern?.guild_quests) ? tavern.guild_quests : []
  if (customQuests.length === 0) return DEFAULT_GUILD_QUESTS
  return customQuests
    .map((quest, index) => ({
      ...DEFAULT_GUILD_QUESTS[index % DEFAULT_GUILD_QUESTS.length],
      ...quest,
      id: quest.id || `custom-guild-quest-${index + 1}`,
      reward: Math.max(1, Number.parseInt(quest.reward, 10) || 1),
      recordLabel: quest.recordLabel || quest.identityReward || '自定义完成记录',
      returnHint: quest.returnHint || quest.treatment || '下次回访时继续从这张清单展开。',
      familyFriendly: quest.familyFriendly !== false,
    }))
}

export function getGuildQuestBoard(tavern = {}, progress = {}) {
  const normalized = normalizeGuildProgress(progress)
  const accepted = new Set(normalized.acceptedQuestIds)
  const completed = new Set(normalized.completedQuestIds)
  return getQuestSource(tavern).map((quest) => ({
    ...quest,
    status: completed.has(quest.id)
      ? 'completed'
      : (accepted.has(quest.id) ? 'accepted' : 'available'),
  }))
}

export function updateGuildProgress(progress = {}, action = {}) {
  const normalized = normalizeGuildProgress(progress)
  const questId = String(action?.questId || '').trim()
  if (!questId) return normalized

  const accepted = new Set(normalized.acceptedQuestIds)
  const completed = new Set(normalized.completedQuestIds)
  let reputation = normalized.reputation

  if (action.type === 'accept') {
    if (!completed.has(questId)) accepted.add(questId)
  }

  if (action.type === 'complete') {
    const quest = action.quest || DEFAULT_GUILD_QUESTS.find((item) => item.id === questId)
    accepted.add(questId)
    if (!completed.has(questId)) {
      completed.add(questId)
      reputation += Math.max(1, Number.parseInt(quest?.reward, 10) || 1)
    }
  }

  return {
    acceptedQuestIds: Array.from(accepted),
    completedQuestIds: Array.from(completed),
    reputation,
    updatedAt: new Date().toISOString(),
  }
}

export function getQuestRecordLabel(quest = {}) {
  return textOf(quest.recordLabel || quest.identityReward || '完成记录')
}

export function getQuestReturnHint(quest = {}) {
  return textOf(quest.returnHint || quest.treatment || '下次回访时继续从这张清单展开。')
}

export function getGuildProgressStorageKey(tavernId = 'tavern', visitorId = 'visitor') {
  return `fablemap_guild_progress:${tavernId || 'tavern'}:${visitorId || 'visitor'}`
}

export function loadGuildProgress(tavernId, visitorId) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return normalizeGuildProgress()
  }
  try {
    const raw = window.localStorage.getItem(getGuildProgressStorageKey(tavernId, visitorId))
    return normalizeGuildProgress(raw ? JSON.parse(raw) : {})
  } catch (err) {
    return normalizeGuildProgress()
  }
}

export function saveGuildProgress(tavernId, visitorId, progress) {
  const normalized = normalizeGuildProgress(progress)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        getGuildProgressStorageKey(tavernId, visitorId),
        JSON.stringify(normalized),
      )
    } catch (err) {
      // localStorage may be disabled; keep in-memory state usable.
    }
  }
  return normalized
}

export function buildGuildActionPrompt(action, quest = null, tier = GUILD_REPUTATION_TIERS[0]) {
  const questTitle = quest?.title || '当前委托'
  const questObjective = quest?.objective || quest?.summary || '请给我一个清楚、老少皆宜的下一步。'
  const tierTitle = tier?.title || GUILD_REPUTATION_TIERS[0].title
  const treatment = tier?.treatment || GUILD_REPUTATION_TIERS[0].treatment

  if (action === 'accept') {
    return `我领取探索清单项目《${questTitle}》。请以空间引导员身份登记这一项，并用老少皆宜的格式告诉我【目标】【完成条件】【可选行动】【回访提示】。项目目标：${questObjective}`
  }

  if (action === 'complete') {
    return `我记录完成探索清单项目《${questTitle}》。请检查完成情况；如果认可，请写下一条完成记录、发一枚文字纪念章，并给出下次回访提示。当前记录：${tierTitle}；当前提示：${treatment}。然后给我一个可以继续体验空间的下一步。`
  }

  if (action === 'post') {
    return `我想提交一个友善空间委托草稿。请以空间引导员身份，帮我整理成老少皆宜、安全无压力、需要店主确认后才可发布的探索清单草稿，并给出【委托标题】【目标】【完成条件】【适合对象】【可选行动】【回访提示】。当前记录：${tierTitle}；当前提示：${treatment}。`
  }

  return `查看我的探索清单完成记录、文字纪念章和可回访提示。当前记录：${tierTitle}；当前提示：${treatment}。请用【完成记录】【可领取清单】【回访提示】【可选行动】四块回复。`
}

export function inferTavernPlayMode(tavern = {}, character = null) {
  const text = collectTavernText(tavern, character)
  const isHelp = hasAny(text, ['新手', '帮助', '社区', '向导', '服务站', '怎么用', '开店'])
  const isGuild = hasAny(text, [
    '公会',
    '探索清单',
    '探索卡',
    '空间委托',
    '完成记录',
    '文字纪念章',
    '回访提示',
    '委托',
    '清单',
    '访客记录',
    '发布委托',
    '发委托',
    'guild',
    'quest board',
  ])
  const isMystery = hasAny(text, ['线索', '调查', '档案', '失物', '谜题', '悬疑', '推理', '异常', '真相'])
  const isTextGame = hasAny(text, ['文字游戏', '轻文字游戏', '选择', '目标', '探索', '委托', '线索'])
  const isFarm = hasAny(text, ['菜园', '农场', '种菜', '偷菜', '作物', '浇水', '收获', 'farm', 'garden'])
  const isDivination = tavern.special_type === 'divination' || hasAny(text, ['占卜', '塔罗', '星象', '星盘', '命理', '测算', '神秘学', '灵签', 'tarot', 'oracle'])

  if (isDivination) {
    return {
      id: 'divination',
      label: '占卜玄学',
      icon: '🔮',
      summary: '这间空间支持占卜互动：星象、塔罗或灵签，探索坐标背后的玄学指引。',
      prompts: DIVINATION_PROMPTS,
    }
  }

  if (isFarm) {
    return {
      id: 'farm',
      label: '菜园农场',
      icon: '🌱',
      summary: '这间空间可以体验菜园种植：种植、浇水、收获并和管家交流。',
      prompts: FARM_PROMPTS,
    }
  }

  if (isGuild) {
    return {
      id: 'guild',
      label: '探索清单',
      icon: '🗺️',
      summary: '这间空间支持探索清单：领取空间委托、记录完成、获得文字纪念章和回访提示。',
      prompts: GUILD_PROMPTS,
    }
  }

  if (isTextGame || isMystery) {
    return {
      id: isMystery ? 'clue_game' : 'text_game',
      label: isMystery ? '线索调查' : '文字游戏',
      icon: isMystery ? '🔎' : '🎲',
      summary: isMystery
        ? '这间空间适合按线索推进：调查、整理疑点、做选择。'
        : '这间空间支持轻文字体验：目标、选择、线索或小委托。',
      prompts: isMystery
        ? [...CLUE_PROMPTS, ...TEXT_GAME_PROMPTS.slice(0, 2)]
        : TEXT_GAME_PROMPTS,
    }
  }

  if (isHelp) {
    return {
      id: 'helpdesk',
      label: '新手友好',
      icon: '🧭',
      summary: '这间空间适合第一次体验：可以直接问“怎么玩”。',
      prompts: HELP_PROMPTS,
    }
  }

  return {
    id: 'chat',
    label: '轻松聊天',
    icon: '💬',
    summary: '不知道说什么也没关系，点一个快捷句就能开始。',
    prompts: DEFAULT_PROMPTS,
  }
}

export function getTavernPlayBadges(tavern = {}) {
  const mode = inferTavernPlayMode(tavern)
  const badges = [mode.label]
  const hasCharacters = Array.isArray(tavern.characters) && tavern.characters.length > 0
  if (hasCharacters) badges.push(`${tavern.characters.length} 位角色`)
  if (tavern.group_chat_enabled) badges.push('多人群聊')
  return badges
}
