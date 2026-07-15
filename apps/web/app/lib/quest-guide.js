import { spacePath, WEB_PATHS } from "./web-routes"

const QUEST_TYPES = {
  exploration: '探索引导',
  npc: 'NPC 互动',
  creation: '创作引导',
  gameplay: '探索玩法',
}

export const PLATFORM_QUEST_GUIDES = [
  {
    id: 'visit-first-open-space',
    title: '记录第一间营业空间',
    type: 'exploration',
    icon: '🧭',
    description: '从真实坐标锚定的公开空间开始，记录一次安全入场体验。',
    ctaLabel: '去发现页找空间',
    ctaTo: WEB_PATHS.spaces,
    echoLabel: '当前开放空间',
    helperText: '进入一间开放空间后，可以把对话和回访提示留在空间体验里；本页不保存个人进度。',
    measure: ({ openSpaces }) => openSpaces,
  },
  {
    id: 'tour-three-open-spaces',
    title: '巡礼三间开放空间',
    type: 'exploration',
    icon: '🍻',
    description: '比较不同店主设定的氛围、NPC 和开场白，而不是做地图打卡排行。',
    ctaLabel: '查看开放空间',
    ctaTo: WEB_PATHS.spaces,
    echoLabel: '可比较空间',
    helperText: '把它当作路线建议：多看几间空间的风格差异，并把回访提示留在各自空间里，不形成排行榜或完成率。',
    measure: ({ openSpaces }) => openSpaces,
  },
  {
    id: 'meet-three-npcs',
    title: '认识三位空间 NPC',
    type: 'npc',
    icon: '💬',
    description: '优先体验店主配置的角色、表情和第一句话，感受 NPC 是否记得场景。',
    ctaLabel: '进入空间对话',
    ctaTo: WEB_PATHS.spaces,
    echoLabel: '可认识 NPC',
    helperText: 'NPC 对话由空间主人设定与模型配置驱动；回访提示应来自真实聊天上下文。',
    measure: ({ npcCount }) => npcCount,
  },
  {
    id: 'try-quest-play-space',
    title: '试一间探索玩法空间',
    type: 'gameplay',
    icon: '📜',
    description: '体验店主发布的轻量文本玩法；玩法会话只属于当前访客和所在空间。',
    ctaLabel: '寻找玩法空间',
    ctaTo: WEB_PATHS.spaces,
    echoLabel: '玩法空间',
    helperText: '玩法入口只做轻量文本互动和回访提示，不做等级、装备或访客竞争。',
    measure: ({ questPlaySpaces }) => questPlaySpaces,
  },
  {
    id: 'create-real-anchor',
    title: '创建自己的真实坐标锚点',
    type: 'creation',
    icon: '✨',
    description: '创建一间由店主确认内容的空间；AI 草稿只能辅助填写，不能自动发布。',
    ctaLabel: '创建空间',
    ctaTo: WEB_PATHS.createSpace,
    echoLabel: '你的空间',
    helperText: '创建从真实坐标开始，内容仍由店主确认；本指南只提示下一步，不替你发布空间。',
    measure: ({ ownerSpaces }) => ownerSpaces,
  },
]

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function isPublishedGameplay(definition) {
  return Boolean(
    definition &&
    typeof definition === 'object' &&
    definition.status === 'published' &&
    String(definition.id || '').trim()
  )
}

function questPlayCandidate(space = {}) {
  return asArray(space.gameplay_definitions).some(isPublishedGameplay)
}

export function buildQuestGuideSummary({ spaces = [], ownerId = '' } = {}) {
  const safeSpaces = asArray(spaces)
  const openSpaces = safeSpaces.filter((space) => (
    space.status === 'open' &&
    space.access === 'public' &&
    space.is_open !== false
  ))
  const playableGameplays = openSpaces
    .flatMap((space) => asArray(space.gameplay_definitions)
      .filter(isPublishedGameplay)
      .map((definition) => ({ space, definition })))
    .sort((left, right) => {
      const nodeDifference = asArray(right.definition.nodes).length - asArray(left.definition.nodes).length
      if (nodeDifference) return nodeDifference
      return `${left.space.id}:${left.definition.id}`.localeCompare(`${right.space.id}:${right.definition.id}`)
    })
  const featuredGameplay = playableGameplays[0] || null
  const metrics = {
    spaces: safeSpaces.length,
    openSpaces: openSpaces.length,
    npcCount: openSpaces.reduce((sum, space) => sum + asArray(space.characters).length, 0),
    questPlaySpaces: openSpaces.filter(questPlayCandidate).length,
    publishedGameplays: playableGameplays.length,
    ownerSpaces: ownerId ? safeSpaces.filter((space) => space.owner_id === ownerId).length : 0,
  }

  const quests = PLATFORM_QUEST_GUIDES.map((quest) => {
    const current = Math.max(0, Number(quest.measure(metrics)) || 0)
    const directGameplay = quest.id === 'try-quest-play-space' ? featuredGameplay : null
    const gameplayTitle = String(directGameplay?.definition?.title || directGameplay?.definition?.name || '').trim()
    const gameplaySummary = String(
      directGameplay?.definition?.summary || directGameplay?.definition?.description || '',
    ).trim()
    const gameplayId = String(directGameplay?.definition?.id || '').trim()
    const directGameplayPath = directGameplay
      ? `${spacePath(directGameplay.space)}?gameplay_id=${encodeURIComponent(gameplayId)}#空间主线`
      : ''

    return {
      id: quest.id,
      title: directGameplay ? gameplayTitle || quest.title : quest.title,
      type: quest.type,
      typeLabel: QUEST_TYPES[quest.type] || quest.type,
      icon: quest.icon,
      description: directGameplay
        ? `${directGameplay.space.name}：${gameplaySummary || '进入空间后，从店主发布的第一幕开始。'}`
        : quest.description,
      ctaLabel: directGameplay ? '开始这个玩法' : quest.ctaLabel,
      ctaTo: directGameplay ? directGameplayPath : quest.ctaTo,
      echoLabel: directGameplay ? '当前已发布玩法' : quest.echoLabel,
      echoCount: directGameplay ? metrics.publishedGameplays : current,
      availability: current > 0 ? 'ready' : 'guide',
      availabilityLabel: directGameplay ? '可直接开始' : current > 0 ? '已有可参考入口' : '建议从这里开始',
      helperText: directGameplay
        ? `来自「${directGameplay.space.name}」；进入后会从第一幕开始，已有进度则继续。`
        : quest.helperText,
    }
  }).sort((left, right) => Number(right.availabilityLabel === '可直接开始') - Number(left.availabilityLabel === '可直接开始'))

  return {
    metrics,
    quests,
    guideCount: quests.length,
    readyGuideCount: quests.filter((quest) => quest.availability === 'ready').length,
  }
}
