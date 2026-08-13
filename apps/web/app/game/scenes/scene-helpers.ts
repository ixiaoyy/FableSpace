import Phaser from "phaser"

import {
  GAME_ANIMATION_KEYS,
  GAME_TEXTURE_KEYS,
  PLAYER_SPEED,
} from "../constants"

export type PlayerDirection = "down" | "up" | "left" | "right"

export type PlayerController = {
  readonly player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody
  readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys
  readonly keys: Record<"up" | "down" | "left" | "right" | "interact" | "space", Phaser.Input.Keyboard.Key>
  interactionQueued: boolean
  lastDirection: PlayerDirection
}

/** Create the shared player sprite, keyboard mapping, and compact foot collision body. */
export function createPlayerController(
  scene: Phaser.Scene,
  x: number,
  y: number,
): PlayerController {
  const keyboard = scene.input.keyboard
  if (keyboard === null) {
    throw new Error("Keyboard input is unavailable")
  }

  const player = scene.physics.add.sprite(x, y, GAME_TEXTURE_KEYS.player, 0)
  player.setScale(1.35)
  player.setOrigin(0.5, 0.78)
  player.setCollideWorldBounds(true)
  player.body.setSize(9, 7).setOffset(3.5, 8.5)
  player.setDepth(y)

  const keys = keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D,
    interact: Phaser.Input.Keyboard.KeyCodes.E,
    space: Phaser.Input.Keyboard.KeyCodes.SPACE,
  }) as PlayerController["keys"]

  const controller: PlayerController = {
    player,
    cursors: keyboard.createCursorKeys(),
    keys,
    interactionQueued: false,
    lastDirection: "down",
  }

  /** Buffer short interaction taps so a down/up pair between render frames is not lost. */
  const queueInteraction = (): void => {
    controller.interactionQueued = true
  }

  keys.interact.on(Phaser.Input.Keyboard.Events.DOWN, queueInteraction)
  keys.space.on(Phaser.Input.Keyboard.Events.DOWN, queueInteraction)
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    keys.interact.off(Phaser.Input.Keyboard.Events.DOWN, queueInteraction)
    keys.space.off(Phaser.Input.Keyboard.Events.DOWN, queueInteraction)
  })

  return controller
}

/** Update normalized four-direction movement, animation, facing, and foot-based depth. */
export function updatePlayerController(
  controller: PlayerController,
  inputLocked: boolean,
): void {
  const { player, cursors, keys } = controller
  let velocityX = 0
  let velocityY = 0

  if (!inputLocked) {
    const left = cursors.left?.isDown || keys.left.isDown
    const right = cursors.right?.isDown || keys.right.isDown
    const up = cursors.up?.isDown || keys.up.isDown
    const down = cursors.down?.isDown || keys.down.isDown

    velocityX = (right ? 1 : 0) - (left ? 1 : 0)
    velocityY = (down ? 1 : 0) - (up ? 1 : 0)
  }

  const velocity = new Phaser.Math.Vector2(velocityX, velocityY)
  if (velocity.lengthSq() > 0) {
    velocity.normalize().scale(PLAYER_SPEED)
    player.setVelocity(velocity.x, velocity.y)

    if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
      controller.lastDirection = velocity.x < 0 ? "left" : "right"
    } else {
      controller.lastDirection = velocity.y < 0 ? "up" : "down"
    }
    player.anims.play(animationKeyForDirection(controller.lastDirection), true)
  } else {
    player.setVelocity(0, 0)
    player.anims.stop()
    player.setFrame(idleFrameForDirection(controller.lastDirection))
  }

  player.setDepth(Math.round(player.y + 8))
}

/** Consume at most one buffered interaction press for the current scene. */
export function consumeInteraction(controller: PlayerController): boolean {
  if (!controller.interactionQueued) return false

  controller.interactionQueued = false
  return true
}

/** Return whether the player's feet are inside an authored interaction rectangle. */
export function isPlayerInsideRect(
  player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
  area: Readonly<{ x: number; y: number; width: number; height: number }>,
): boolean {
  return Phaser.Geom.Rectangle.Contains(
    new Phaser.Geom.Rectangle(area.x, area.y, area.width, area.height),
    player.x,
    player.y,
  )
}

/** Create a camera-fixed paper label for day and interaction feedback. */
export function createHudLabel(scene: Phaser.Scene, x: number, y: number, text: string) {
  return scene.add.text(x, y, text, {
    color: "#372718",
    fontFamily: '"Courier New", monospace',
    fontSize: "12px",
    fontStyle: "bold",
    backgroundColor: "#f5d796",
    padding: { x: 7, y: 5 },
    stroke: "#f5d796",
    strokeThickness: 1,
  }).setScrollFactor(0).setDepth(10000).setResolution(2)
}

/** Map the current facing direction to its shared walking animation key. */
function animationKeyForDirection(direction: PlayerDirection): string {
  return {
    down: GAME_ANIMATION_KEYS.walkDown,
    up: GAME_ANIMATION_KEYS.walkUp,
    left: GAME_ANIMATION_KEYS.walkLeft,
    right: GAME_ANIMATION_KEYS.walkRight,
  }[direction]
}

/** Map the current facing direction to the official sprite sheet idle column. */
function idleFrameForDirection(direction: PlayerDirection): number {
  return {
    down: 0,
    up: 1,
    left: 2,
    right: 3,
  }[direction]
}
