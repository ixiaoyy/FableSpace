import { useEffect, useRef, useState } from "react"

import type { GameSave } from "./save"

type GameLoadStatus = "loading" | "ready" | "error"

type PhaserGameHandle = {
  destroy: (removeCanvas?: boolean, noReturn?: boolean) => void
}

type SynchronousPhaserGameHandle = PhaserGameHandle & {
  runDestroy: () => void
}

type GameCanvasProps = {
  readonly initialSave: GameSave
}

/** Log a browser runtime startup failure while keeping implementation detail out of the UI. */
function reportGameFailure(reason: unknown): void {
  console.error("[farm-game] Game startup failed.", reason)
}

/** Detect Phaser 3.90's internal synchronous destroy hook without asserting it exists on future versions. */
function supportsSynchronousDestroy(
  game: PhaserGameHandle,
): game is SynchronousPhaserGameHandle {
  return "runDestroy" in game && typeof game.runDestroy === "function"
}

/** Destroy one game immediately when the locked Phaser version exposes its internal cleanup hook. */
function destroyGame(game: PhaserGameHandle): void {
  game.destroy(true)
  if (supportsSynchronousDestroy(game)) {
    game.runDestroy()
  }
}

/**
 * Own the single Phaser canvas instance for this React mount.
 * Dynamic import cancellation and explicit destruction make StrictMode effect replay safe.
 */
export function GameCanvas({ initialSave }: GameCanvasProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [attempt, setAttempt] = useState(0)
  const [status, setStatus] = useState<GameLoadStatus>("loading")

  useEffect(() => {
    const stage = stageRef.current
    if (stage === null) return

    let cancelled = false
    let game: PhaserGameHandle | null = null

    void import("./create-game")
      .then(({ createGame }) => {
        if (cancelled) return

        game = createGame({
          parent: stage,
          initialSave,
          onReady: () => {
            if (!cancelled) setStatus("ready")
          },
          onError: (reason) => {
            if (cancelled) return
            reportGameFailure(reason)
            setStatus("error")
          },
        })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        reportGameFailure(error)
        stage.replaceChildren()
        setStatus("error")
      })

    return () => {
      cancelled = true
      if (game !== null) {
        destroyGame(game)
      }
      game = null
      stage.replaceChildren()
    }
  }, [attempt, initialSave])

  return (
    <div className="gameCanvas" aria-busy={status === "loading"}>
      <div className="gameCanvas__stage" ref={stageRef} />

      {status !== "ready" ? (
        <div
          className="gameCanvas__status"
          role={status === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <span>{status === "error" ? "游戏加载失败" : "加载中…"}</span>
          {status === "error" ? (
            <button
              className="gameCanvas__retry"
              type="button"
              onClick={() => {
                setStatus("loading")
                setAttempt((currentAttempt) => currentAttempt + 1)
              }}
            >
              重试
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default GameCanvas
