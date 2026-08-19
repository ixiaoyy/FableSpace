import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { after, test } from "node:test";
import { exportJWK, generateKeyPair } from "jose";
import { resolveForumSsoConfig } from "../src/sso/config.ts";
import { createForumSsoBridge } from "../src/sso/provider.ts";
import {
  signForumEntryState,
  signInteractionState,
  verifyForumEntryState,
  verifyInteractionState,
} from "../src/sso/state.ts";
import { redeemForumTicket } from "../src/sso/ticket.ts";

const strongA = "a".repeat(48);
const strongB = "b".repeat(48);
const { privateKey: testSigningKey } = await generateKeyPair("ES256", { extractable: true });
const testSigningJwk = {
  ...(await exportJWK(testSigningKey)),
  alg: "ES256",
  use: "sig",
  kid: "parallellines-es256",
};
const environment = {
  MIRROR_ISLAND_PUBLIC_ORIGIN: "https://fable.example",
  PARALLELLINES_PUBLIC_BASE_URL: "https://forum.example",
  PARALLELLINES_API_BASE_URL: "http://api:8000/api/v1",
  PARALLELLINES_SSO_SERVICE_SECRET: "s".repeat(48),
  MIRROR_ISLAND_FORUM_OIDC_CLIENT_ID: "mirror-island-forum-bridge",
  MIRROR_ISLAND_FORUM_OIDC_CLIENT_SECRET: "c".repeat(48),
  MIRROR_ISLAND_FORUM_ENTRY_CLIENT_ID: "mirror-island-forum-entry",
  MIRROR_ISLAND_FORUM_ENTRY_CLIENT_SECRET: "e".repeat(48),
  MIRROR_ISLAND_FORUM_OIDC_COOKIE_KEYS: `${strongA},${strongB}`,
  MIRROR_ISLAND_FORUM_OIDC_SIGNING_JWK_B64: Buffer.from(
    JSON.stringify(testSigningJwk),
    "utf8",
  ).toString("base64url"),
};

test("forum SSO config accepts only reviewed public and internal boundaries", () => {
  const config = resolveForumSsoConfig(environment);
  assert.equal(config.issuer, "https://fable.example/forum-sso");
  assert.equal(
    config.keycloakRedirectUri,
    "https://fable.example/identity/realms/mirror-island/broker/parallellines/endpoint",
  );
  assert.throws(
    () => resolveForumSsoConfig({ ...environment, PARALLELLINES_API_BASE_URL: "http://api.example/v1" }),
    /HTTPS or an internal HTTP/,
  );
});

test("forum callback state rejects tampering and expiry", () => {
  const state = signInteractionState("interaction_123", strongA, 1_000);
  assert.equal(verifyInteractionState(state, strongA, 2_000).uid, "interaction_123");
  assert.throws(() => verifyInteractionState(`${state}x`, strongA, 2_000), /invalid/);
  assert.throws(() => verifyInteractionState(state, strongA, 400_000), /expired/);

  const entry = signForumEntryState("s".repeat(43), "v".repeat(64), strongB, 1_000);
  assert.equal(
    verifyForumEntryState(entry, "s".repeat(43), strongB, 2_000).verifier,
    "v".repeat(64),
  );
  assert.throws(
    () => verifyForumEntryState(entry, "x".repeat(43), strongB, 2_000),
    /invalid or expired/,
  );
});

test("ticket exchange is followed by live introspection and keeps a stable forum subject", async () => {
  const requests = [];
  const expires = new Date(Date.now() + 60_000).toISOString();
  const fetchStub = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify({
      data: {
        active: true,
        user: {
          id: "7",
          username: "张三",
          display_name: "张三",
          role: "user",
          locale: "zh-CN",
        },
        capabilities: ["fablespace.access"],
        authorization_version: 3,
        access_expires_at: expires,
      },
    }), { status: 200 });
  };
  const identity = await redeemForumTicket(
    resolveForumSsoConfig(environment),
    "ticket_abcdefghijklmnopqrstuvwxyz",
    fetchStub,
  );
  assert.equal(identity.accountId, "7");
  assert.deepEqual(requests.map((request) => request.url), [
    "http://api:8000/api/v1/auth/fablespace/exchange",
    "http://api:8000/api/v1/auth/fablespace/introspect",
  ]);
  assert.deepEqual(requests[1].body, { user_id: "7" });
});

