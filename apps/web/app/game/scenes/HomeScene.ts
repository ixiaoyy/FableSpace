import Phaser from "phaser"

import {
  GAME_TEXTURE_KEYS,
  HOME_WORLD_HEIGHT,
  HOME_WORLD_WIDTH,
  TILE_SIZE,
} from "../constants"
import {
  advanceDay,
  createSceneSave,
  decodeGameSave,
  GAME_SAVE_REGISTRY_KEY,
  GAME_SPAWN_IDS,
  type GameSave,
} from "../save"
import { formatGameTime } from "../game-time"
import { startDayClock, type DayClockController } from "./day-clock"
import {
  createHudLabel,
  createPlayerController,
  consumeInteraction,
  isPlayerInsideRect,
  updatePlayerController,
  type PlayerController,
} from "./scene-helpers"
import {
  HOME_BED,
  HOME_BED_INTERACTION,
  HOME_EXIT_INTERACTION,
  HOME_ROOM,
  HOME_SOLID_FURNITURE,
  HOME_SPAWN_POINTS,
} from "../world/home-map"

type HomeSceneData = { readonly spawnId?: string }

/** Render and run the fixed home interior with a single next-day interaction. */
export class HomeScene extends Phaser.Scene {
  private controller!: PlayerController
  private inputLocked = false
  private prompt!: Phaser.GameObjects.Text
  private clockLabel!: Phaser.GameObjects.Text
  private dayClock: DayClockController | null = null

  constructor() {
    super("home")
  }

  /** Build the room, original furniture, player, collisions, and minimal HUD. */
  create(data: HomeSceneData): void {
    this.inputLocked = false
    this.physics.world.setBounds(0, 0, HOME_WORLD_WIDTH, HOME_WORLD_HEIGHT)
    this.cameras.main.setBounds(0, 0, HOME_WORLD_WIDTH, HOME_WORLD_HEIGHT)
    this.cameras.main.setBackgroundColor("#221b1a")

    this.drawRoom()
    const solids = this.physics.add.staticGroup()
    this.createRoomCollisions(solids)
    this.createBed(solids)
    this.createFurniture(solids)

    const save = this.currentSave()
    const spawnId = data.spawnId === GAME_SPAWN_IDS.home.nextDay
      ? GAME_SPAWN_IDS.home.nextDay
      : GAME_SPAWN_IDS.home.entryDoor
    const spawn = HOME_SPAWN_POINTS[spawnId]
    this.controller = createPlayerController(this, spawn.x, spawn.y)
    this.physics.add.collider(this.controller.player, solids)

    createHudLabel(this, 12, 12, save.player_name)
    this.clockLabel = createHudLabel(this, 468, 12, "")
      .setOrigin(1, 0)
      .setAlign("right")
    this.startClock(save)
    this.prompt = createHudLabel(this, 0, 286, "E 出门").setVisible(false)
    this.cameras.main.fadeIn(220, 28, 21, 25)
  }

  /** Advance movement and dispatch exactly one authored door or bed interaction. */
  update(): void {
    updatePlayerController(this.controller, this.inputLocked)
    const interactionPressed = consumeInteraction(this.controller)
    const atExit = isPlayerInsideRect(this.controller.player, HOME_EXIT_INTERACTION)
    const atBed = isPlayerInsideRect(this.controller.player, HOME_BED_INTERACTION)

    this.prompt
      .setText(atBed ? "E 睡觉" : "E 出门")
      .setVisible(!this.inputLocked && (atBed || atExit))
    this.prompt.setX(Math.round((this.scale.gameSize.width - this.prompt.width) / 2))

    if (this.inputLocked || !interactionPressed) return
    if (atBed) {
      this.sleepUntilTomorrow()
      return
    }
    if (atExit) {
      this.leaveHouse()
    }
  }

