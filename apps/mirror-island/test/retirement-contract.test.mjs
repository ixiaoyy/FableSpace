import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = dirname(dirname(projectRoot));

test("legacy retirement is dry-run by default and protects Mirror Island data", async () => {
  const source = await readFile(
    join(repositoryRoot, "deploy", "server", "retire_legacy_fablespace.py"),
    "utf8",
  );
  assert.match(source, /LEGACY_DATABASE = "fablespace"/);
  assert.match(source, /PRESERVED_BACKUP_DIRECTORIES = \{"mirror-island-keycloak", "mirror-island-game"\}/);
  assert.match(source, /parser\.add_argument\("--apply", action="store_true"\)/);
  assert.match(source, /if not args\.apply:\s+return/);
  assert.match(source, /sql = f"DROP DATABASE IF EXISTS \{LEGACY_DATABASE\};"/);
  assert.doesNotMatch(source, /DROP DATABASE IF EXISTS `fablespace`/);
  assert.doesNotMatch(source, /rm -rf|docker system prune|DROP USER|DROP DATABASE IF EXISTS `mirror_island/);
});

test("object retirement deletes only fablespace prefix and asserts game prefix stability", async () => {
  const workflow = await readFile(
    join(repositoryRoot, ".github", "workflows", "deploy.yml"),
    "utf8",
  );
  assert.match(workflow, /s3:\/\/\$\{CDN_S3_BUCKET\}\/fablespace\//);
  assert.match(workflow, /prefix_key_count\(\)/);
  assert.match(workflow, /game_before="\$\(prefix_key_count game\/\)"/);
  assert.match(workflow, /legacy_before="\$\(prefix_key_count fablespace\/\)"/);
  assert.match(workflow, /None\|null\|""\) printf '0\\n'/);
  assert.match(workflow, /test "\$\{game_after\}" = "\$\{game_before\}"/);
  assert.doesNotMatch(workflow, /s3:\/\/\$\{CDN_S3_BUCKET\}\/game\/.*--recursive/);
});
