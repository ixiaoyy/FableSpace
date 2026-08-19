import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const serverUrl = String(
  process.env.MIRROR_ISLAND_KEYCLOAK_ADMIN_URL || "http://127.0.0.1:8081",
).replace(/\/+$/, "");
const admin = process.env.MIRROR_ISLAND_KEYCLOAK_ADMIN || "admin";
const password = process.env.MIRROR_ISLAND_KEYCLOAK_ADMIN_PASSWORD || "admin";

/** Requests a short-lived administrator token without persisting or printing credentials or token values. */
async function requestAdminToken() {
  const form = new URLSearchParams({
    client_id: "admin-cli",
    grant_type: "password",
    username: admin,
    password,
  });
  const response = await fetch(`${serverUrl}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) {
    throw new Error("Unable to authenticate the Keycloak administrator.");
  }
  const payload = await response.json();
  if (typeof payload.access_token !== "string" || payload.access_token.length === 0) {
    throw new Error("Keycloak did not return an administrator access token.");
  }
  return payload.access_token;
}

/** Applies the reviewed self-service attribute schema through the Keycloak Admin REST boundary. */
async function applyUserProfile(accessToken) {
  const profile = await readFile(
    join(root, "keycloak", "mirror-island-user-profile.json"),
    "utf8",
  );
  const response = await fetch(`${serverUrl}/admin/realms/mirror-island/users/profile`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: profile,
  });
  if (!response.ok) {
    throw new Error(`Unable to apply the Keycloak user profile (HTTP ${response.status}).`);
  }
}

/** Reads the versioned realm source used to reconcile settings that startup import skips for an existing realm. */
async function readRealmSource() {
  return JSON.parse(await readFile(
    join(root, "keycloak", "mirror-island-realm.json"),
    "utf8",
  ));
}

/** Performs one authenticated Keycloak Admin request without logging secrets or response bodies. */
async function requestAdmin(accessToken, path, { method = "GET", body, allowNotFound = false } = {}) {
  const response = await fetch(`${serverUrl}/admin/realms/mirror-island${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Unable to reconcile Keycloak ${path} (HTTP ${response.status}).`);
  }
  const responseText = await response.text();
  if (responseText.trim().length === 0) return null;
  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(`Keycloak ${path} returned an invalid JSON response (HTTP ${response.status}).`);
  }
}

/** Reconciles the pixel login theme and registration flags on an already-imported realm. */
async function applyRealmSettings(accessToken, source) {
  const current = await requestAdmin(accessToken, "");
  await requestAdmin(accessToken, "", {
    method: "PUT",
    body: {
      ...current,
      displayName: source.displayName,
      internationalizationEnabled: source.internationalizationEnabled,
      supportedLocales: source.supportedLocales,
      defaultLocale: source.defaultLocale,
      loginTheme: source.loginTheme,
      registrationAllowed: source.registrationAllowed,
      rememberMe: source.rememberMe,
      verifyEmail: source.verifyEmail,
      resetPasswordAllowed: source.resetPasswordAllowed,
      passwordPolicy: source.passwordPolicy,
    },
  });
}

/** Creates or replaces the single ParallelLines OIDC provider with its server-only client secret. */
async function applyForumIdentityProvider(accessToken, source) {
  const desired = structuredClone(source.identityProviders[0]);
  const clientSecret = String(process.env.MIRROR_ISLAND_FORUM_OIDC_CLIENT_SECRET || "").trim();
  if (clientSecret.length < 32) {
    throw new Error("Mirror Island forum OIDC client secret is missing or too short.");
  }
  desired.config.clientSecret = clientSecret;
  const existing = await requestAdmin(
    accessToken,
    `/identity-provider/instances/${encodeURIComponent(desired.alias)}`,
    { allowNotFound: true },
  );
  if (existing === null) {
    await requestAdmin(accessToken, "/identity-provider/instances", {
      method: "POST",
      body: desired,
    });
    return;
  }
  await requestAdmin(
    accessToken,
    `/identity-provider/instances/${encodeURIComponent(desired.alias)}`,
    { method: "PUT", body: { ...existing, ...desired, config: desired.config } },
  );
}

/** Reconciles the public browser client and the confidential forum-entry bootstrap client. */
async function applyRealmClients(accessToken, source) {
  const managedClientIds = ["mirror-island-web", "mirror-island-forum-entry"];
  for (const clientId of managedClientIds) {
    const desired = structuredClone(source.clients.find((client) => client.clientId === clientId));
    if (!desired) throw new Error(`Mirror Island client source is missing: ${clientId}.`);
    if (clientId === "mirror-island-forum-entry") {
      const secret = String(process.env.MIRROR_ISLAND_FORUM_ENTRY_CLIENT_SECRET || "").trim();
      if (secret.length < 32) throw new Error("Mirror Island forum entry client secret is missing.");
      desired.secret = secret;
    }
    const matches = await requestAdmin(
      accessToken,
      `/clients?clientId=${encodeURIComponent(clientId)}`,
    );
    if (!Array.isArray(matches) || matches.length > 1) {
      throw new Error(`Mirror Island client is ambiguous: ${clientId}.`);
    }
    if (matches.length === 0) {
      await requestAdmin(accessToken, "/clients", { method: "POST", body: desired });
      continue;
    }
    if (typeof matches[0].id !== "string") {
      throw new Error(`Mirror Island client has no internal ID: ${clientId}.`);
    }
    await requestAdmin(accessToken, `/clients/${encodeURIComponent(matches[0].id)}`, {
      method: "PUT",
      body: { ...matches[0], ...desired, id: matches[0].id },
    });
  }
}

const accessToken = await requestAdminToken();
const realmSource = await readRealmSource();
await applyRealmSettings(accessToken, realmSource);
await applyForumIdentityProvider(accessToken, realmSource);
await applyRealmClients(accessToken, realmSource);
await applyUserProfile(accessToken);
console.log("Applied the Mirror Island Keycloak realm, forum identity provider, client, and user profile.");