  /** Fill the room with official interior floor tiles and project-original wall panels. */
  private drawRoom(): void {
    this.add.rectangle(
      HOME_ROOM.x,
      HOME_ROOM.y,
      HOME_ROOM.width,
      HOME_ROOM.height,
      0x76533a,
    ).setOrigin(0).setDepth(-100)

    for (let y = HOME_ROOM.y + TILE_SIZE; y < HOME_ROOM.y + HOME_ROOM.height; y += TILE_SIZE) {
      for (let x = HOME_ROOM.x; x < HOME_ROOM.x + HOME_ROOM.width; x += TILE_SIZE) {
        this.add.image(x, y, GAME_TEXTURE_KEYS.interiorFloor, GAME_TEXTURE_KEYS.homeFloor)
          .setOrigin(0)
          .setTint((x / TILE_SIZE + y / TILE_SIZE) % 2 === 0 ? 0xe5c38a : 0xd9ae72)
          .setDepth(-90)
      }
    }

    const walls = this.add.graphics().setDepth(-30)
    walls.fillStyle(0x402d2b, 1)
    walls.fillRect(HOME_ROOM.x, HOME_ROOM.y, HOME_ROOM.width, 18)
    walls.fillStyle(0x604338, 1)
    walls.fillRect(HOME_ROOM.x, HOME_ROOM.y + 18, HOME_ROOM.width, 12)
    walls.fillStyle(0x2f2425, 1)
    walls.fillRect(HOME_ROOM.x, HOME_ROOM.y, 10, HOME_ROOM.height)
    walls.fillRect(HOME_ROOM.x + HOME_ROOM.width - 10, HOME_ROOM.y, 10, HOME_ROOM.height)
    const doorwayWidth = 40
    const lowerWallWidth = (HOME_ROOM.width - doorwayWidth) / 2
    walls.fillRect(HOME_ROOM.x, HOME_ROOM.y + HOME_ROOM.height - 10, lowerWallWidth, 10)
    walls.fillRect(
      HOME_ROOM.x + lowerWallWidth + doorwayWidth,
      HOME_ROOM.y + HOME_ROOM.height - 10,
      lowerWallWidth,
      10,
    )
    walls.fillStyle(0x87b7c4, 1)
    walls.fillRect(224, 47, 32, 18)
    walls.lineStyle(2, 0xeed28e, 1)
    walls.strokeRect(224, 47, 32, 18)
    walls.lineBetween(240, 48, 240, 64)
  }

  /** Draw a warm original pixel bed and add a footboard collision only. */
  private createBed(solids: Phaser.Physics.Arcade.StaticGroup): void {
    const bed = this.add.graphics().setDepth(HOME_BED.y + HOME_BED.height)
    bed.fillStyle(0x5c382c, 1)
    bed.fillRect(HOME_BED.x, HOME_BED.y, HOME_BED.width, HOME_BED.height)
    bed.fillStyle(0xf0d49a, 1)
    bed.fillRect(HOME_BED.x + 5, HOME_BED.y + 5, HOME_BED.width - 10, 18)
    bed.fillStyle(0xb85b4f, 1)
    bed.fillRect(HOME_BED.x + 5, HOME_BED.y + 25, HOME_BED.width - 10, HOME_BED.height - 31)
    bed.fillStyle(0xd97a62, 1)
    bed.fillRect(HOME_BED.x + 5, HOME_BED.y + 25, 8, HOME_BED.height - 31)
    bed.lineStyle(3, 0x3c2824, 1)
    bed.strokeRect(HOME_BED.x, HOME_BED.y, HOME_BED.width, HOME_BED.height)
    this.addStaticBlock(
      solids,
      HOME_BED.x + HOME_BED.width / 2,
      HOME_BED.y + HOME_BED.height / 2,
      HOME_BED.width,
      HOME_BED.height,
    )
  }

  /** Draw three compact original furniture silhouettes and register their collisions. */
  private createFurniture(solids: Phaser.Physics.Arcade.StaticGroup): void {
    HOME_SOLID_FURNITURE.forEach((item) => {
      const furniture = this.add.graphics().setDepth(item.y + item.height)
      if (item.kind === "table") {
        furniture.fillStyle(0x704832, 1)
        furniture.fillRect(item.x, item.y, item.width, item.height)
        furniture.fillStyle(0xa87345, 1)
        furniture.fillRect(item.x + 3, item.y + 3, item.width - 6, item.height - 11)
      } else if (item.kind === "cabinet") {
        furniture.fillStyle(0x51352f, 1)
        furniture.fillRect(item.x, item.y, item.width, item.height)
        furniture.fillStyle(0xd49b57, 1)
        furniture.fillRect(item.x + 5, item.y + 5, item.width - 10, 3)
        furniture.fillRect(item.x + 5, item.y + 14, item.width - 10, 3)
      } else {
        furniture.fillStyle(0x6a3f2d, 1)
        furniture.fillRect(item.x, item.y, item.width, item.height)
        furniture.fillStyle(0xbf7a42, 1)
        furniture.fillRect(item.x + 4, item.y + 5, item.width - 8, 5)
      }
      this.addStaticBlock(
        solids,
        item.x + item.width / 2,
        item.y + item.height / 2,
        item.width,
        item.height,
      )
    })
  }

