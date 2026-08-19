const SECRET_MIN_LENGTH = 32;

export interface ForumSsoConfig {
  issuer: string;
  publicOrigin: string;
  forumPublicBaseUrl: string;
  forumApiBaseUrl: string;
  forumServiceSecret: string;
  clientId: string;
  clientSecret: string;
  entryClientId: string;
  entryClientSecret: string;
  cookieKeys: readonly [string, string];
  keycloakRedirectUri: string;
  keycloakAuthorizationUrl: string;
  keycloakTokenUrl: string;
  signingJwk: {
    alg: "ES256";
    crv: "P-256";
    d: string;
    kid: string;
    kty: "EC";
    use: "sig";
    x: string;
    y: string;
  };
}

/** Resolves and validates every Forum SSO boundary without accepting credentials from browser input. */
export function resolveForumSsoConfig(
  env: Record<string, string | undefined> = process.env,
): ForumSsoConfig {
  const publicOrigin = requireHttpsOrigin(env.MIRROR_ISLAND_PUBLIC_ORIGIN, "MIRROR_ISLAND_PUBLIC_ORIGIN");
  const forumPublicBaseUrl = requireHttpsOrigin(
    env.PARALLELLINES_PUBLIC_BASE_URL,
    "PARALLELLINES_PUBLIC_BASE_URL",
  );
  const forumApiBaseUrl = requireInternalHttpUrl(
    env.PARALLELLINES_API_BASE_URL,
    "PARALLELLINES_API_BASE_URL",
  );
  const clientId = String(env.MIRROR_ISLAND_FORUM_OIDC_CLIENT_ID || "").trim();
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(clientId)) {
    throw new Error("MIRROR_ISLAND_FORUM_OIDC_CLIENT_ID is invalid.");
  }
  const entryClientId = String(env.MIRROR_ISLAND_FORUM_ENTRY_CLIENT_ID || "").trim();
  if (!/^[A-Za-z0-9._-]{3,64}$/.test(entryClientId)) {
    throw new Error("MIRROR_ISLAND_FORUM_ENTRY_CLIENT_ID is invalid.");
  }
  const cookieKeys = String(env.MIRROR_ISLAND_FORUM_OIDC_COOKIE_KEYS || "")
    .split(",")
    .map((value) => value.trim());
  if (cookieKeys.length !== 2 || cookieKeys.some((value) => value.length < SECRET_MIN_LENGTH)) {
    throw new Error("MIRROR_ISLAND_FORUM_OIDC_COOKIE_KEYS must contain two strong keys.");
  }
  return {
    issuer: `${publicOrigin}/forum-sso`,
    publicOrigin,
    forumPublicBaseUrl,
    forumApiBaseUrl,
    forumServiceSecret: requireSecret(env.PARALLELLINES_SSO_SERVICE_SECRET, "PARALLELLINES_SSO_SERVICE_SECRET"),
    clientId,
    clientSecret: requireSecret(
      env.MIRROR_ISLAND_FORUM_OIDC_CLIENT_SECRET,
      "MIRROR_ISLAND_FORUM_OIDC_CLIENT_SECRET",
    ),
    entryClientId,
    entryClientSecret: requireSecret(
      env.MIRROR_ISLAND_FORUM_ENTRY_CLIENT_SECRET,
      "MIRROR_ISLAND_FORUM_ENTRY_CLIENT_SECRET",
    ),
    cookieKeys: cookieKeys as [string, string],
    keycloakRedirectUri: `${publicOrigin}/identity/realms/mirror-island/broker/parallellines/endpoint`,
    keycloakAuthorizationUrl: `${publicOrigin}/identity/realms/mirror-island/protocol/openid-connect/auth`,
    keycloakTokenUrl: requireInternalHttpUrl(
      env.MIRROR_ISLAND_KEYCLOAK_INTERNAL_URL ||
        "http://keycloak:8080/identity/realms/mirror-island/protocol/openid-connect/token",
      "MIRROR_ISLAND_KEYCLOAK_INTERNAL_URL",
    ),
    signingJwk: decodeSigningJwk(env.MIRROR_ISLAND_FORUM_OIDC_SIGNING_JWK_B64),
  };
}

/** Decodes the persisted private ES256 JWK used to keep Keycloak verification stable across restarts. */
function decodeSigningJwk(value: unknown): ForumSsoConfig["signingJwk"] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(String(value || ""), "base64url").toString("utf8"));
  } catch {
    throw new Error("MIRROR_ISLAND_FORUM_OIDC_SIGNING_JWK_B64 is invalid.");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as { kty?: unknown }).kty !== "EC" ||
    (parsed as { crv?: unknown }).crv !== "P-256" ||
    (parsed as { alg?: unknown }).alg !== "ES256" ||
    (parsed as { use?: unknown }).use !== "sig" ||
    !["x", "y", "d"].every((key) => /^[A-Za-z0-9_-]{40,64}$/.test(
      String((parsed as Record<string, unknown>)[key] || ""),
    ))
  ) {
    throw new Error("MIRROR_ISLAND_FORUM_OIDC_SIGNING_JWK_B64 has the wrong key shape.");
  }
  return parsed as ForumSsoConfig["signingJwk"];
}

/** Requires one public HTTPS origin with no path, credentials, query, or fragment. */
function requireHttpsOrigin(value: unknown, label: string): string {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${label} must be a valid HTTPS origin.`);
  }
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    (parsed.pathname && parsed.pathname !== "/") ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(`${label} must be a valid HTTPS origin.`);
  }
  return `${parsed.protocol}//${parsed.host}`;
}

/** Accepts HTTPS plus an internal HTTP service URL whose hostname has no dot. */
function requireInternalHttpUrl(value: unknown, label: string): string {
  const normalized = String(value || "").trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${label} must be a valid service URL.`);
  }
  const internalHttp = parsed.protocol === "http:" && !parsed.hostname.includes(".");
  if ((!internalHttp && parsed.protocol !== "https:") || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error(`${label} must use HTTPS or an internal HTTP service name.`);
  }
  return normalized;
}

/** Requires a server-only secret with at least 256 bits of generated entropy. */
function requireSecret(value: unknown, label: string): string {
  const secret = String(value || "").trim();
  if (secret.length < SECRET_MIN_LENGTH) {
    throw new Error(`${label} must contain at least ${SECRET_MIN_LENGTH} characters.`);
  }
  return secret;
}
