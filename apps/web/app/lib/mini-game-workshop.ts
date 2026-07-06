/**
 * Mini Game Workshop
 *
 * Self-designed mini-games embedded as iframe sandbox.
 * All games are original designs — no external licenses needed.
 * Whitelist: only games in MINI_GAME_CATALOG.
 *
 * Security:
 * - sandbox attribute: no allow-popups/allow-top-navigation
 * - allow-scripts only for games that need JS
 * - Games hosted locally under /public/games/
 */

export type MiniGameCatalogEntry = {
  id: string
  name: string
  nameZh: string
  description: string
  difficulty: "easy" | "medium" | "hard"
  localPath: string
  iframeAttributes: {
    sandbox: string
  }
}

export const MINI_GAME_CATALOG: MiniGameCatalogEntry[] = [
  {
    id: "game-guess-number",
    name: "Guess Number",
    nameZh: "猜数字",
    description: "我在 1-100 之间想了一个数字，7 次机会猜中它。",
    difficulty: "easy",
    localPath: "/games/guess-number/index.html",
    iframeAttributes: {
      sandbox: "allow-scripts allow-modals",
    },
  },
  {
    id: "game-memory-cards",
    name: "Memory Cards",
    nameZh: "记忆翻牌",
    description: "翻开牌面，找出 8 对相同的emoji符号。",
    difficulty: "medium",
    localPath: "/games/memory-cards/index.html",
    iframeAttributes: {
      sandbox: "allow-scripts allow-modals",
    },
  },
  {
    id: "game-meditation",
    name: "Meditation",
    nameZh: "打坐静修",
    description: "跟随光芒呼吸，洗练心境，累计修行时长。",
    difficulty: "easy",
    localPath: "/games/meditation/index.html",
    iframeAttributes: {
      sandbox: "allow-scripts allow-modals",
    },
  },
]

/**
 * Get game by ID (whitelist check)
 */
export function getGameById(id: string): MiniGameCatalogEntry | undefined {
  return MINI_GAME_CATALOG.find((g) => g.id === id)
}

/**
 * Check if game is whitelisted
 */
export function isGameWhitelisted(id: string): boolean {
  return MINI_GAME_CATALOG.some((g) => g.id === id)
}

/**
 * Get game embed URL (local preferred, fallback to external)
 */
export function getGameEmbedUrl(entry: MiniGameCatalogEntry): string {
  return entry.localPath
}

export function getIframeAttributes(entry: MiniGameCatalogEntry): { sandbox: string } {
  return { sandbox: entry.iframeAttributes.sandbox }
}

export function getGameDifficultyLabel(difficulty: MiniGameCatalogEntry["difficulty"]): string {
  return difficulty === "easy" ? "简单" : difficulty === "medium" ? "中等" : "困难"
}