import {
  WorldCatalog,
  assertStableId,
  type CollisionGrid,
  type ExitDefinition,
  type FishingZoneDefinition,
  type InteractionDefinition,
  type NpcSpawnDefinition,
  type RegionDefinition,
  type ResourceSpawnDefinition,
  type WorldPoint,
} from "./regions.ts";

const TILE_SIZE = 16;
const REQUIRED_TILE_LAYERS = [
  "Ground",
  "GroundDetail",
  "Water",
  "Buildings",
  "AbovePlayer",
  "Collision",
] as const;
const REQUIRED_OBJECT_LAYERS = [
  "SpawnPoints",
  "Exits",
  "Interactions",
  "ResourceSpawns",
  "NpcSpawns",
] as const;
const OPTIONAL_OBJECT_LAYERS = ["FishingZones"] as const;
const OPTIONAL_TILE_LAYERS = ["Tillable", "Placeable", "Buildable"] as const;

/** 将原始 Tiled JSON 解析为 Godot 内容准备使用的区域数据；仅接受固定的有限 16 像素地图。 */
export function decodeTiledRegion(value: unknown, mapKey: string): RegionDefinition {
  const map = recordFrom(value, "Tiled map is invalid.");
  const width = positiveInteger(map.width, "Tiled map width is invalid.");
  const height = positiveInteger(map.height, "Tiled map height is invalid.");
  if (
    map.type !== "map"
    || map.orientation !== "orthogonal"
    || map.infinite !== false
    || map.tilewidth !== TILE_SIZE
    || map.tileheight !== TILE_SIZE
  ) {
    throw new Error("Tiled map must be a finite orthogonal 16px map.");
  }
  validateEmbeddedTilesets(map.tilesets);
  const properties = propertyRecord(map.properties);
  const regionId = requiredString(properties, "regionId");
  const defaultSpawnId = requiredString(properties, "defaultSpawn");
  const displayName = requiredString(properties, "displayName");
  assertStableId(regionId, "Region ID");
  assertStableId(defaultSpawnId, "Default spawn ID");

  const layers = arrayFrom(map.layers, "Tiled layers are invalid.").map((layer) => (
    recordFrom(layer, "Tiled layer is invalid.")
  ));
  validateLayerNames(layers);
  const tileLayers = new Map(REQUIRED_TILE_LAYERS.map((name) => [name, requireLayer(layers, name, "tilelayer")]));
  const objectLayers = new Map(REQUIRED_OBJECT_LAYERS.map((name) => [name, requireLayer(layers, name, "objectgroup")]));
  for (const layer of tileLayers.values()) validateTileLayerData(layer, width, height);
  const collision = decodeCollision(tileLayers.get("Collision")!, width, height);
  const waterTiles = decodeTilePresence(tileLayers.get("Water")!, width, height);
  const tillableLayer = layers.find((layer) => layer.name === "Tillable");
  if (tillableLayer && (tillableLayer.type !== "tilelayer" || regionId !== "farm")) {
    throw new Error("Tillable must be a Farm tile layer.");
  }
  const tillableTiles = tillableLayer
    ? decodeTilePresence(tillableLayer, width, height)
    : Array.from({ length: width * height }, () => false);
  const placeableTiles = decodePlacementMask(layers, "Placeable", regionId, width, height);
  const buildableTiles = decodePlacementMask(layers, "Buildable", regionId, width, height);
  const spawns = decodeSpawns(objectLayers.get("SpawnPoints")!);
  const exits = decodeExits(objectLayers.get("Exits")!);
  const resources = decodeResources(objectLayers.get("ResourceSpawns")!, regionId);
  const interactions = decodeInteractions(objectLayers.get("Interactions")!, regionId);
  const npcs = decodeNpcs(objectLayers.get("NpcSpawns")!, regionId);
  const fishingZones = decodeFishingZones(optionalLayer(layers, "FishingZones"), regionId);

  return {
    id: regionId,
    mapKey,
    displayName,
    defaultSpawnId,
    isStartRegion: properties.startRegion === true,
    widthPixels: width * TILE_SIZE,
    heightPixels: height * TILE_SIZE,
    collision,
    waterTiles,
    tillableTiles,
    placeableTiles,
    buildableTiles,
    spawns,
    exits,
    resources,
    interactions,
    npcs,
    fishingZones,
  };
}

