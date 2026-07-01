import { buildSpaceFirstMinuteGuide } from '../lib/space-first-minute'

const DEFAULT_SCENE_PROMPTS = [
  {
    id: 'outsider',
    label: '失忆 / 外来者',
    helper: '自然询问地点、处境和当前危机',
    prompt: '*我揉了揉发痛的额角，环顾四周* 这里是哪里？刚刚发生了什么？',
  },
  {
    id: 'tension',
    label: '突发危机',
    helper: '快速让 NPC 推动下一幕',
    prompt: '*我压低声音，拉住你的衣袖* 等等，周围好像不太对劲，我们接下来怎么办？',
  },
  {
    id: 'daily',
    label: '日常闲聊',
    helper: '适合陪伴、治愈、日常空间',
    prompt: '*我在你身边坐下，放松地笑了笑* 你刚刚在想什么？接下来有什么安排？',
  },
  {
    id: 'quest',
    label: '明确任务',
    helper: '适合调查、委托、跑团式空间',
    prompt: '*我检查好随身物品，认真看向你* 再确认一下，我们这次要完成什么目标？',
  },
]

/**
 * compactSceneText — 清理 UI 场景文案并截断到指定长度。
 * @param {unknown} value — 待展示的文本值，非字符串会被视为空。
 * @param {number} maxLength — 最大展示字符数。
 * @returns {string} 清理后的短文本；不会改写原始内容语义。
 */
function compactSceneText(value, maxLength = 120) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return ''
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

/**
 * safeFirstMinuteGuide — 从现有 space 字段构建第一分钟引导，失败时返回空对象。
 * @param {object} space — 当前空间对象。
 * @returns {object} 访客可见第一分钟引导；无副作用、不持久化。
 */
function safeFirstMinuteGuide(space = {}) {
  try {
    return buildSpaceFirstMinuteGuide(space || {})
  } catch (_err) {
    return {}
  }
}

/**
 * buildSpaceArrivalScene — 为入场面板生成 UI-only 抵达场景卡。
 * @param {object} space — 当前空间；只读取 owner 已公开字段。
 * @param {object} playMode — 已推断的玩法模式，用于下一步提示。
 * @returns {object|null} 抵达卡 view model；不调用 AI、不落库。
 */
export function buildSpaceArrivalScene(space = {}, playMode = {}) {
  if (!space) return null
  const guide = safeFirstMinuteGuide(space)
  const name = compactSceneText(space.name, 28) || '这间空间'
  const scene = compactSceneText(space.scene_prompt || space.description, 118)
  const anchor = compactSceneText(guide.anchorLine || space.address, 52)
  const action = compactSceneText(playMode?.prompts?.[0] || guide.tryThisFirst?.[0], 54)

  return {
    kicker: '入场前一幕',
    title: `你来到「${name}」门前`,
    text: scene
      ? `先别急着打开聊天框。这里的空气里有一层已经写好的氛围：${scene}`
      : '先别急着打开聊天框。把它当成一扇门：你将进入一段由空间和 NPC 共同主持的场景。',
    anchor,
    action: action || '进门后先观察四周，再用一句动作 + 对话接住 NPC。',
  }
}

/**
 * buildOpeningSceneDigest — 为聊天首屏生成场景摘要，不创造新的空间正史。
 * @param {object} options — space、character、playMode、entryState 组合。
 * @returns {Array<{label: string, value: string}>} 可展示的摘要条目。
 */
export function buildOpeningSceneDigest({ space = {}, character = {}, playMode = {}, entryState = null } = {}) {
  const guide = safeFirstMinuteGuide(space)
  const digest = []
  const location = compactSceneText(guide.anchorLine || space.address || space.name, 44)
  const mood = compactSceneText(space.scene_prompt || space.description || guide.experienceHelper, 64)
  const npc = compactSceneText(
    [character?.name, character?.description || character?.personality].filter(Boolean).join(' · '),
    58,
  )
  const nextStep = compactSceneText(playMode?.prompts?.[0] || guide.tryThisFirst?.[0], 62)
  const visitCount = Number.parseInt(entryState?.visit_count || entryState?.visitCount, 10)

  if (location) digest.push({ label: '地点', value: location })
  if (mood) digest.push({ label: '氛围', value: mood })
  if (npc) digest.push({ label: '眼前 NPC', value: npc })
  if (Number.isFinite(visitCount) && visitCount > 1) {
    digest.push({ label: '回访', value: `这是你第 ${visitCount} 次回来，可以继续上次的关系感。` })
  }
  if (nextStep) digest.push({ label: '下一步', value: nextStep })

  return digest.slice(0, 5)
}

/**
 * getRoleplayStarterPrompts — 返回访客侧“入戏回复”模板。
 * @param {object} options — 当前玩法、角色和空间；仅用于排序和去重。
 * @returns {Array<{id: string, label: string, helper: string, prompt: string}>} 可点击 starter chips。
 */
export function getRoleplayStarterPrompts({ playMode = {}, character = {}, space = {} } = {}) {
  const searchText = [
    playMode?.id,
    playMode?.label,
    playMode?.summary,
    space?.layout_style,
    space?.place_type,
    space?.scene_prompt,
    character?.scenario,
    character?.tags?.join(' '),
  ].filter(Boolean).join(' ').toLowerCase()

  const priority = searchText.includes('quest') || searchText.includes('调查') || searchText.includes('委托') || searchText.includes('线索')
    ? ['quest', 'outsider', 'tension', 'daily']
    : searchText.includes('陪伴') || searchText.includes('日常') || searchText.includes('home')
    ? ['daily', 'outsider', 'quest', 'tension']
    : ['outsider', 'tension', 'daily', 'quest']

  return priority
    .map((id) => DEFAULT_SCENE_PROMPTS.find((prompt) => prompt.id === id))
    .filter(Boolean)
}

/**
 * truncateSceneText — 公开的安全截断工具，供组件展示开场白摘录。
 * @param {unknown} text — 待展示文本。
 * @param {number} maxLength — 最大展示字符数。
 * @returns {string} 截断后的文本；不写入任何状态。
 */
export function truncateSceneText(text, maxLength = 180) {
  return compactSceneText(text, maxLength)
}
