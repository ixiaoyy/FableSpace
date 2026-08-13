import Phaser from "phaser"

import { GAME_HEIGHT, GAME_WIDTH } from "./constants"
import { BootScene } from "./scenes/BootScene"
import { FarmScene } from "./scenes/FarmScene"
import { HomeScene } from "./scenes/HomeScene"
import { GAME_RUNTIME_EVENTS, type CreateGameOptions } from "./types"

/**
 * Create one Phaser runtime inside the supplied browser element.
 * BootScene owns asset readiness and reports its terminal startup result through game events.
 */
export function createGame({
  parent,
  onReady,
  onError,
}: CreateGameOptions): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#172018",
    pixelArt: true,
    roundPixels: true,
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
        gravity: { x: 0, y: 0 },
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    scene: [BootScene, FarmScene, HomeScene],
    callbacks: {
      /** Register startup listeners before Phaser starts the first scene. */
      preBoot(game) {
        let startupSettled = false

        /** Accept the first successful asset-ready signal and ignore later terminal signals. */
        const handleReady = (): void => {
          if (startupSettled) return
          startupSettled = true
          game.events.off(GAME_RUNTIME_EVENTS.error, handleError)
          onReady()
        }

        /** Accept the first startup failure and prevent a later ready signal from hiding it. */
        const handleError = (reason?: unknown): void => {
          if (startupSettled) return
          startupSettled = true
          game.events.off(GAME_RUNTIME_EVENTS.ready, handleReady)
          onError(reason)
        }

        game.events.once(GAME_RUNTIME_EVENTS.ready, handleReady)
        game.events.once(GAME_RUNTIME_EVENTS.error, handleError)
      },
    },
  }

  return new Phaser.Game(config)
}
