import Phaser from "phaser"

import {
  FARM_WORLD_HEIGHT,
  FARM_WORLD_WIDTH,
  GAME_TEXTURE_KEYS,
  TILE_SIZE,
} from "../constants"
import {
  createSceneSave,
  decodeGameSave,
  GAME_SAVE_REGISTRY_KEY,
  GAME_SPAWN_IDS,
  type GameSave,
} from "../save"
import {
  createHudLabel,
  createPlayerController,
  consumeInteraction,
  isPlayerInsideRect,
  updatePlayerController,
  type PlayerController,
} from "./scene-helpers"
import {
  FARM_DOOR_INTERACTION,
  FARM_FLOWER_PATCHES,
  FARM_HOUSE,
  FARM_ROCKS,
  FARM_SPAWN_POINTS,
  FARM_TREES,
} from "../world/farm-map"

type FarmSceneData = { readonly spawnId?: string }

/** Render and run the fixed outdoor farm scene. */
export class FarmScene extends Phaser.Scene {
  private controller!: PlayerController
  private inputLocked = false
  private prompt!: Phaser.GameObjects.Text

  constructor() {
    super("farm")
  }

  /** Build the farm, collisions, player, camera, and minimal HUD from authored data. */
  create(data: FarmSceneData): void {
    this.inputLocked = false
    this.physics.world.setBounds(0, 0, FARM_WORLD_WIDTH, FARM_WORLD_HEIGHT)
    this.cameras.main.setBounds(0, 0, FARM_WORLD_WIDTH, FARM_WORLD_HEIGHT)
    this.cameras.main.setBackgroundColor("#94ad35")

    this.drawGround()
    const solids = this.physics.add.staticGroup()
    this.createWorldBounds(solids)
    this.createHouse(solids)
    this.createTrees(solids)
    this.createRocks(solids)
    this.drawFarmDetails()

    const save = this.currentSave()
    const spawnId = data.spawnId === GAME_SPAWN_IDS.farm.houseDoor
      ? GAME_SPAWN_IDS.farm.houseDoor
      : GAME_SPAWN_IDS.farm.start
    const spawn = FARM_SPAWN_POINTS[spawnId]
    this.controller = createPlayerController(this, spawn.x, spawn.y)
    this.physics.add.collider(this.controller.player, solids)
    this.cameras.main.startFollow(this.controller.player, true, 0.12, 0.12)
    this.cameras.main.setDeadzone(88, 56)

    createHudLabel(this, 12, 12, `${save.player_name} · 第 ${save.day} 天`)
    this.prompt = createHudLabel(this, 0, 286, "E 进入")
      .setVisible(false)

    this.cameras.main.fadeIn(220, 31, 39, 26)
  }

  /** Advance movement, prompt visibility, and the edge-triggered house transition. */
  update(): void {
    updatePlayerController(this.controller, this.inputLocked)
    const interactionPressed = consumeInteraction(this.controller)
    const atDoor = isPlayerInsideRect(this.controller.player, FARM_DOOR_INTERACTION)
    this.prompt.setVisible(atDoor && !this.inputLocked)
    this.prompt.setX(Math.round((this.scale.gameSize.width - this.prompt.width) / 2))

    if (atDoor && !this.inputLocked && interactionPressed) {
      this.enterHouse()
    }
  }

  /** Fill the farm with official grass/path tiles in a compact authored layout. */
  private drawGround(): void {
    for (let y = 0; y < FARM_WORLD_HEIGHT; y += TILE_SIZE) {
      for (let x = 0; x < FARM_WORLD_WIDTH; x += TILE_SIZE) {
        const detail = (x / TILE_SIZE + y / TILE_SIZE) % 7 === 0
        this.add.image(
          x,
          y,
          GAME_TEXTURE_KEYS.floor,
          detail ? GAME_TEXTURE_KEYS.farmGrassDetail : GAME_TEXTURE_KEYS.farmGrass,
        )
          .setOrigin(0)
          .setDepth(-100)
      }
    }

    for (let y = 146; y < FARM_WORLD_HEIGHT; y += TILE_SIZE) {
      for (let x = 288; x <= 336; x += TILE_SIZE) {
        const detail = (x + y) % 48 === 0
        this.add.image(
          x,
          y,
          GAME_TEXTURE_KEYS.floor,
          detail ? GAME_TEXTURE_KEYS.farmPathDetail : GAME_TEXTURE_KEYS.farmPath,
        )
          .setOrigin(0)
          .setDepth(-90)
      }
    }
  }

