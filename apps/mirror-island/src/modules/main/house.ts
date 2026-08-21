import type { EventDefinition, RpgMap, RpgPlayer } from "@rpgjs/server";
import {
  HOUSE_DOOR_OFFSET_X,
  HOUSE_DOOR_OFFSET_Y,
  HOUSE_EXTERIOR_VARIANT,
  HOUSE_HEIGHT_TILES,
  HOUSE_WIDTH_TILES,
  doorAnchorFromPlayer,
  houseIdFromPrivateInteriorMapId,
  housePlacementFromDoor,
  houseTileGraphicId,
  privateInteriorMapId,
  validateHousePlacement,
  type HousePlacement,
  type HousePlacementError,
} from "../../world/house-contract.ts";
import {
  MIRROR_TILE_SIZE,
  tileKey,
  type CardinalFacing,
  type TilePoint,
} from "../../world/terrain-contract.ts";
import { ensurePrivateInteriorPublished } from "../../private-interior-runtime.ts";
import {
  HOUSE_STAKE_ID,
  OUTDOOR_MAP_ID,
  playerTile,
  runtimeMapId,
  tileToPixel,
  welcomeNpcRuntimeId,
} from "./onboarding-contract.ts";

export interface DurableHouse {
  readonly id: string;
  readonly ownerAccountId: string;
  readonly originX: number;
  readonly originY: number;
  readonly width: number;
  readonly height: number;
  readonly exteriorVariant: string;
}

const HOUSE_DOOR_TILE_INDEX = (HOUSE_DOOR_OFFSET_Y * HOUSE_WIDTH_TILES) + HOUSE_DOOR_OFFSET_X;
const PRIVATE_INTERIOR_ENTRY_TILE = { x: 4, y: 5 } as const;
const PRIVATE_INTERIOR_EXIT_TILE = { x: 4, y: 6 } as const;
const placementInProgress = new Set<string>();

/** Renders one durable house as shared synchronized 16px events and installs its owner-aware door. */
export async function renderHouseExterior(map: RpgMap, house: DurableHouse): Promise<void> {
  validateDurableHouse(house);
  const tasks: Promise<string | undefined>[] = [];
  for (let index = 0; index < HOUSE_WIDTH_TILES * HOUSE_HEIGHT_TILES; index += 1) {
    const eventId = houseExteriorEventId(house.id, index);
    if (map.getEvent(eventId)) continue;
    const tile = {
      x: house.originX + (index % HOUSE_WIDTH_TILES),
      y: house.originY + Math.floor(index / HOUSE_WIDTH_TILES),
    };
    const event = index === HOUSE_DOOR_TILE_INDEX
      ? createHouseDoorEvent(house)
      : createHouseTileEvent(index);
    tasks.push(map.createDynamicEvent({
      id: eventId,
      ...tileToPixel(tile),
      hitbox: { width: MIRROR_TILE_SIZE, height: MIRROR_TILE_SIZE },
      event,
    }));
  }
  await Promise.all(tasks);
}

/** Renders every loaded durable house without duplicating already-present shared events. */
export async function renderHouseExteriors(map: RpgMap, houses: readonly DurableHouse[]): Promise<void> {
  for (const house of houses) await renderHouseExterior(map, house);
}

