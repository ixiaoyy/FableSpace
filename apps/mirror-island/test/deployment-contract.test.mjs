import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = dirname(dirname(projectRoot));

/** Reads one UTF-8 deployment contract relative to the repository root. */
function readRepositoryFile(...parts) {
  return readFile(join(repositoryRoot, ...parts), "utf8");
}

test("production topology keeps Mirror Island isolated and resource bounded", async () => {
  const compose = await readRepositoryFile("deploy", "docker-compose.mirror-island.yml");
  assert.match(compose, /mirror-identity-db:/);
  assert.match(compose, /mirror_identity_db:\/var\/lib\/postgresql\/data/);
  assert.match(compose, /keycloak:[\s\S]*?mem_limit: 768m/);
  assert.match(compose, /mirror-game:[\s\S]*?mem_limit: 384m/);
  assert.doesNotMatch(compose, /ports:[\s\S]*?3001/);
});

test("frontend routes the preview, identity, and WebSocket without replacing root", async () => {
  const nginx = await readRepositoryFile("apps", "web", "nginx.conf");
  assert.match(nginx, /location = \/mirror-island/);
  assert.match(nginx, /location \/identity\//);
  assert.match(nginx, /location \/parties\//);
  assert.match(nginx, /proxy_set_header Upgrade \$http_upgrade/);
  assert.match(nginx, /location = \/ \{/);
});

test("deployment backs up identity data and never transports bearer tokens in query", async () => {
  const workflow = await readRepositoryFile(".github", "workflows", "deploy.yml");
  const client = await readFile(join(projectRoot, "src", "client.ts"), "utf8");
  assert.match(workflow, /pg_dump/);
  assert.match(workflow, /keycloak-\$\{EXPECTED_SHA\}\.sql/);
  assert.match(workflow, /configure-keycloak-profile\.mjs/);
  assert.doesNotMatch(client, /query:\s*\(\)\s*=>\s*\(\{\s*token/);
  assert.match(client, /protocols:\s*\(\)\s*=>\s*\["mirror-island", `bearer\.\$\{keycloak\.token\}`\]/);
});