  /** Add wall collision blocks and a thin doorway threshold that requires explicit exit interaction. */
  private createRoomCollisions(solids: Phaser.Physics.Arcade.StaticGroup): void {
    const { x, y, width, height } = HOME_ROOM
    const doorwayWidth = 40
    const lowerWallWidth = (width - doorwayWidth) / 2
    this.addStaticBlock(solids, x + width / 2, y + 14, width, 28)
    this.addStaticBlock(solids, x + 5, y + height / 2, 10, height)
    this.addStaticBlock(solids, x + width - 5, y + height / 2, 10, height)
    this.addStaticBlock(solids, x + lowerWallWidth / 2, y + height - 5, lowerWallWidth, 10)
    this.addStaticBlock(solids, x + width / 2, y + height - 2, doorwayWidth, 4)
    this.addStaticBlock(
      solids,
      x + lowerWallWidth + doorwayWidth + lowerWallWidth / 2,
      y + height - 5,
      lowerWallWidth,
      10,
    )
  }

  /** Add one invisible rectangular static collider. */
  private addStaticBlock(
    solids: Phaser.Physics.Arcade.StaticGroup,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const block = this.add.rectangle(x, y, width, height, 0x000000, 0)
    solids.add(block)
    const body = block.body
    if (body instanceof Phaser.Physics.Arcade.StaticBody) {
      body.updateFromGameObject()
    }
  }

  /** Lock input, preserve the day, save the farm-door spawn, and fade outdoors. */
  private leaveHouse(): void {
    this.inputLocked = true
    this.dayClock?.stop()
    this.controller.player.setVelocity(0, 0)
    const nextSave = createSceneSave(this.currentSave(), "farm", GAME_SPAWN_IDS.farm.houseDoor)
    this.game.registry.set(GAME_SAVE_REGISTRY_KEY, nextSave)
    this.cameras.main.fadeOut(240, 28, 21, 25)
    this.time.delayedCall(240, () => {
      this.scene.start("farm", { spawnId: nextSave.spawn_id })
    })
  }

  /** Lock the scene, advance one day once, then wake beside the bed after a full fade. */
  private sleepUntilTomorrow(automatic = false): void {
    if (this.inputLocked) return

    this.inputLocked = true
    this.dayClock?.stop()
    this.controller.player.setVelocity(0, 0)
    this.prompt
      .setText(automatic ? "夜深了…" : "晚安…")
      .setVisible(true)
    this.prompt.setX(Math.round((this.scale.gameSize.width - this.prompt.width) / 2))
    this.cameras.main.fadeOut(520, 28, 21, 25)
    this.time.delayedCall(640, () => {
      const nextSave = advanceDay(this.currentSave())
      this.game.registry.set(GAME_SAVE_REGISTRY_KEY, nextSave)
      const wakePoint = HOME_SPAWN_POINTS[GAME_SPAWN_IDS.home.nextDay]
      this.controller.player.body.reset(wakePoint.x, wakePoint.y)
      this.controller.lastDirection = "down"
      this.prompt.setVisible(false)
      this.startClock(nextSave)
      this.cameras.main.fadeIn(620, 244, 210, 143)
      this.time.delayedCall(620, () => {
        this.inputLocked = false
      })
    })
  }

  /** Start the indoor timer and keep its fixed HUD synchronized with persisted time. */
  private startClock(save: GameSave): void {
    this.dayClock?.stop()
    this.updateClockLabel(save)
    this.dayClock = startDayClock(this, {
      onTimeChanged: (nextSave) => this.updateClockLabel(nextSave),
      onDayEnd: () => this.sleepUntilTomorrow(true),
    })
  }

  /** Update the two-line day and clock label without mirroring time into React state. */
  private updateClockLabel(save: GameSave): void {
    this.clockLabel.setText(`第 ${save.day} 天\n${formatGameTime(save.time_minutes)}`)
  }

  /** Return the current validated in-memory save without re-reading browser storage. */
  private currentSave(): GameSave {
    const save = decodeGameSave(this.game.registry.get(GAME_SAVE_REGISTRY_KEY))
    if (save === null) throw new Error("The in-memory home save is missing or invalid.")
    return save
  }
}
