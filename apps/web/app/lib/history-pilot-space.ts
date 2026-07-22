import { getSpace, type Space, type SpaceCharacter, type SpaceListResponse } from "./spaces"

export const HISTORY_PILOT_SPACE_ID = "history_broad_street_water_1854"
export const HISTORY_PILOT_CHARACTER_ID = "char_history_broad_street_annie"
export const HISTORY_PILOT_OWNER_ID = "system_public_welfare"
export const HISTORY_PILOT_GAMEPLAY_ID = "gp_history_broad_street_first_water"

export type HistoryPilotReferenceKind = "史实" | "剧情设定" | "待核验"

export type HistoryPilotReferenceEntry = {
  id: string
  kind: HistoryPilotReferenceKind
  title: string
  content: string
  sourceName?: string
  sourceUrl?: string
  unlockAt: "opening" | "investigation" | "outcome"
}

export const HISTORY_PILOT_REFERENCE_NOTICE = "含 AI 总结；剧情设定可能包含虚构。"

export const HISTORY_PILOT_REFERENCE_ENTRIES: readonly HistoryPilotReferenceEntry[] = [
  {
    id: "annie-fictional",
    kind: "剧情设定",
    title: "安妮与这次相遇",
    content: "安妮、她的家庭、她与访客的对话及私人结局均为剧情设定。",
    unlockAt: "opening",
  },
  {
    id: "broad-street-outbreak",
    kind: "史实",
    title: "宽街霍乱暴发",
    content: "1854 年宽街一带的霍乱暴发在 8 月 31 日夜至 9 月 1 日显著加剧。",
    sourceName: "John Snow Archive · UCLA",
    sourceUrl: "https://epi-snow.ph.ucla.edu/Stream2_BSPoutbreak_d.html",
    unlockAt: "opening",
  },
  {
    id: "water-source-inquiry",
    kind: "史实",
    title: "逐户核对饮水来源",
    content: "John Snow 获取死亡登记资料，并逐户询问死者家庭实际使用的饮水来源。",
    sourceName: "John Snow · On the Mode of Communication of Cholera (1855)",
    sourceUrl: "https://wellcomecollection.org/works/uqa27qrt",
    unlockAt: "investigation",
  },
  {
    id: "workhouse-brewery",
    kind: "史实",
    title: "不同取水处的对照",
    content: "宽街附近济贫院有自己的水源，附近啤酒厂工人通常也不饮用街泵水。",
    sourceName: "John Snow · On the Mode of Communication of Cholera (1855)",
    sourceUrl: "https://wellcomecollection.org/works/uqa27qrt",
    unlockAt: "investigation",
  },
  {
    id: "handle-removal",
    kind: "史实",
    title: "9 月 7 日与 8 日",
    content: "Snow 于 9 月 7 日晚向 St James 教区监护委员会陈述；地方管理者于次日移除泵柄。",
    sourceName: "John Snow Archive · UCLA",
    sourceUrl: "https://epi-snow.ph.ucla.edu/Stream2_BSPoutbreak_e.html",
    unlockAt: "outcome",
  },
  {
    id: "decline-before-removal",
    kind: "史实",
    title: "暴发已经开始减退",
    content: "Snow 自己说明，在泵柄移除以前，暴发已经开始减退。",
    sourceName: "John Snow · On the Mode of Communication of Cholera (1855)",
    sourceUrl: "https://wellcomecollection.org/works/uqa27qrt",
    unlockAt: "outcome",
  },
  {
    id: "map-myth",
    kind: "史实",
    title: "点图不是调查的起点",
    content: "后来广为流传的点图呈现并帮助分析证据，但 Snow 的假设和主要实地调查并非因画出这张图才开始。",
    sourceName: "Brody et al. · The Lancet (2000)",
    sourceUrl: "https://doi.org/10.1016/S0140-6736(00)02442-9",
    unlockAt: "outcome",
  },
]

const HISTORY_PILOT_INVESTIGATION_NODES = new Set([
  "ask-pump",
  "trace-water",
  "walk-together",
  "trace-source",
  "doorstep",
  "contrast",
  "doctor-list",
  "progress",
  "progress-wary",
])

export function isHistoryPilotExperience(spaceId: unknown, characterId?: unknown) {
  if (String(spaceId || "") !== HISTORY_PILOT_SPACE_ID) return false
  return !characterId || String(characterId) === HISTORY_PILOT_CHARACTER_ID
}

export function isHistoryPilotGameplay(gameplayId: unknown) {
  return String(gameplayId || "") === HISTORY_PILOT_GAMEPLAY_ID
}

export function historyPilotReferenceEntriesForNode(nodeId: unknown) {
  const normalizedNodeId = String(nodeId || "start")
  const unlockedStages = new Set<HistoryPilotReferenceEntry["unlockAt"]>(["opening"])
  if (HISTORY_PILOT_INVESTIGATION_NODES.has(normalizedNodeId) || normalizedNodeId.startsWith("complete")) {
    unlockedStages.add("investigation")
  }
  if (normalizedNodeId.startsWith("complete")) unlockedStages.add("outcome")
  return HISTORY_PILOT_REFERENCE_ENTRIES.filter((entry) => unlockedStages.has(entry.unlockAt))
}

export class HistoryPilotContractError extends Error {
  constructor(reason: string) {
    super(`历史故事入口暂不可用：${reason}`)
    this.name = "HistoryPilotContractError"
  }
}

function validateHistoryPilotSpace(space: Space): Space {
  if (!space || space.id !== HISTORY_PILOT_SPACE_ID) {
    throw new HistoryPilotContractError("返回了不匹配的 Space")
  }
  if (space.owner_id !== HISTORY_PILOT_OWNER_ID) {
    throw new HistoryPilotContractError("不属于系统公益内容")
  }
  if (space.access !== "public") {
    throw new HistoryPilotContractError("当前不是公开访问")
  }
  if (space.status !== "open") {
    throw new HistoryPilotContractError("当前未开放")
  }

  const character = (Array.isArray(space.characters) ? space.characters : [])
    .find((candidate): candidate is SpaceCharacter => candidate?.id === HISTORY_PILOT_CHARACTER_ID)
  if (!character) {
    throw new HistoryPilotContractError(`缺少角色 ${HISTORY_PILOT_CHARACTER_ID}`)
  }

  return {
    ...space,
    characters: [character],
  }
}

/**
 * Load the single reviewed historical encounter used by the homepage pilot.
 * The existing three-Space discovery contract remains independent.
 */
export async function loadHistoryPilotSpace(): Promise<SpaceListResponse> {
  try {
    const space = validateHistoryPilotSpace(
      await getSpace(HISTORY_PILOT_SPACE_ID, "", { view: "entry" }),
    )
    return {
      spaces: [space],
      count: 1,
      total: 1,
      limit: 1,
      offset: 0,
      has_more: false,
    }
  } catch (error) {
    if (error instanceof HistoryPilotContractError) throw error
    const detail = error instanceof Error ? error.message : String(error || "")
    throw new HistoryPilotContractError(detail || "读取失败")
  }
}
