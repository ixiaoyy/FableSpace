import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mediaBaseUrl = "https://img.pingxingxian.space/game/media/v1/assets/vendor/ninja-adventure/2024-04-19";
const assets = [
  {
    name: "male player",
    url: `${mediaBaseUrl}/player.png`,
    output: "public/spritesheets/hero.png",
    bytes: 6139,
    sha256: "f2dd61a264c251b81e63da7a28ab0fdccd261b807e5fa7d1832a468e14a21078",
  },
  {
    name: "female player",
    url: `${mediaBaseUrl}/player-female.png`,
    output: "public/spritesheets/female.png",
    bytes: 4784,
    sha256: "552e1af74a8d565408519ced8c5bb309d291a9d3002e4e37c881d2181f413e96",
  },
  {
    name: "floor tileset",
    url: `${mediaBaseUrl}/floor.png`,
    output: "src/tiled/floor.png",
    bytes: 29615,
    sha256: "e111065065edf806e7e893330086e68efc8755175d92f14d087b42d40a331e16",
  },
];

/** Returns the lowercase SHA-256 digest for one downloaded byte buffer. */
function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

/** Downloads one immutable asset, verifies its contract, and writes it only after validation. */
async function downloadVerifiedAsset(asset) {
  const response = await fetch(asset.url);
  if (!response.ok) {
    throw new Error(`${asset.name} download failed with HTTP ${response.status}.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength !== asset.bytes) {
    throw new Error(`${asset.name} byte length mismatch: expected ${asset.bytes}, received ${buffer.byteLength}.`);
  }
  const digest = sha256(buffer);
  if (digest !== asset.sha256) {
    throw new Error(`${asset.name} SHA-256 mismatch: expected ${asset.sha256}, received ${digest}.`);
  }

  const outputPath = join(root, asset.output);
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}

await Promise.all(assets.map(downloadVerifiedAsset));
console.log(`Prepared ${assets.length} verified Mirror Island media assets.`);
