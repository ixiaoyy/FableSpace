import { GameCanvas } from "../game/GameCanvas"

const DEFAULT_FORUM_URL = "https://pingxingxian.space"

/** Resolve a safe HTTPS forum link or fall back to the configured community home. */
function resolveForumUrl(): string {
  const configured = String(import.meta.env.VITE_FORUM_URL || "").trim()
  if (!configured) return DEFAULT_FORUM_URL

  try {
    const parsed = new URL(configured)
    return parsed.protocol === "https:" ? parsed.toString() : DEFAULT_FORUM_URL
  } catch {
    return DEFAULT_FORUM_URL
  }
}

/** Render the independent game and a single low-interruption community link. */
export default function HomeRoute() {
  return (
    <main className="gamePage">
      <div className="gamePage__grain" aria-hidden="true" />
      <header className="gamePage__header">
        <div className="gamePage__titleLockup">
          <span className="gamePage__eyebrow">第一年 · 春</span>
          <h1>苔野小屋</h1>
        </div>
        <a
          className="gamePage__forumLink"
          href={resolveForumUrl()}
          target="_blank"
          rel="noopener noreferrer"
        >
          论坛
          <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="gamePage__cabinet" aria-label="苔野小屋游戏">
        <div className="gamePage__screw gamePage__screw--one" aria-hidden="true" />
        <div className="gamePage__screw gamePage__screw--two" aria-hidden="true" />
        <GameCanvas />
      </section>

      <footer className="gamePage__controls" aria-label="操作方式">
        <span><kbd>WASD</kbd><kbd>↑↓←→</kbd> 移动</span>
        <span><kbd>E</kbd><kbd>空格</kbd> 交互</span>
      </footer>
    </main>
  )
}
