import { createHmac, timingSafeEqual } from "node:crypto";

const STATE_TTL_SECONDS = 5 * 60;

interface InteractionState {
  uid: string;
  expiresAt: number;
}

interface ForumEntryState {
  state: string;
  verifier: string;
  expiresAt: number;
}

/** Signs one short-lived OIDC interaction identifier for the fixed forum callback. */
export function signInteractionState(uid: string, key: string, now = Date.now()): string {
  if (!/^[A-Za-z0-9_-]{8,256}$/.test(uid)) {
    throw new Error("OIDC interaction identifier is invalid.");
  }
  const payload = Buffer.from(
    JSON.stringify({ uid, expiresAt: now + STATE_TTL_SECONDS * 1_000 }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${signature(payload, key)}`;
}

/** Verifies one signed interaction state and rejects tampering or expiry. */
export function verifyInteractionState(value: unknown, key: string, now = Date.now()): InteractionState {
  const [payload, providedSignature, extra] = String(value || "").split(".");
  if (!payload || !providedSignature || extra) {
    throw new Error("Forum login state is invalid.");
  }
  const expected = Buffer.from(signature(payload, key));
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new Error("Forum login state is invalid.");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Forum login state is invalid.");
  }
  if (!isInteractionState(parsed) || parsed.expiresAt <= now) {
    throw new Error("Forum login state has expired.");
  }
  return parsed;
}

/** Signs the OAuth state and PKCE verifier used only by the confidential forum-entry client. */
export function signForumEntryState(
  state: string,
  verifier: string,
  key: string,
  now = Date.now(),
): string {
  if (!isOpaqueValue(state) || !isOpaqueValue(verifier)) {
    throw new Error("Forum entry OAuth state is invalid.");
  }
  const payload = Buffer.from(
    JSON.stringify({ state, verifier, expiresAt: now + STATE_TTL_SECONDS * 1_000 }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${signature(payload, key)}`;
}

/** Verifies the confidential forum-entry OAuth state before exchanging its Keycloak code. */
export function verifyForumEntryState(
  value: unknown,
  expectedState: unknown,
  key: string,
  now = Date.now(),
): ForumEntryState {
  const parsed = verifySignedPayload(value, key);
  if (
    !isForumEntryState(parsed) ||
    parsed.expiresAt <= now ||
    parsed.state !== String(expectedState || "")
  ) {
    throw new Error("Forum entry OAuth state is invalid or expired.");
  }
  return parsed;
}

/** Produces the fixed SHA-256 HMAC used by the callback-state cookie. */
function signature(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Verifies a signed JSON payload and returns its untyped decoded value. */
function verifySignedPayload(value: unknown, key: string): unknown {
  const [payload, providedSignature, extra] = String(value || "").split(".");
  if (!payload || !providedSignature || extra) {
    throw new Error("Signed browser state is invalid.");
  }
  const expected = Buffer.from(signature(payload, key));
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    throw new Error("Signed browser state is invalid.");
  }
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new Error("Signed browser state is invalid.");
  }
}

/** Narrows decoded JSON to the reviewed state shape. */
function isInteractionState(value: unknown): value is InteractionState {
  return (
    typeof value === "object" &&
    value !== null &&
    /^[A-Za-z0-9_-]{8,256}$/.test(String((value as { uid?: unknown }).uid || "")) &&
    Number.isSafeInteger((value as { expiresAt?: unknown }).expiresAt)
  );
}

/** Narrows decoded JSON to the confidential forum-entry OAuth state. */
function isForumEntryState(value: unknown): value is ForumEntryState {
  return (
    typeof value === "object" &&
    value !== null &&
    isOpaqueValue((value as { state?: unknown }).state) &&
    isOpaqueValue((value as { verifier?: unknown }).verifier) &&
    Number.isSafeInteger((value as { expiresAt?: unknown }).expiresAt)
  );
}

/** Accepts one bounded base64url-style nonce or verifier. */
function isOpaqueValue(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32,256}$/.test(value);
}
