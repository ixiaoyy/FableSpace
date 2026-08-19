import type { ForumSsoConfig } from "./config.ts";

const ACCESS_CAPABILITY = "fablespace.access";
const MAX_RESPONSE_BYTES = 32 * 1024;
const TICKET_PATTERN = /^[A-Za-z0-9._~-]{20,256}$/;

export interface ForumIdentity {
  accountId: string;
  username: string;
  displayName: string;
  locale: string;
  authorizationVersion: number;
  accessExpiresAt: string | null;
}

/** Redeems one short-lived ParallelLines ticket and immediately confirms current authorization. */
export async function redeemForumTicket(
  config: ForumSsoConfig,
  rawCode: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<ForumIdentity> {
  const code = String(rawCode || "").trim();
  if (!TICKET_PATTERN.test(code)) {
    throw new Error("Forum login ticket is invalid.");
  }
  const exchanged = await requestForumIdentity(
    `${config.forumApiBaseUrl}/auth/fablespace/exchange`,
    { code },
    config,
    fetchImpl,
  );
  const current = await requestForumIdentity(
    `${config.forumApiBaseUrl}/auth/fablespace/introspect`,
    { user_id: exchanged.accountId },
    config,
    fetchImpl,
  );
  if (
    current.accountId !== exchanged.accountId ||
    current.authorizationVersion < exchanged.authorizationVersion
  ) {
    throw new Error("Forum authorization changed during login.");
  }
  return current;
}

/** Calls one backend-only ParallelLines endpoint and decodes its bounded authorization envelope. */
async function requestForumIdentity(
  url: string,
  body: Record<string, string>,
  config: ForumSsoConfig,
  fetchImpl: typeof fetch,
): Promise<ForumIdentity> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-FableSpace-SSO-Secret": config.forumServiceSecret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new Error("Forum authorization service is unavailable.");
  }
  if (!response.ok) {
    throw new Error("Forum login ticket was rejected.");
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("Forum authorization response is too large.");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Forum authorization response is invalid.");
  }
  return decodeForumIdentity(payload);
}

/** Decodes the stable forum subject and capability contract from an untrusted JSON response. */
function decodeForumIdentity(payload: unknown): ForumIdentity {
  const data = isRecord(payload) && isRecord(payload.data) ? payload.data : null;
  if (!data || ("active" in data && data.active !== true)) {
    throw new Error("Forum account is not active.");
  }
  const user = isRecord(data.user) ? data.user : null;
  if (!user) {
    throw new Error("Forum authorization response does not contain a user.");
  }
  const accountId = readBoundedString(user.id, 128);
  const username = readBoundedString(user.username, 128);
  const displayName = readBoundedString(user.display_name, 128, username);
  const locale = readBoundedString(user.locale, 16, "zh-CN");
  const authorizationVersion = Number(data.authorization_version);
  const capabilities = Array.isArray(data.capabilities)
    ? data.capabilities.filter((value): value is string => typeof value === "string")
    : [];
  const accessExpiresAt = data.access_expires_at === null || data.access_expires_at === undefined
    ? null
    : readBoundedString(data.access_expires_at, 64);
  const expiresAt = accessExpiresAt === null ? null : Date.parse(accessExpiresAt);
  if (
    !accountId ||
    !username ||
    !Number.isSafeInteger(authorizationVersion) ||
    authorizationVersion < 0 ||
    !capabilities.includes(ACCESS_CAPABILITY) ||
    (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= Date.now()))
  ) {
    throw new Error("Forum account is not authorized for Mirror Island.");
  }
  return { accountId, username, displayName, locale, authorizationVersion, accessExpiresAt };
}

/** Reads one bounded string and optionally supplies a trusted fallback. */
function readBoundedString(value: unknown, maxLength: number, fallback = ""): string {
  const text = typeof value === "string" ? value.trim() : fallback;
  return text.length <= maxLength ? text : "";
}

/** Narrows arbitrary JSON to a string-keyed object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