/** 从全部解析完成的区域建立校验目录；检查跨地图出口及唯一身份。 */
export function createWorldCatalog(regions: readonly RegionDefinition[]): WorldCatalog {
  return new WorldCatalog(regions);
}

/** 返回指定放置层的布尔掩码；缺失不授予放置权限，建造层仅限农场。 */
function decodePlacementMask(layers: readonly Record<string, unknown>[], name: "Placeable" | "Buildable", regionId: string, width: number, height: number): readonly boolean[] {
  const layer = layers.find((entry) => entry.name === name);
  if (!layer) return Array.from({ length: width * height }, () => false);
  if (layer.type !== "tilelayer" || (name === "Buildable" && regionId !== "farm")) throw new Error(`${name} layer is invalid.`);
  return decodeTilePresence(layer, width, height);
}

/** 检查内嵌图集元数据；当前内容准备不接受外部 TSJ 或不匹配的瓦片格式。 */
function validateEmbeddedTilesets(value: unknown): void {
  const tilesets = arrayFrom(value, "Tiled tilesets are invalid.");
  if (tilesets.length === 0) throw new Error("Tiled map requires an embedded tileset.");
  for (const rawTileset of tilesets) {
    const tileset = recordFrom(rawTileset, "Tiled tileset is invalid.");
    if ("source" in tileset) throw new Error("External Tiled tilesets are not supported.");
    if (
      typeof tileset.name !== "string"
      || tileset.tilewidth !== TILE_SIZE
      || tileset.tileheight !== TILE_SIZE
      || !Number.isInteger(tileset.firstgid)
    ) {
      throw new Error("Embedded Tiled tileset metadata is invalid.");
    }
  }
}

/** 校验固定图层集合；拒绝重复名称及未定义的行为图层。 */
function validateLayerNames(layers: readonly Record<string, unknown>[]): void {
  const required = new Set<string>([...REQUIRED_TILE_LAYERS, ...REQUIRED_OBJECT_LAYERS]);
  const allowed = new Set<string>([...required, ...OPTIONAL_OBJECT_LAYERS, ...OPTIONAL_TILE_LAYERS]);
  const actual = new Set<string>();
  for (const layer of layers) {
    if (typeof layer.name !== "string" || actual.has(layer.name)) throw new Error("Tiled layer names are invalid.");
    actual.add(layer.name);
  }
  if ([...required].some((name) => !actual.has(name)) || [...actual].some((name) => !allowed.has(name))) {
    throw new Error("Tiled map does not match the fixed layer contract.");
  }
}

/** 按名称返回可选对象层；若存在则必须具有指定的 Tiled 类型。 */
function optionalLayer(
  layers: readonly Record<string, unknown>[],
  name: typeof OPTIONAL_OBJECT_LAYERS[number],
): Record<string, unknown> | null {
  const layer = layers.find((candidate) => candidate.name === name);
  if (!layer) return null;
  if (layer.type !== "objectgroup") throw new Error(`Tiled layer ${name} has the wrong type.`);
  return layer;
}

/** 按名称与类型返回必需图层；缺失或类型错误立即报错。 */
function requireLayer(
  layers: readonly Record<string, unknown>[],
  name: string,
  type: "tilelayer" | "objectgroup",
): Record<string, unknown> {
  const layer = layers.find((candidate) => candidate.name === name);
  if (!layer || layer.type !== type) throw new Error(`Tiled layer ${name} is missing or has the wrong type.`);
  return layer;
}

/** 将碰撞层转换为有限布尔网格；尺寸和 GID 必须有效。 */
function decodeCollision(layer: Record<string, unknown>, columns: number, rows: number): CollisionGrid {
  const data = arrayFrom(layer.data, "Collision layer data is invalid.");
  return {
    columns,
    rows,
    tileWidth: TILE_SIZE,
    tileHeight: TILE_SIZE,
    blocked: data.map((entry) => {
      if (!Number.isInteger(entry) || Number(entry) < 0) throw new Error("Collision tile GID is invalid.");
      return Number(entry) !== 0;
    }),
  };
}

