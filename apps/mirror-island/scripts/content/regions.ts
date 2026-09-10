// 仅用于构建期校验 Tiled 内容；游戏状态、碰撞和移动由 Godot 实现。
export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

export const PLAYER_FEET_HALF_WIDTH = 5;
export const PLAYER_FEET_HALF_HEIGHT = 4;
export const NPC_FEET_HALF_WIDTH = 5;
export const NPC_FEET_HALF_HEIGHT = 3;

/** 按两组中心与半尺寸判断脚底矩形是否重叠；返回布尔值，供出生点校验使用。 */
export function worldFeetOverlap(
  left: WorldPoint,
  leftHalfWidth: number,
  leftHalfHeight: number,
  right: WorldPoint,
  rightHalfWidth: number,
  rightHalfHeight: number,
): boolean {
  return Math.abs(left.x - right.x) < leftHalfWidth + rightHalfWidth
    && Math.abs(left.y - right.y) < leftHalfHeight + rightHalfHeight;
}

export interface WorldRect extends WorldPoint {
  readonly width: number;
  readonly height: number;
}

export interface CollisionGrid {
  readonly columns: number;
  readonly rows: number;
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly blocked: readonly boolean[];
}

export interface ExitDefinition extends WorldRect {
  readonly id: string;
  readonly targetRegionId: string;
  readonly targetSpawnId: string;
}

export interface ResourceSpawnDefinition extends WorldPoint {
  readonly entityId: string;
  readonly regionId: string;
  readonly kind: "tree" | "stone" | "weed" | "wild-horseradish" | "daffodil" | "leek" | "dandelion" | "fallen-branch";
}

export interface FishingZoneDefinition extends WorldRect {
  readonly id: string;
  readonly regionId: string;
}

export interface StandardInteractionDefinition extends WorldRect {
  readonly entityId: string;
  readonly regionId: string;
  readonly kind: "farm-plot" | "door" | "bed" | "backpack-display" | "building-service";
}

export interface InspectInteractionDefinition extends WorldRect {
  readonly entityId: string;
  readonly regionId: string;
  readonly kind: "inspect";
  readonly dialogueId: string;
}

export type InteractionDefinition = StandardInteractionDefinition | InspectInteractionDefinition;

export interface NpcSpawnDefinition extends WorldPoint {
  readonly entityId: string;
  readonly regionId: string;
  readonly npcId: string;
  readonly dialogueId: string;
  readonly interactionType: "shop" | "dialogue" | "building-service";
  readonly routine?: "regular" | "rain" | "rest";
}

export interface RegionDefinition {
  readonly id: string;
  readonly mapKey: string;
  readonly displayName: string;
  readonly defaultSpawnId: string;
  readonly isStartRegion: boolean;
  readonly widthPixels: number;
  readonly heightPixels: number;
  readonly collision: CollisionGrid;
  readonly waterTiles: readonly boolean[];
  readonly tillableTiles: readonly boolean[];
  readonly placeableTiles: readonly boolean[];
  readonly buildableTiles: readonly boolean[];
  readonly spawns: Readonly<Record<string, WorldPoint>>;
  readonly exits: readonly ExitDefinition[];
  readonly resources: readonly ResourceSpawnDefinition[];
  readonly interactions: readonly InteractionDefinition[];
  readonly npcs: readonly NpcSpawnDefinition[];
  readonly fishingZones: readonly FishingZoneDefinition[];
}

export class WorldCatalog {
  private readonly regions = new Map<string, RegionDefinition>();
  private readonly resources = new Map<string, ResourceSpawnDefinition>();
  private readonly interactions = new Map<string, InteractionDefinition>();
  private readonly npcs = new Map<string, NpcSpawnDefinition>();
  private readonly fishingZones = new Map<string, FishingZoneDefinition>();

