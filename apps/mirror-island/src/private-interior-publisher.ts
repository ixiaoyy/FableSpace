import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { TiledParser } from "@canvasengine/tiled";
import type { RpgServerTransport } from "@rpgjs/server/node";
import { privateInteriorMapId } from "./world/house-contract.ts";

type MapPublisherTransport = Pick<RpgServerTransport, "updateMap">;

interface PrivateInteriorTemplate {
  readonly width: number;
  readonly height: number;
  readonly data: string;
  readonly parsedMap: Record<string, unknown>;
  readonly hitboxes: readonly Record<string, number | string>[];
}

/** Creates an idempotent dynamic-room publisher backed by the reviewed fixed TMX template. */
export function createPrivateInteriorPublisher(
  transport: MapPublisherTransport,
  tiledDirectory: string,
): (houseId: string) => Promise<void> {
  const published = new Set<string>();
  const pending = new Map<string, Promise<void>>();
  const template = loadPrivateInteriorTemplate(tiledDirectory);

  return async (houseId: string): Promise<void> => {
    const mapId = privateInteriorMapId(houseId);
    if (published.has(mapId)) return;
    const existing = pending.get(mapId);
    if (existing) return existing;

    const publication = publishPrivateInteriorMap(transport, template, mapId)
      .then(() => {
        published.add(mapId);
      })
      .finally(() => {
        pending.delete(mapId);
      });
    pending.set(mapId, publication);
    return publication;
  };
}

/** Publishes one cloned room payload and rejects any non-success transport response. */
async function publishPrivateInteriorMap(
  transport: MapPublisherTransport,
  templatePromise: Promise<PrivateInteriorTemplate>,
  mapId: string,
): Promise<void> {
  const template = await templatePromise;
  const response = await transport.updateMap(mapId, {
    id: mapId,
    width: template.width,
    height: template.height,
    data: template.data,
    parsedMap: template.parsedMap,
    hitboxes: template.hitboxes,
    events: [],
  });
  if (!response.ok) {
    throw new Error(`Private interior publication failed with HTTP ${response.status}.`);
  }
}

/** Parses the fixed TMX and inlines its reviewed external TSX definitions for RPGJS streaming. */
async function loadPrivateInteriorTemplate(tiledDirectory: string): Promise<PrivateInteriorTemplate> {
  const mapPath = join(tiledDirectory, "house-interior.tmx");
  const data = await readFile(mapPath, "utf8");
  const parsedMap = new TiledParser(data).parseMap() as Record<string, any>;
  const tilesets = Array.isArray(parsedMap.tilesets) ? parsedMap.tilesets : [];
  parsedMap.tilesets = await Promise.all(tilesets.map(async (tileset: Record<string, any>) => {
    if (typeof tileset.source !== "string" || !tileset.source) return tileset;
    const tilesetData = await readFile(join(tiledDirectory, tileset.source), "utf8");
    return {
      ...tileset,
      ...(new TiledParser(tilesetData).parseTileset() as unknown as Record<string, unknown>),
    };
  }));

  const tileWidth = Number(parsedMap.tilewidth);
  const tileHeight = Number(parsedMap.tileheight);
  const width = Number(parsedMap.width) * tileWidth;
  const height = Number(parsedMap.height) * tileHeight;
  if (![tileWidth, tileHeight, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new Error("Private interior template dimensions are invalid.");
  }

  return {
    width,
    height,
    data,
    parsedMap,
    hitboxes: createInteriorBoundaryHitboxes(width, height, tileWidth, tileHeight),
  };
}

/** Builds four immutable boundary hitboxes while leaving all interior floor tiles walkable. */
function createInteriorBoundaryHitboxes(
  width: number,
  height: number,
  tileWidth: number,
  tileHeight: number,
): readonly Record<string, number | string>[] {
  return [
    { id: "interior-wall-top", x: 0, y: 0, width, height: tileHeight },
    { id: "interior-wall-bottom", x: 0, y: height - tileHeight, width, height: tileHeight },
    { id: "interior-wall-left", x: 0, y: tileHeight, width: tileWidth, height: height - (tileHeight * 2) },
    { id: "interior-wall-right", x: width - tileWidth, y: tileHeight, width: tileWidth, height: height - (tileHeight * 2) },
  ];
}
