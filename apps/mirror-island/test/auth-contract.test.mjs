import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateKeyPair, SignJWT } from "jose";
import { resolveKeycloakClientConfig } from "../src/auth/client.ts";
import {
  createKeycloakAccessTokenVerifier,
  createKeycloakAuthModule,
  resolveKeycloakServerConfig,
} from "../src/auth/server.ts";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const issuer = "https://identity.example/realms/mirror-island";
const audience = "mirror-island-game";
const config = {
  issuer,
  audience,
  jwksUri: `${issuer}/protocol/openid-connect/certs`,
};

/** Signs one short-lived RS256 access token for the isolated verifier contract. */
async function signAccessToken(privateKey, overrides = {}) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(overrides.issuer ?? issuer)
    .setAudience(overrides.audience ?? audience)
    .setSubject(overrides.subject ?? "account-123")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

test("Keycloak client config uses explicit public values without credentials", () => {
  assert.deepEqual(resolveKeycloakClientConfig({
    VITE_KEYCLOAK_URL: "https://identity.example/",
    VITE_KEYCLOAK_REALM: "mirror-island-test",
    VITE_KEYCLOAK_CLIENT_ID: "mirror-island-browser",
  }), {
    url: "https://identity.example",
    realm: "mirror-island-test",
    clientId: "mirror-island-browser",
  });
});

test("server config rejects non-local HTTP identity endpoints", () => {
  assert.throws(() => resolveKeycloakServerConfig({
    KEYCLOAK_ISSUER: "http://identity.example/realms/mirror-island",
  }), /HTTPS outside localhost/);
  assert.equal(resolveKeycloakServerConfig({}).audience, audience);
  assert.equal(resolveKeycloakServerConfig({
    KEYCLOAK_ISSUER: issuer,
    KEYCLOAK_JWKS_URI: "http://keycloak:8080/identity/realms/mirror-island/certs",
    KEYCLOAK_ALLOW_HTTP_JWKS: "true",
  }).jwksUri, "http://keycloak:8080/identity/realms/mirror-island/certs");
  assert.throws(() => resolveKeycloakServerConfig({
    KEYCLOAK_ISSUER: issuer,
    KEYCLOAK_JWKS_URI: "http://identity.example/certs",
    KEYCLOAK_ALLOW_HTTP_JWKS: "true",
  }), /HTTPS outside localhost/);
});

test("RPGJS auth accepts a valid Keycloak subject and rejects invalid audience or guests", async () => {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const verify = createKeycloakAccessTokenVerifier(config, publicKey);
  const validToken = await signAccessToken(privateKey);
  assert.equal(await verify(validToken), "account-123");
  await assert.rejects(
    verify(await signAccessToken(privateKey, { audience: "another-service" })),
  );

  const module = createKeycloakAuthModule(verify);
  const auth = module.engine?.auth;
  assert.equal(typeof auth, "function");
  await assert.rejects(
    auth({}, { handshake: { query: {}, headers: {} } }),
    /Authentication failed/,
  );
  assert.equal(
    await auth({}, {
      handshake: {
        query: {},
        headers: { "sec-websocket-protocol": `mirror-island, bearer.${validToken}` },
      },
    }),
    "account-123",
  );
});

test("realm enables simple registration and exposes only username to self-service users", async () => {
  const realm = JSON.parse(await readFile(
    join(projectRoot, "keycloak", "mirror-island-realm.json"),
    "utf8",
  ));
  assert.equal(realm.registrationAllowed, true);
  assert.equal(realm.rememberMe, true);
  assert.equal(realm.verifyEmail, false);
  assert.equal(realm.resetPasswordAllowed, false);
  assert.equal(realm.passwordPolicy, "maxLength(72)");

  const browserClient = realm.clients.find((client) => client.clientId === "mirror-island-web");
  assert.equal(browserClient.publicClient, true);
  assert.equal(browserClient.attributes["pkce.code.challenge.method"], "S256");
  assert.equal(
    browserClient.protocolMappers[0].config["included.client.audience"],
    audience,
  );

  const profile = JSON.parse(await readFile(
    join(projectRoot, "keycloak", "mirror-island-user-profile.json"),
    "utf8",
  ));
  const userEditable = profile.attributes
    .filter((attribute) => attribute.permissions.edit.includes("user"))
    .map((attribute) => attribute.name);
  assert.deepEqual(userEditable, ["username"]);
});