  /** 从已解析区域构造校验目录；拒绝重复身份、无效出生点和断开的出口。 */
  constructor(definitions: readonly RegionDefinition[]) {
    if (definitions.length === 0) throw new Error("World catalog requires at least one region.");
    for (const definition of definitions) {
      const normalized: RegionDefinition = {
        ...definition,
        waterTiles: definition.waterTiles ?? Array.from(
          { length: definition.collision.columns * definition.collision.rows },
          () => false,
        ),
        tillableTiles: definition.tillableTiles ?? Array.from(
          { length: definition.collision.columns * definition.collision.rows }, () => false,
        ),
        placeableTiles: definition.placeableTiles ?? Array.from(
          { length: definition.collision.columns * definition.collision.rows }, () => false,
        ),
        buildableTiles: definition.buildableTiles ?? Array.from(
          { length: definition.collision.columns * definition.collision.rows }, () => false,
        ),
        fishingZones: definition.fishingZones ?? [],
      };
      this.registerRegion(normalized);
    }
    const startRegions = definitions.filter((definition) => definition.isStartRegion);
    if (startRegions.length !== 1) throw new Error("World catalog requires exactly one start region.");
    this.validateExitTargets();
  }

  /** 按区域 ID 返回定义；未知 ID 立即报错，不能忽略无效出口。 */
  private requireRegion(regionId: string): RegionDefinition {
    const region = this.regions.get(regionId);
    if (!region) throw new Error(`Unknown region: ${regionId}.`);
    return region;
  }


  /** 按区域及出生点 ID 返回坐标；缺失时终止地图构建。 */
  private requireSpawn(regionId: string, spawnId: string): WorldPoint {
    const spawn = this.requireRegion(regionId).spawns[spawnId];
    if (!spawn) throw new Error(`Unknown spawn ${spawnId} in region ${regionId}.`);
    return spawn;
  }








  /** 按坐标和脚底尺寸返回是否阻挡；默认使用地图中固定居民的位置。 */
  private isBlocked(
    regionId: string,
    x: number,
    y: number,
    halfWidth = PLAYER_FEET_HALF_WIDTH,
    halfHeight = PLAYER_FEET_HALF_HEIGHT,
    activeNpcs?: readonly NpcSpawnDefinition[],
  ): boolean {
    const region = this.requireRegion(regionId);
    const samples = [
      [x - halfWidth, y - halfHeight],
      [x + halfWidth, y - halfHeight],
      [x - halfWidth, y + halfHeight],
      [x + halfWidth, y + halfHeight],
    ] as const;
    return samples.some(([sampleX, sampleY]) => this.isBlockedPoint(region, sampleX, sampleY))
      || this.overlapsNpcFeet(activeNpcs ?? region.npcs, x, y, halfWidth, halfHeight);
  }


  /** 登记区域及实体索引；区域身份、出生点和跨区域实体 ID 必须合法且唯一。 */
  private registerRegion(definition: RegionDefinition): void {
    assertStableId(definition.id, "Region ID");
    if (this.regions.has(definition.id)) throw new Error(`Duplicate region ID: ${definition.id}.`);
    if (!definition.spawns[definition.defaultSpawnId]) {
      throw new Error(`Default spawn is missing in region ${definition.id}.`);
    }
    this.validateRegionBounds(definition);
    const exitIds = new Set<string>();
    for (const exit of definition.exits) {
      assertStableId(exit.id, "Exit ID");
      if (exitIds.has(exit.id)) throw new Error(`Duplicate exit ID in region ${definition.id}: ${exit.id}.`);
      exitIds.add(exit.id);
    }
    this.regions.set(definition.id, definition);
    const defaultSpawn = definition.spawns[definition.defaultSpawnId]!;
    if (this.isBlocked(definition.id, defaultSpawn.x, defaultSpawn.y)) {
      throw new Error(`Default spawn is blocked in region ${definition.id}.`);
    }
    for (const resource of definition.resources) this.registerEntity(this.resources, resource.entityId, resource);
    for (const interaction of definition.interactions) {
      this.registerEntity(this.interactions, interaction.entityId, interaction);
    }
    for (const npc of definition.npcs) this.registerEntity(this.npcs, npc.entityId, npc);
    for (const zone of definition.fishingZones) {
      assertStableId(zone.id, "Fishing zone ID");
      if (this.fishingZones.has(zone.id)) throw new Error(`Duplicate fishing zone ID: ${zone.id}.`);
      this.fishingZones.set(zone.id, zone);
    }
  }

  /** 把实体加入指定索引；同一 ID 不能被资源、互动点或居民重复占用。 */
  private registerEntity<T>(index: Map<string, T>, entityId: string, value: T): void {
    assertStableId(entityId, "Entity ID");
    if (this.resources.has(entityId) || this.interactions.has(entityId) || this.npcs.has(entityId)) {
      throw new Error(`Duplicate world entity ID: ${entityId}.`);
    }
    index.set(entityId, value);
  }