/** 将已校验瓦片层转换为等尺寸的非零占用掩码，不重排格子。 */
function decodeTilePresence(layer: Record<string, unknown>, columns: number, rows: number): readonly boolean[] {
  validateTileLayerData(layer, columns, rows);
  return arrayFrom(layer.data, "Tiled tile layer data is invalid.").map((entry) => Number(entry) !== 0);
}

/** 校验有限瓦片层的尺寸及非负整数 GID；无返回值。 */
function validateTileLayerData(layer: Record<string, unknown>, columns: number, rows: number): void {
  const data = arrayFrom(layer.data, "Tiled tile layer data is invalid.");
  if (layer.width !== columns || layer.height !== rows || data.length !== columns * rows) {
    throw new Error("Tiled tile layer dimensions are invalid.");
  }
  if (data.some((entry) => !Number.isInteger(entry) || Number(entry) < 0)) {
    throw new Error("Tiled tile layer GID is invalid.");
  }
}

/** 解析命名出生点；身份来自属性，Tiled 对象名称只作编辑标签。 */
function decodeSpawns(layer: Record<string, unknown>): Readonly<Record<string, WorldPoint>> {
  const result: Record<string, WorldPoint> = {};
  for (const object of objectRecords(layer)) {
    if (object.type !== "spawn") throw new Error("SpawnPoints contains a non-spawn object.");
    const properties = propertyRecord(object.properties);
    const spawnId = requiredString(properties, "spawnId");
    assertStableId(spawnId, "Spawn ID");
    if (result[spawnId]) throw new Error(`Duplicate spawn ID: ${spawnId}.`);
    result[spawnId] = pointFrom(object);
  }
  return result;
}

/** 解析地图出口及目标属性，返回固定出口定义列表。 */
function decodeExits(layer: Record<string, unknown>): readonly ExitDefinition[] {
  return objectRecords(layer).map((object) => {
    if (object.type !== "exit") throw new Error("Exits contains a non-exit object.");
    const properties = propertyRecord(object.properties);
    const id = requiredString(properties, "exitId");
    const targetRegionId = requiredString(properties, "targetRegion");
    const targetSpawnId = requiredString(properties, "targetSpawn");
    assertStableId(id, "Exit ID");
    assertStableId(targetRegionId, "Target region ID");
    assertStableId(targetSpawnId, "Target spawn ID");
    return { id, targetRegionId, targetSpawnId, ...rectFrom(object) };
  });
}

/** 解析具有全局稳定 ID 的资源出生点，返回定义且不创建玩法状态。 */
function decodeResources(layer: Record<string, unknown>, regionId: string): readonly ResourceSpawnDefinition[] {
  return objectRecords(layer).map((object) => {
    if (object.type !== "resource") throw new Error("ResourceSpawns contains a non-resource object.");
    const properties = propertyRecord(object.properties);
    const entityId = requiredString(properties, "entityId");
    const kind = requiredString(properties, "resourceKind");
    assertStableId(entityId, "Resource entity ID");
    if (!["tree", "stone", "weed", "wild-horseradish", "daffodil", "leek", "dandelion", "fallen-branch"].includes(kind)) {
      throw new Error("Resource kind is invalid.");
    }
    return { entityId, regionId, kind: kind as ResourceSpawnDefinition["kind"], ...pointFrom(object) };
  });
}

/** 解析可选钓鱼区域矩形，返回固定水域定义而不执行钓鱼规则。 */
function decodeFishingZones(
  layer: Record<string, unknown> | null,
  regionId: string,
): readonly FishingZoneDefinition[] {
  if (!layer) return [];
  if (regionId !== "lakeshore") throw new Error("Fishing zones must belong to Lakeshore.");
  const seen = new Set<string>();
  return objectRecords(layer).map((object) => {
    if (object.type !== "fishing-zone") throw new Error("FishingZones contains an invalid object.");
    const id = requiredString(propertyRecord(object.properties), "fishingZoneId");
    assertStableId(id, "Behavior zone ID");
    if (seen.has(id)) throw new Error(`Duplicate behavior zone ID: ${id}.`);
    seen.add(id);
    return { id, regionId, ...rectFrom(object) };
  });
}