/** Runs the owner-only stake preview, confirmation, transactional build, and onboarding completion flow. */
export async function beginHouseStakePlacement(player: RpgPlayer): Promise<void> {
  if (placementInProgress.has(player.id)) {
    await player.showText("选址预览已经打开了，请先完成当前选择。");
    return;
  }
  placementInProgress.add(player.id);
  let previewIds: string[] = [];
  let committed = false;

  try {
    if (import.meta.env?.SSR !== true) throw new Error("House placement is server-only.");
    const map = player.getCurrentMap();
    if (!map || runtimeMapId(map) !== OUTDOOR_MAP_ID) {
      await player.showText("选址木桩只能在镜像岛室外使用。");
      return;
    }

    const [{ getMirrorIslandPrismaClient }, persistence] = await Promise.all([
      import("../../persistence/client.ts"),
      import("../../persistence/house.ts"),
    ]);
    const client = getMirrorIslandPrismaClient();
    const existing = await persistence.findHouseByOwner(client, player.id);
    if (existing) {
      await discardStaleHouseStake(player);
      await player.showText("你的房子已经盖好了，不需要再放选址木桩。");
      return;
    }

    const anchor = doorAnchorFromPlayer(
      playerTile(player),
      player.getDirection() as CardinalFacing,
    );
    if (typeof anchor === "string") {
      await player.showText(placementErrorMessage(anchor));
      return;
    }

    const placement = housePlacementFromDoor(anchor);
    const blockers = await persistence.loadHousePlacementBlockers(client, placement);
    const occupiedTileKeys = new Set(blockers.occupiedTileKeys);
    for (const other of map.getPlayers()) {
      if (other.id !== player.id) occupiedTileKeys.add(tileKey(playerTile(other)));
    }
    const placementError = validateHousePlacement(
      placement,
      blockers.dynamicCellKeys,
      occupiedTileKeys,
    );
    if (placementError) {
      await player.showText(placementErrorMessage(placementError));
      return;
    }

    previewIds = await createHousePreview(map, player, placement);
    const choice = await player.showChoices(
      "这里会建成一座朝南的 4×6 小屋，房门就在你面前。确定让迎宾员开工吗？",
      [
        { text: "就在这里盖", value: "build" },
        { text: "我再看看", value: "cancel" },
      ],
    );
    removePreviewEvents(map, previewIds);
    previewIds = [];
    if (choice?.value !== "build") {
      await player.showText("没问题，木桩还在，找到喜欢的位置再用它。");
      return;
    }

    const house = await persistence.createHouseWithOccupancy(client, player.id, placement);
    committed = true;
    if (player.hasItem(HOUSE_STAKE_ID)) player.removeItem(HOUSE_STAKE_ID, 1);
    await renderHouseExterior(map, house);
    await player.save(0, { label: "镜像岛自动存档" }, { reason: "manual", source: "house-built" });
    await player.showText("叮叮当当——房子盖好啦！欢迎在镜像岛安家，点击房门就能进入你的私人小屋。");
    map.removeEvent(welcomeNpcRuntimeId(player.id));
  } catch (error) {
    await handlePlacementFailure(player, error, committed);
  } finally {
    const map = player.getCurrentMap();
    if (map) removePreviewEvents(map, previewIds);
    placementInProgress.delete(player.id);
  }
}

/** Rechecks a dynamic private room against the durable owner and returns the authorized house. */
export async function authorizePrivateInterior(
  player: RpgPlayer,
  rawMapId: string,
): Promise<DurableHouse | null> {
  const houseId = houseIdFromPrivateInteriorMapId(rawMapId);
  if (!houseId || import.meta.env?.SSR !== true) return null;
  const [{ getMirrorIslandPrismaClient }, { findHouseById }] = await Promise.all([
    import("../../persistence/client.ts"),
    import("../../persistence/house.ts"),
  ]);
  const house = await findHouseById(getMirrorIslandPrismaClient(), houseId);
  return house?.ownerAccountId === player.id ? house : null;
}

/** Installs the fixed owner-only exit event after an authorized player joins a private room. */
export async function ensurePrivateInteriorExit(map: RpgMap, house: DurableHouse): Promise<void> {
  const eventId = `house-interior-exit:${house.id}`;
  if (map.getEvent(eventId)) return;
  await map.createDynamicEvent({
    id: eventId,
    ...tileToPixel(PRIVATE_INTERIOR_EXIT_TILE),
    hitbox: { width: MIRROR_TILE_SIZE, height: MIRROR_TILE_SIZE },
    event: createPrivateInteriorExitEvent(house.id),
  });
}

/** Returns the fixed private-room entry pixel used after the exterior save succeeds. */
export function privateInteriorEntryPosition(): { x: number; y: number } {
  return tileToPixel(PRIVATE_INTERIOR_ENTRY_TILE);
}

/** Creates one immovable exterior tile event from the reviewed Ninja Adventure frame. */
function createHouseTileEvent(index: number): EventDefinition {
  return {
    onInit() {
      this.setGraphic(houseTileGraphicId(index));
      this.setMass(Number.POSITIVE_INFINITY);
    },
  };
}

/** Creates the visible door tile that authorizes its owner before publishing and entering a private room. */
function createHouseDoorEvent(house: DurableHouse): EventDefinition {
  return {
    onInit() {
      this.setGraphic(houseTileGraphicId(HOUSE_DOOR_TILE_INDEX));
      this.setMass(Number.POSITIVE_INFINITY);
    },
    async onAction(player: RpgPlayer) {
      if (player.id !== house.ownerAccountId) {
        await player.showText("这是其他岛民的私人住宅。");
        return;
      }
      try {
        await ensurePrivateInteriorPublished(house.id);
        await player.save(0, { label: "镜像岛自动存档" }, { reason: "manual", source: "house-door" });
        await player.changeMap(privateInteriorMapId(house.id), privateInteriorEntryPosition());
      } catch {
        await player.showText("房子已经建好，但室内暂时打不开，请稍后再试。");
      }
    },
  };
}

