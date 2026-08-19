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
  assert.match(compose, /mirror-game-db:/);
  assert.match(compose, /mirror_game_db:\/var\/lib\/postgresql\/data/);
  assert.match(compose, /keycloak:[\s\S]*?mem_limit: 768m/);
  assert.match(compose, /mirror-game-db:[\s\S]*?mem_limit: 384m/);
  assert.match(compose, /mirror-game:[\s\S]*?mem_limit: 384m/);
  assert.doesNotMatch(compose, /ports:[\s\S]*?3001/);
});

test("frontend serves Mirror Island at root and routes identity, forum SSO, and WebSocket", async () => {
  const nginx = await readRepositoryFile("apps", "mirror-island", "nginx.conf");
  assert.match(nginx, /absolute_redirect off/);
  assert.match(nginx, /location = \/mirror-island/);
  assert.match(nginx, /return 308 \/;/);
  assert.match(nginx, /location \/identity\//);
  assert.match(nginx, /location \/parties\//);
  assert.match(nginx, /location \/forum-sso\//);
  assert.match(nginx, /location = \/api\/v1\/auth\/parallellines\/callback/);
  assert.match(nginx, /proxy_set_header X-Forwarded-Proto https/);
  assert.doesNotMatch(nginx, /proxy_set_header X-Forwarded-Proto \$scheme/);
  assert.match(nginx, /proxy_set_header Upgrade \$http_upgrade/);
  assert.match(nginx, /try_files \$uri \$uri\/ \/index\.html/);
});

test("deployment backs up identity data and never transports bearer tokens in query", async () => {
  const workflow = await readRepositoryFile(".github", "workflows", "deploy.yml");
  const client = await readFile(join(projectRoot, "src", "client.ts"), "utf8");
  assert.match(workflow, /pg_dump/);
  assert.match(workflow, /keycloak-\$\{EXPECTED_SHA\}\.sql/);
  assert.match(workflow, /game-\$\{EXPECTED_SHA\}\.sql/);
  assert.match(workflow, /mirror-game-migrate/);
  assert.match(workflow, /retire_legacy_fablespace\.py --apply/);
  assert.match(workflow, /configure-keycloak-profile\.mjs/);
  assert.match(workflow, /--header='Host: fable\.pingxingxian\.space'/);
  assert.match(workflow, /https:\/\/fable\.pingxingxian\.space\/forum-sso\/auth/);
  assert.match(workflow, /Location: \//);
  assert.doesNotMatch(workflow, /apps\/web|apps\/api|memory-worker|llm-proxy/);
  assert.doesNotMatch(client, /query:\s*\(\)\s*=>\s*\(\{\s*token/);
  assert.match(client, /protocols:\s*\(\)\s*=>\s*\["mirror-island", `bearer\.\$\{keycloak\.token\}`\]/);
});
