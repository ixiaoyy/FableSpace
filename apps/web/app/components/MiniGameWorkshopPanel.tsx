/**
 * MiniGameWorkshopPanel
 *
 * Shows self-designed mini-games in SpaceChatWorkbench.
 * All games are original designs — no external licenses needed.
 * Whitelist only, local hosting, iframe sandbox.
 */

import { useState } from "react"
import { MINI_GAME_CATALOG, type MiniGameCatalogEntry, getGameEmbedUrl, getIframeAttributes, getGameDifficultyLabel } from "../lib/mini-game-workshop"

function GameCard({
  game,
  onPlay,
}: {
  game: MiniGameCatalogEntry
  onPlay: (game: MiniGameCatalogEntry) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onPlay(game)}
      className="group flex min-w-0 items-center gap-3 rounded-2xl border border-emerald-300/18 bg-emerald-300/8 p-4 text-left transition hover:border-emerald-300/45 hover:bg-emerald-300/14"
    >
      <span className="shrink-0 text-3xl">
        {game.id === "game-guess-number" ? "🎯" : game.id === "game-meditation" ? "🧘" : "🧠"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-white">
          {game.nameZh}
          <span className="ml-2 text-xs rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 font-semibold text-emerald-100">
            {getGameDifficultyLabel(game.difficulty)}
          </span>
        </span>
        <span className="mt-1 block line-clamp-2 text-xs leading-4 text-emerald-50/56">{game.description}</span>
      </span>
      <span className="shrink-0 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-50 group-hover:border-emerald-300/45">
        开始
      </span>
    </button>
  )
}

function GamePlayer({
  game,
  onBack,
}: {
  game: MiniGameCatalogEntry
  onBack: () => void
}) {
  const embedUrl = getGameEmbedUrl(game)
  const { sandbox } = getIframeAttributes(game)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/62">小游戏工坊</p>
          <p className="mt-1 text-sm font-black text-white">
            {game.nameZh}
            <span className="ml-2 text-xs font-semibold text-emerald-100/56">
              {getGameDifficultyLabel(game.difficulty)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold text-violet-50/72 transition hover:border-cyan-300/35 hover:bg-cyan-300/8 hover:text-cyan-50"
        >
          ← 返回游戏列表
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-emerald-300/16 bg-slate-950/55" style={{ aspectRatio: "4/3" }}>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            sandbox={sandbox}
            title={game.nameZh}
            className="h-full w-full"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="text-2xl">⚠️</p>
              <p className="mt-2 text-sm text-emerald-50/62">游戏资源路径未配置</p>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-[0.7rem] text-emerald-100/38">
        游戏运行在隔离沙箱中，不影响空间聊天
      </p>
    </div>
  )
}

export function MiniGameWorkshopPanel({ onBack }: { onBack?: () => void }) {
  const [playingGame, setPlayingGame] = useState<MiniGameCatalogEntry | null>(null)

  if (playingGame) {
    return <GamePlayer game={playingGame} onBack={() => setPlayingGame(null)} />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/62">小游戏工坊</p>
          <p className="mt-1 text-sm font-semibold text-emerald-50/72">
            自研小游戏 · 无外部依赖 · 可离线运行
          </p>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-100">
          {MINI_GAME_CATALOG.length} 个游戏
        </span>
      </div>

      <div className="space-y-2">
        {MINI_GAME_CATALOG.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onPlay={(g) => setPlayingGame(g)}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-300/12 bg-emerald-300/6 p-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100/62">安全说明</p>
        <ul className="mt-2 space-y-1 text-xs text-emerald-50/62">
          <li>• 游戏运行在隔离沙箱中，无外部跳转权限</li>
          <li>• 不允许弹出窗口或导航到外部链接</li>
          <li>• 所有游戏均为自研原创，无需外部许可证</li>
        </ul>
      </div>

      <p className="text-center text-[0.7rem] text-emerald-100/38">
        选择一个小游戏开始，结束后可以继续聊天
      </p>
    </div>
  )
}