/** 解析互动矩形并校验查看对话元数据；返回内容定义，不执行互动。 */
function decodeInteractions(layer: Record<string, unknown>, regionId: string): readonly InteractionDefinition[] {
  return objectRecords(layer).map((object) => {
    if (object.type !== "interaction") throw new Error("Interactions contains a non-interaction object.");
    const properties = propertyRecord(object.properties);
    const entityId = requiredString(properties, "entityId");
    const kind = requiredString(properties, "interactionKind");
    assertStableId(entityId, "Interaction entity ID");
    if (kind === "inspect") {
      const dialogueId = requiredString(properties, "dialogueId");
      assertStableId(dialogueId, "Dialogue ID");
      return { entityId, regionId, kind, dialogueId, ...rectFrom(object) };
    }
    if (kind !== "farm-plot" && kind !== "door" && kind !== "bed" && kind !== "backpack-display" && kind !== "building-service") {
      throw new Error("Interaction kind is invalid.");
    }
    return { entityId, regionId, kind, ...rectFrom(object) };
  });
}

/** 解析居民出生点元数据；不构造对话、日程或运行状态。 */
function decodeNpcs(layer: Record<string, unknown>, regionId: string): readonly NpcSpawnDefinition[] {
  return objectRecords(layer).map((object) => {
    if (object.type !== "npc") throw new Error("NpcSpawns contains a non-npc object.");
    const properties = propertyRecord(object.properties);
    const entityId = requiredString(properties, "entityId");
    const npcId = requiredString(properties, "npcId");
    const dialogueId = requiredString(properties, "dialogueId");
    const interactionType = requiredString(properties, "interactionType");
    assertStableId(entityId, "NPC entity ID");
    assertStableId(npcId, "NPC ID");
    assertStableId(dialogueId, "Dialogue ID");
    if (interactionType !== "shop" && interactionType !== "dialogue") {
      throw new Error("NPC interaction type is invalid.");
    }
    return { entityId, regionId, npcId, dialogueId, interactionType, ...pointFrom(object) };
  });
}

/** 从已校验对象层返回对象记录；无效对象数组立即报错。 */
function objectRecords(layer: Record<string, unknown>): readonly Record<string, unknown>[] {
  return arrayFrom(layer.objects, "Tiled object list is invalid.").map((object) => (
    recordFrom(object, "Tiled object is invalid.")
  ));
}

/** 将 Tiled 自定义属性转为键值记录；不接受重复属性名。 */
function propertyRecord(value: unknown): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const rawProperty of arrayFrom(value ?? [], "Tiled properties are invalid.")) {
    const property = recordFrom(rawProperty, "Tiled property is invalid.");
    if (typeof property.name !== "string" || property.name in result) {
      throw new Error("Tiled property names are invalid.");
    }
    result[property.name] = property.value;
  }
  return result;
}

/** 按名称返回必需的非空字符串属性；不做类型强制转换。 */
function requiredString(properties: Record<string, unknown>, name: string): string {
  const value = properties[name];
  if (typeof value !== "string" || value.trim() === "") throw new Error(`Tiled property ${name} is invalid.`);
  return value;
}

/** 从 Tiled 点对象解析有限坐标；返回点定义。 */
function pointFrom(object: Record<string, unknown>): WorldPoint {
  return {
    x: finiteNumber(object.x, "Tiled object X is invalid."),
    y: finiteNumber(object.y, "Tiled object Y is invalid."),
  };
}

/** 解析出口或互动使用的正尺寸矩形；无效坐标或尺寸立即报错。 */
function rectFrom(object: Record<string, unknown>): { x: number; y: number; width: number; height: number } {
  const point = pointFrom(object);
  const width = finiteNumber(object.width, "Tiled object width is invalid.");
  const height = finiteNumber(object.height, "Tiled object height is invalid.");
  if (width <= 0 || height <= 0) throw new Error("Tiled object rectangle must be positive.");
  return { ...point, width, height };
}

/** 把输入收窄为普通对象；拒绝空值及数组，返回字段记录。 */
function recordFrom(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

/** 把输入收窄为数组；不接受类数组对象或替代值。 */
function arrayFrom(value: unknown, message: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(message);
  return value;
}

/** 校验并返回正整数尺寸；无效值立即报错。 */
function positiveInteger(value: unknown, message: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) throw new Error(message);
  return Number(value);
}

/** 校验并返回有限数字坐标；拒绝无穷及非数字值。 */
function finiteNumber(value: unknown, message: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(message);
  return value;
}