  /** Place the adopted house sprite and a compact wall collision that leaves the door reachable. */
  private createHouse(solids: Phaser.Physics.Arcade.StaticGroup): void {
    this.add.image(FARM_HOUSE.x, FARM_HOUSE.y, GAME_TEXTURE_KEYS.village, GAME_TEXTURE_KEYS.house)
      .setScale(1.25)
      .setOrigin(0.5, 0.5)
      .setDepth(FARM_HOUSE.y + 38)

    this.addStaticBlock(solids, FARM_HOUSE.x, FARM_HOUSE.y + 8, 92, 66)
  }

  /** Place trees with small trunk colliders and foot-position depth. */
  private createTrees(solids: Phaser.Physics.Arcade.StaticGroup): void {
    FARM_TREES.forEach((tree, index) => {
      const key = index % 3 === 1 ? GAME_TEXTURE_KEYS.treeSmall : GAME_TEXTURE_KEYS.tree
      this.add.image(tree.x, tree.y, GAME_TEXTURE_KEYS.village, key)
        .setScale(tree.scale)
        .setOrigin(0.5, 0.82)
        .setDepth(tree.y)
      this.addStaticBlock(solids, tree.x, tree.y - 2, 18 * tree.scale, 12 * tree.scale)
    })
  }

  /** Place rocks with compact colliders and natural scale variation. */
  private createRocks(solids: Phaser.Physics.Arcade.StaticGroup): void {
    FARM_ROCKS.forEach((rock, index) => {
      const key = index % 2 === 0 ? GAME_TEXTURE_KEYS.rock : GAME_TEXTURE_KEYS.rockSmall
      this.add.image(rock.x, rock.y, GAME_TEXTURE_KEYS.village, key)
        .setScale(rock.scale)
        .setOrigin(0.5, 0.72)
        .setDepth(rock.y)
      this.addStaticBlock(solids, rock.x, rock.y, 18 * rock.scale, 12 * rock.scale)
    })
  }

  /** Add lightweight project-original flower dots without creating binary assets. */
  private drawFarmDetails(): void {
    const graphics = this.add.graphics().setDepth(-20)
    FARM_FLOWER_PATCHES.forEach(({ x, y }, patchIndex) => {
      for (let offset = 0; offset < 4; offset += 1) {
        const color = (patchIndex + offset) % 2 === 0 ? 0xf4d35e : 0xf28779
        graphics.fillStyle(color, 1)
        graphics.fillRect(x + offset * 5, y + (offset % 2) * 4, 2, 2)
        graphics.fillStyle(0x4d7c35, 1)
        graphics.fillRect(x + offset * 5, y + 2 + (offset % 2) * 4, 1, 3)
      }
    })
  }

  /** Add invisible map-edge collision blocks to the shared static group. */
  private createWorldBounds(solids: Phaser.Physics.Arcade.StaticGroup): void {
    this.addStaticBlock(solids, FARM_WORLD_WIDTH / 2, -8, FARM_WORLD_WIDTH, 16)
    this.addStaticBlock(solids, FARM_WORLD_WIDTH / 2, FARM_WORLD_HEIGHT + 8, FARM_WORLD_WIDTH, 16)
    this.addStaticBlock(solids, -8, FARM_WORLD_HEIGHT / 2, 16, FARM_WORLD_HEIGHT)
    this.addStaticBlock(solids, FARM_WORLD_WIDTH + 8, FARM_WORLD_HEIGHT / 2, 16, FARM_WORLD_HEIGHT)
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

  /** Lock input, save a stable indoor spawn, and fade to the home scene once. */
  private enterHouse(): void {
    this.inputLocked = true
    this.controller.player.setVelocity(0, 0)
    const nextSave = createSceneSave(this.currentSave(), "home", GAME_SPAWN_IDS.home.entryDoor)
    this.game.registry.set(GAME_SAVE_REGISTRY_KEY, nextSave)
    this.cameras.main.fadeOut(240, 31, 39, 26)
    this.time.delayedCall(240, () => {
      this.scene.start("home", { spawnId: nextSave.spawn_id })
    })
  }

  /** Return the current validated in-memory save without re-reading browser storage. */
  private currentSave(): GameSave {
    const save = decodeGameSave(this.game.registry.get(GAME_SAVE_REGISTRY_KEY))
    if (save === null) throw new Error("The in-memory farm save is missing or invalid.")
    return save
  }
}
