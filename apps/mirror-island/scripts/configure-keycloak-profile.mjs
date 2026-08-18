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

await applyUserProfile(await requestAdminToken());
console.log("Applied the Mirror Island Keycloak user profile.");
