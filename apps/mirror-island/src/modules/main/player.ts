import { Direction } from "@rpgjs/common";
import type { MapClass } from "@canvasengine/tiled";
import type { RpgMap, RpgMapChangeTarget, RpgPlayer, RpgPlayerHooks } from "@rpgjs/server";
import {
  houseIdFromPrivateInteriorMapId,
} from "../../world/house-contract.ts";
import {
  SAFE_SPAWN_CANDIDATES,
  cardinalNeighbors,
  chooseFacingNpcPlacement,
  chooseSafeSpawn,
  isTerrainWalkable,
  tileKey,
  type TilePoint,
} from "../../world/terrain-contract.ts";
import { WelcomeNpc } from "./event.ts";
import {
  authorizePrivateInterior,
  ensurePrivateInteriorExit,
  renderHouseExteriors,
} from "./house.ts";
import {
  OUTDOOR_MAP_ID,
  WELCOME_NPC_EVENT_ID,
  playerTile,
  runtimeMapId,
  tileToPixel,
  welcomeNpcRuntimeId,
} from "./onboarding-contract.ts";

type PersistentTiledMap = RpgMap & { tiled: MapClass };

/** Loads the server-only persistence owners without making Prisma reachable from the browser graph. */
async function loadPersistence() {
  if (import.meta.env?.SSR !== true) {
    throw new Error("Mirror Island persistence is available only on the game server.");
  }
  const [client, profile, world, houses] = await Promise.all([
    import("../../persistence/client.ts"),
    import("../../persistence/player-profile.ts"),
    import("../../persistence/world.ts"),
    import("../../persistence/house.ts"),
  ]);
  return { ...client, ...profile, ...world, ...houses };
}

/** Creates a cryptographically unbiased server-side picker for bounded candidate arrays. */
async function secureIndexPicker(): Promise<(length: number) => number> {
  const { randomInt } = await import("node:crypto");
  return (length: number) => randomInt(length);
}

/** Returns unique safe-spawn candidates plus their cardinal neighbors for one bounded blocker query. */
function spawnEvaluationTiles(): readonly TilePoint[] {
  const unique = new Map<string, TilePoint>();
  for (const candidate of SAFE_SPAWN_CANDIDATES) {
    for (const tile of [candidate, ...cardinalNeighbors(candidate)]) unique.set(tileKey(tile), tile);
  }
  return [...unique.values()];
}

/** Selects a new-player spawn that also leaves at least one durable safe adjacent NPC tile. */
async function selectFirstSpawn(player: RpgPlayer): Promise<TilePoint> {
  const persistence = await loadPersistence();
  const blockers = await persistence.loadWorldTileBlockers(
    persistence.getMirrorIslandPrismaClient(),
    spawnEvaluationTiles(),
  );
  const unavailable = new Set(blockers.blockedTileKeys);
  for (const candidate of SAFE_SPAWN_CANDIDATES) {
    const hasNpcTile = cardinalNeighbors(candidate).some(
      (neighbor) => isTerrainWalkable(neighbor) && !blockers.blockedTileKeys.has(tileKey(neighbor)),
    );
    if (!hasNpcTile) unavailable.add(tileKey(candidate));
  }
  return chooseSafeSpawn(unavailable, await secureIndexPicker());
}

/** Restores persisted world visuals and durable house events for the loaded outdoor sample region. */
async function restoreOutdoorWorld(player: RpgPlayer, map: PersistentTiledMap): Promise<void> {
  const persistence = await loadPersistence();
  const { loadWorldChunkCells } = await import("../../persistence/world-state.ts");
  const client = persistence.getMirrorIslandPrismaClient();
  const [cells, houses] = await Promise.all([
    loadWorldChunkCells(client, 0, 0),
    persistence.listHousesForLoadedRegion(client, { minX: 0, minY: 0, maxX: 31, maxY: 31 }),
  ]);
  for (const cell of cells) {
    if (cell.state === "tilled") map.tiled.setTile(cell.tileX, cell.tileY, "Dynamic", { gid: 178 });
  }
  await renderHouseExteriors(map, houses);
}