  /** 校验所有出口的目标区域和出生点存在；任一缺失即终止构建。 */
  private validateExitTargets(): void {
    for (const region of this.regions.values()) {
      for (const exit of region.exits) this.requireSpawn(exit.targetRegionId, exit.targetSpawnId);
    }
  }

  /** 校验区域掩码尺寸与所有点、矩形边界；不修改地图或玩法状态。 */
  private validateRegionBounds(region: RegionDefinition): void {
    const grid = region.collision;
    if (
      grid.columns * grid.tileWidth !== region.widthPixels
      || grid.rows * grid.tileHeight !== region.heightPixels
      || grid.blocked.length !== grid.columns * grid.rows
    ) {
      throw new Error(`Collision grid dimensions are invalid in region ${region.id}.`);
    }
    for (const [spawnId, point] of Object.entries(region.spawns)) {
      assertStableId(spawnId, "Spawn ID");
      this.assertPointInside(region, point, `Spawn ${spawnId}`);
    }
    for (const resource of region.resources) this.assertPointInside(region, resource, `Resource ${resource.entityId}`);
    for (const npc of region.npcs) this.assertPointInside(region, npc, `NPC ${npc.entityId}`);
    for (const exit of region.exits) this.assertRectInside(region, exit, `Exit ${exit.id}`);
    for (const interaction of region.interactions) {
      this.assertRectInside(region, interaction, `Interaction ${interaction.entityId}`);
    }
    if (region.waterTiles.length !== region.collision.columns * region.collision.rows) {
      throw new Error(`Water grid dimensions are invalid in region ${region.id}.`);
    }
    if (region.tillableTiles.length !== region.waterTiles.length) {
      throw new Error(`Tillable grid dimensions are invalid in region ${region.id}.`);
    }
    if (region.placeableTiles.length !== region.waterTiles.length || region.buildableTiles.length !== region.waterTiles.length) {
      throw new Error(`Placement grid dimensions are invalid in region ${region.id}.`);
    }
    for (const zone of region.fishingZones) this.assertRectInside(region, zone, `Fishing zone ${zone.id}`);
  }

  /** 按区域边界检查命名坐标；越界时报错，无返回值。 */
  private assertPointInside(region: RegionDefinition, point: WorldPoint, label: string): void {
    if (point.x < 0 || point.y < 0 || point.x >= region.widthPixels || point.y >= region.heightPixels) {
      throw new Error(`${label} is outside region ${region.id}.`);
    }
  }

  /** 按区域边界检查命名矩形；宽高必须为正且完全位于区域内。 */
  private assertRectInside(region: RegionDefinition, rect: WorldRect, label: string): void {
    if (
      rect.width <= 0
      || rect.height <= 0
      || rect.x < 0
      || rect.y < 0
      || rect.x + rect.width > region.widthPixels
      || rect.y + rect.height > region.heightPixels
    ) {
      throw new Error(`${label} is outside region ${region.id}.`);
    }
  }

  /** 检查脚底与固定对话居民是否重叠；沿用已评审商店位置的排除规则。 */
  private overlapsNpcFeet(
    npcs: readonly NpcSpawnDefinition[],
    x: number,
    y: number,
    halfWidth: number,
    halfHeight: number,
  ): boolean {
    return npcs.some((npc) => (
      npc.interactionType === "dialogue"
      && worldFeetOverlap(
        { x, y },
        halfWidth,
        halfHeight,
        npc,
        NPC_FEET_HALF_WIDTH,
        NPC_FEET_HALF_HEIGHT,
      )
    ));
  }

  /** 按世界坐标返回点是否位于碰撞格或区域外；保持原地图边界语义。 */
  private isBlockedPoint(region: RegionDefinition, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= region.widthPixels || y >= region.heightPixels) return true;
    const column = Math.floor(x / region.collision.tileWidth);
    const row = Math.floor(y / region.collision.tileHeight);
    return region.collision.blocked[row * region.collision.columns + column] ?? true;
  }
}

/** 校验地图身份仅含限定的小写字母、数字及连字符；无效时抛出异常。 */
export function assertStableId(value: string, label: string): void {
  if (!/^[a-z0-9][a-z0-9-]{0,63}$/u.test(value)) throw new Error(`${label} is invalid.`);
}