test("baseline forum access may be active without an expiry timestamp", async () => {
  const fetchStub = async () => new Response(JSON.stringify({
    data: {
      active: true,
      user: { id: "9", username: "baseline", role: "user", locale: "zh-CN" },
      capabilities: ["fablespace.access"],
      authorization_version: 0,
      access_expires_at: null,
    },
  }), { status: 200 });
  const identity = await redeemForumTicket(
    resolveForumSsoConfig(environment),
    "ticket_baseline_abcdefghijklmnop",
    fetchStub,
  );
  assert.equal(identity.accountId, "9");
  assert.equal(identity.accessExpiresAt, null);
});

test("the forum OIDC provider publishes endpoints and accepts the Keycloak broker client", async () => {
  const bridge = await createForumSsoBridge(environment);
  const server = createServer(async (request, response) => {
    if (!(await bridge.handle(request, response))) {
      response.writeHead(404).end();
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  after(() => server.close());
  const address = server.address();
  assert.equal(typeof address, "object");
  const response = await fetch(
    `http://127.0.0.1:${address.port}/forum-sso/.well-known/openid-configuration`,
    {
      headers: {
        Host: "fable.example",
        "X-Forwarded-Host": "fable.example",
        "X-Forwarded-Proto": "https",
      },
    },
  );
  assert.equal(response.status, 200);
  const discovery = await response.json();
  assert.equal(discovery.issuer, "https://fable.example/forum-sso");
  assert.equal(discovery.authorization_endpoint, "https://fable.example/forum-sso/auth");
  assert.equal(discovery.token_endpoint, "https://fable.example/forum-sso/token");
  assert.equal(discovery.code_challenge_methods_supported.includes("S256"), true);

  const authorizationUrl = new URL(
    `http://127.0.0.1:${address.port}/forum-sso/auth`,
  );
  authorizationUrl.search = new URLSearchParams({
    client_id: environment.MIRROR_ISLAND_FORUM_OIDC_CLIENT_ID,
    redirect_uri: "https://fable.example/identity/realms/mirror-island/broker/parallellines/endpoint",
    response_type: "code",
    scope: "openid",
    state: "deployment_probe",
    code_challenge: "c".repeat(43),
    code_challenge_method: "S256",
  }).toString();
  const authorization = await fetch(authorizationUrl, {
    redirect: "manual",
    headers: {
      Host: "fable.example",
      "X-Forwarded-Host": "fable.example",
      "X-Forwarded-Proto": "https",
    },
  });
  assert.equal(authorization.status, 303);
  assert.match(
    authorization.headers.get("location"),
    /^https:\/\/fable\.example\/forum-sso\/interaction\//,
  );
});

test("a direct forum ticket starts the confidential PKCE Keycloak entry flow", async () => {
  const originalFetch = globalThis.fetch;
  const expires = new Date(Date.now() + 60_000).toISOString();
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: {
      active: true,
      user: { id: "11", username: "forum-direct", role: "user", locale: "zh-CN" },
      capabilities: ["fablespace.access"],
      authorization_version: 1,
      access_expires_at: expires,
    },
  }), { status: 200 });
  const bridge = await createForumSsoBridge(environment);
  const server = createServer(async (request, response) => {
    if (!(await bridge.handle(request, response))) response.writeHead(404).end();
  });
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    assert.equal(typeof address, "object");
    const response = await originalFetch(
      `http://127.0.0.1:${address.port}/api/v1/auth/parallellines/callback?code=ticket_direct_abcdefghijklmnop`,
      { redirect: "manual" },
    );
    assert.equal(response.status, 303);
    const location = new URL(response.headers.get("location"));
    assert.equal(location.pathname, "/identity/realms/mirror-island/protocol/openid-connect/auth");
    assert.equal(location.searchParams.get("client_id"), "mirror-island-forum-entry");
    assert.equal(location.searchParams.get("kc_idp_hint"), "parallellines");
    assert.equal(location.searchParams.get("code_challenge_method"), "S256");
    assert.match(response.headers.get("set-cookie"), /mirror_forum_entry_identity=/);
    assert.match(response.headers.get("set-cookie"), /mirror_forum_entry_oauth=/);
  } finally {
    globalThis.fetch = originalFetch;
    server.close();
  }
});