/** Spawns the unfinished player's facing scenario NPC once, isolated from every other player. */
async function ensureWelcomeNpc(player: RpgPlayer, map: RpgMap): Promise<void> {
  const persistence = await loadPersistence();
  const client = persistence.getMirrorIslandPrismaClient();
  if (await persistence.findHouseByOwner(client, player.id)) return;
  if (map.getEvent(welcomeNpcRuntimeId(player.id))) return;

  const origin = playerTile(player);
  const neighbors = cardinalNeighbors(origin).filter(isTerrainWalkable);
  const blockers = neighbors.length > 0
    ? await persistence.loadWorldTileBlockers(client, neighbors)
    : { blockedTileKeys: new Set<string>() };
  const runtimeOccupied = new Set(
    map.getPlayers()
      .filter((other) => other.id !== player.id)
      .map((other) => tileKey(playerTile(other))),
  );

  try {
    const placement = chooseFacingNpcPlacement(
      origin,
      (tile) => !blockers.blockedTileKeys.has(tileKey(tile)) && !runtimeOccupied.has(tileKey(tile)),
      await secureIndexPicker(),
    );
    player.changeDirection(placement.playerFacing as Direction);
    await map.createDynamicEvent({
      id: WELCOME_NPC_EVENT_ID,
      ...tileToPixel(placement.npc),
      hitbox: { width: 16, height: 16 },
      event: WelcomeNpc(placement.npcFacing as Direction),
    }, { mode: "scenario", scenarioOwnerId: player.id });
  } catch {
    await player.showNotification("迎宾员暂时过不来；离开这块拥挤区域后重新进入即可继续。", { type: "warn" });
  }
}

/** Sends an unauthorized private-room connection back to the reviewed outdoor fallback. */
async function leaveUnauthorizedInterior(player: RpgPlayer): Promise<void> {
  await player.showText("这是其他岛民的私人住宅。");
  await player.changeMap(OUTDOOR_MAP_ID, tileToPixel({ x: 12, y: 15 }));
}

export const player: RpgPlayerHooks = {
  async onConnected(player: RpgPlayer) {
    const persistence = await loadPersistence();
    const prisma = persistence.getMirrorIslandPrismaClient();
    await persistence.ensureMirrorIslandWorld(prisma);
    const profile = await persistence.ensurePlayerProfile(prisma, player.id);
    const loaded = await player.load(0, { reason: "load", source: "connect" });
    if (loaded.ok) return;

    player.name = profile.playerName;
    player.setGraphic("hero");
    const spawn = await selectFirstSpawn(player);
    await player.changeMap(OUTDOOR_MAP_ID, tileToPixel(spawn));
    await player.save(0, { label: "镜像岛自动存档" }, { reason: "auto", source: "first-connect" });
  },

  async onJoinMap(player: RpgPlayer, map: RpgMap) {
    if (import.meta.env?.SSR !== true) return;
    const mapId = runtimeMapId(map);
    const interiorHouseId = houseIdFromPrivateInteriorMapId(mapId);
    if (interiorHouseId) {
      const house = await authorizePrivateInterior(player, mapId);
      if (!house) {
        await leaveUnauthorizedInterior(player);
        return;
      }
      await ensurePrivateInteriorExit(map, house);
      return;
    }
    if (mapId !== OUTDOOR_MAP_ID) return;

    await restoreOutdoorWorld(player, map as PersistentTiledMap);
    await ensureWelcomeNpc(player, map);
    await player.save(0, { label: "镜像岛自动存档" }, { reason: "auto", source: "join-map" });
  },

  async onDisconnected(player: RpgPlayer) {
    if (runtimeMapId(player.getCurrentMap()) !== OUTDOOR_MAP_ID) return;
    await player.save(0, { label: "镜像岛自动存档" }, { reason: "auto", source: "disconnect" });
  },

  async canChangeMap(player: RpgPlayer, nextMap: RpgMapChangeTarget) {
    const houseId = houseIdFromPrivateInteriorMapId(nextMap.id);
    if (!houseId) return true;
    const house = await authorizePrivateInterior(player, nextMap.id);
    return house?.id === houseId;
  },

  onInput(player: RpgPlayer, { action }) {
    if (action === "escape") player.callMainMenu();
  },
};
