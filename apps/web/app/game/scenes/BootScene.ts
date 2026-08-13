import Phaser from "phaser"

import { getAvatar } from "../avatars"
import {
  GAME_ANIMATION_KEYS,
  GAME_ASSET_URLS,
  GAME_TEXTURE_KEYS,
} from "../constants"
import {
  decodeGameSave,
  GAME_SAVE_REGISTRY_KEY,
  type GameSave,
} from "../save"
import { GAME_RUNTIME_EVENTS } from "../types"

/** Load the reviewed art, create runtime crops/animations, then open the saved scene. */
export class BootScene extends Phaser.Scene {
  private assetLoadFailed = false

  constructor() {
    super("boot")
  }

  /** Queue every first-slice asset and emit a terminal startup error on loader failure. */
  preload(): void {
    const initialSave = this.initialSave()
    if (initialSave === null) {
      this.assetLoadFailed = true
      this.game.events.emit(
        GAME_RUNTIME_EVENTS.error,
        new Error("The initial game save is missing or invalid."),
      )
      return
    }

    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      if (this.assetLoadFailed) return
      this.assetLoadFailed = true
      this.game.events.emit(
        GAME_RUNTIME_EVENTS.error,
        new Error(`Unable to load game asset: ${file.key}`),
      )
    })

    const avatar = getAvatar(initialSave.avatar_id)
    this.load.spritesheet(GAME_TEXTURE_KEYS.player, avatar.url, {
      frameWidth: avatar.texture.frameWidth,
      frameHeight: avatar.texture.frameHeight,
    })
    this.load.image(GAME_TEXTURE_KEYS.floor, GAME_ASSET_URLS.floor)
    this.load.image(GAME_TEXTURE_KEYS.village, GAME_ASSET_URLS.village)
    this.load.image(GAME_TEXTURE_KEYS.interiorFloor, GAME_ASSET_URLS.interiorFloor)
    this.load.image(GAME_TEXTURE_KEYS.wall, GAME_ASSET_URLS.wall)
  }

  /** Register official sprite frames, reviewed atlas regions, and enter the saved scene. */
  create(): void {
    if (this.assetLoadFailed) return

    this.createPlayerAnimations()
    this.registerFrameTexture(GAME_TEXTURE_KEYS.farmGrass, GAME_TEXTURE_KEYS.floor, 0, 192, 16, 16)
    this.registerFrameTexture(GAME_TEXTURE_KEYS.farmGrassDetail, GAME_TEXTURE_KEYS.floor, 16, 192, 16, 16)
    this.registerFrameTexture(GAME_TEXTURE_KEYS.farmPath, GAME_TEXTURE_KEYS.floor, 16, 128, 16, 16)
    this.registerFrameTexture(GAME_TEXTURE_KEYS.farmPathDetail, GAME_TEXTURE_KEYS.floor, 80, 128, 16, 16)
    this.registerFrameTexture(GAME_TEXTURE_KEYS.homeFloor, GAME_TEXTURE_KEYS.interiorFloor, 16, 16, 16, 16)
    this.registerFrameTexture(GAME_TEXTURE_KEYS.house, GAME_TEXTURE_KEYS.village, 192, 96, 64, 80)
    this.registerFrameTexture(GAME_TEXTURE_KEYS.tree, GAME_TEXTURE_KEYS.village, 64, 96, 32, 32)
    this.registerFrameTexture(GAME_TEXTURE_KEYS.treeSmall, GAME_TEXTURE_KEYS.village, 64, 144, 32, 32)
    this.registerFrameTexture(GAME_TEXTURE_KEYS.rock, GAME_TEXTURE_KEYS.village, 160, 48, 16, 16)
    this.registerFrameTexture(GAME_TEXTURE_KEYS.rockSmall, GAME_TEXTURE_KEYS.village, 128, 48, 16, 16)

    const save = this.initialSave()
    if (save === null) {
      this.game.events.emit(
        GAME_RUNTIME_EVENTS.error,
        new Error("The initial game save became invalid during startup."),
      )
      return
    }

    this.game.events.emit(GAME_RUNTIME_EVENTS.ready)
    this.scene.start(save.scene, { spawnId: save.spawn_id })
  }

  /** Decode the one-time React handoff from the Phaser registry without reading storage again. */
  private initialSave(): GameSave | null {
    return decodeGameSave(this.game.registry.get(GAME_SAVE_REGISTRY_KEY))
  }

  /** Add one named frame to an adopted source atlas without generating a Git image. */
  private registerFrameTexture(
    key: string,
    sourceKey: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const source = this.textures.get(sourceKey)
    source.add(key, 0, x, y, width, height)
  }

  /** Create one four-frame walking animation from each official direction column. */
  private createPlayerAnimations(): void {
    const directions = [
      [GAME_ANIMATION_KEYS.walkDown, 0],
      [GAME_ANIMATION_KEYS.walkUp, 1],
      [GAME_ANIMATION_KEYS.walkLeft, 2],
      [GAME_ANIMATION_KEYS.walkRight, 3],
    ] as const

    for (const [key, column] of directions) {
      if (this.anims.exists(key)) continue
      this.anims.create({
        key,
        frames: [0, 1, 2, 3].map((row) => ({
          key: GAME_TEXTURE_KEYS.player,
          frame: row * 4 + column,
        })),
        frameRate: 8,
        repeat: -1,
      })
    }
  }
}
