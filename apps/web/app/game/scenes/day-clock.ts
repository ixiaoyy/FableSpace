import Phaser from "phaser"

import { GAME_TIME_TICK_MS, nextGameTime } from "../game-time"
import {
  createTimeSave,
  decodeGameSave,
  GAME_SAVE_REGISTRY_KEY,
  type GameSave,
} from "../save"

export type DayClockController = {
  readonly stop: () => void
}

type DayClockCallbacks = {
  readonly onTimeChanged: (save: GameSave) => void
  readonly onDayEnd: () => void
}

/**
 * Start one scene-owned day clock that persists each tick through the shared save registry.
 * The returned controller must be stopped before scene transitions or manual day settlement.
 */
export function startDayClock(
  scene: Phaser.Scene,
  callbacks: DayClockCallbacks,
): DayClockController {
  let active = true
  let timerEvent: Phaser.Time.TimerEvent | null = null

  /** Stop this scene's timer and detach its shutdown listener exactly once. */
  const stop = (): void => {
    if (!active) return
    active = false
    timerEvent?.remove(false)
    timerEvent = null
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, stop)
  }

  /** Advance one persisted ten-minute step or hand the 02:00 boundary to the scene. */
  const tick = (): void => {
    if (!active) return

    const currentSave = decodeGameSave(scene.game.registry.get(GAME_SAVE_REGISTRY_KEY))
    if (currentSave === null) {
      stop()
      throw new Error("The in-memory save is missing during a day-clock tick.")
    }

    const nextMinutes = nextGameTime(currentSave.time_minutes)
    if (nextMinutes === null) {
      stop()
      callbacks.onDayEnd()
      return
    }

    const nextSave = createTimeSave(currentSave, nextMinutes)
    scene.game.registry.set(GAME_SAVE_REGISTRY_KEY, nextSave)
    callbacks.onTimeChanged(nextSave)
  }

  timerEvent = scene.time.addEvent({
    delay: GAME_TIME_TICK_MS,
    callback: tick,
    loop: true,
  })
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, stop)

  return { stop }
}