/** Creates the interior exit event with a second durable owner check before returning outdoors. */
function createPrivateInteriorExitEvent(houseId: string): EventDefinition {
  return {
    onInit() {
      this.setGraphic(houseTileGraphicId(HOUSE_DOOR_TILE_INDEX));
      this.setMass(Number.POSITIVE_INFINITY);
    },
    async onAction(player: RpgPlayer) {
      const house = await authorizePrivateInterior(player, privateInteriorMapId(houseId));
      if (!house) {
        await player.showText("这个出口不属于当前住宅。");
        return;
      }
      const returnTile = {
        x: house.originX + HOUSE_DOOR_OFFSET_X,
        y: house.originY + HOUSE_HEIGHT_TILES,
      };
      await player.changeMap(OUTDOOR_MAP_ID, tileToPixel(returnTile));
    },
  };
}

/** Creates the owner-only 24-tile house preview and returns the exact runtime IDs for cleanup. */
async function createHousePreview(
  map: RpgMap,
  player: RpgPlayer,
  placement: HousePlacement,
): Promise<string[]> {
  const ids: string[] = [];
  for (let index = 0; index < placement.footprint.length; index += 1) {
    const id = await map.createDynamicEvent({
      id: `house-preview-${index}`,
      ...tileToPixel(placement.footprint[index]),
      hitbox: { width: 1, height: 1 },
      event: createHouseTileEvent(index),
    }, { mode: "scenario", scenarioOwnerId: player.id });
    if (id) ids.push(id);
  }
  return ids;
}

/** Removes every preview event that was actually created, tolerating map-transfer cleanup races. */
function removePreviewEvents(map: RpgMap, eventIds: readonly string[]): void {
  for (const eventId of eventIds) map.removeEvent(eventId);
}

/** Drops a stake restored from an obsolete save after the player's durable house is found. */
async function discardStaleHouseStake(player: RpgPlayer): Promise<void> {
  if (!player.hasItem(HOUSE_STAKE_ID)) return;
  player.removeItem(HOUSE_STAKE_ID, 1);
  await player.save(0, { label: "镜像岛自动存档" }, { reason: "manual", source: "house-already-owned" });
}

/** Maps placement validation codes to concise player-facing recovery guidance. */
function placementErrorMessage(error: HousePlacementError): string {
  const messages: Record<HousePlacementError, string> = {
    "face-north": "请站在预期房门的南侧，面向北方再使用木桩。",
    "outside-loaded-map": "这里离岛屿边缘太近，整座房子放不下。",
    "terrain-blocked": "这里有河水、桥道或不可建地形，请换一块空地。",
    "dynamic-cell-blocked": "这片地已经种植或整理过了，请换一块空地。",
    occupied: "这里已经有房屋或其他岛民，请换一个位置。",
  };
  return messages[error];
}

/** Handles pre-commit rejection separately from a post-commit rendering or save fault. */
async function handlePlacementFailure(
  player: RpgPlayer,
  error: unknown,
  committed: boolean,
): Promise<void> {
  if (committed) {
    if (player.hasItem(HOUSE_STAKE_ID)) player.removeItem(HOUSE_STAKE_ID, 1);
    player.getCurrentMap()?.removeEvent(welcomeNpcRuntimeId(player.id));
    await player.showText("房屋已经落库建成；当前画面恢复失败，重新进入镜像岛后会自动显示。");
    return;
  }
  const reason = error && typeof error === "object" && "reason" in error
    ? String((error as { reason: unknown }).reason)
    : "";
  const messages: Record<string, string> = {
    "already-owned": "你的房子已经盖好了，不能再建第二座。",
    "dynamic-cell-blocked": "确认期间这片地发生了变化，木桩仍在，请重新选址。",
    occupied: "确认期间位置被占用了，木桩仍在，请换一个位置。",
    "concurrent-change": "另一位岛民刚好同时选了这里，木桩仍在，请换一个位置。",
  };
  await player.showText(messages[reason] ?? "这次没有建成，木桩仍在，请稍后重试。");
}

/** Returns the stable shared runtime event ID for one exterior tile. */
function houseExteriorEventId(houseId: string, index: number): string {
  return `house:${houseId}:tile:${index}`;
}

/** Rejects corrupt or unknown durable house geometry before it reaches synchronized gameplay. */
function validateDurableHouse(house: DurableHouse): void {
  if (
    house.width !== HOUSE_WIDTH_TILES
    || house.height !== HOUSE_HEIGHT_TILES
    || house.exteriorVariant !== HOUSE_EXTERIOR_VARIANT
    || !Number.isInteger(house.originX)
    || !Number.isInteger(house.originY)
  ) {
    throw new Error("Durable house geometry is invalid.");
  }
}
