import type { RpgServer, RpgServerAuthSocket } from "@rpgjs/server";
import {
  createRemoteJWKSet,
  jwtVerify,
} from "jose";

export type KeycloakServerConfig = {
  issuer: string;
  audience: string;
  jwksUri: string;
};

export type KeycloakAccessTokenVerifier = (token: string) => Promise<string>;

/** Accepts HTTPS issuers plus local HTTP issuers used only by the isolated development identity service. */
function isAllowedIssuerUrl(url: URL): boolean {
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
}

/** Allows an explicit private Compose service name for JWKS while keeping the public issuer HTTPS-only. */
function isAllowedJwksUrl(
  url: URL,
  allowInternalHttp: boolean,
): boolean {
  if (isAllowedIssuerUrl(url)) return true;
  return allowInternalHttp
    && url.protocol === "http:"
    && /^[a-z0-9-]+$/u.test(url.hostname);
}

/** Reads and validates the server-side Keycloak issuer, audience, and JWKS boundary from environment values. */
export function resolveKeycloakServerConfig(
  env: Record<string, string | undefined> = process.env,
): KeycloakServerConfig {
  const issuer = String(
    env.KEYCLOAK_ISSUER || "http://localhost:8081/realms/mirror-island",
  ).replace(/\/+$/, "");
  const audience = String(env.KEYCLOAK_AUDIENCE || "mirror-island-game").trim();
  const issuerUrl = new URL(issuer);
  if (!isAllowedIssuerUrl(issuerUrl)) {
    throw new Error("KEYCLOAK_ISSUER must use HTTPS outside localhost.");
  }
  if (!audience) {
    throw new Error("KEYCLOAK_AUDIENCE must not be empty.");
  }

  const jwksUri = String(
    env.KEYCLOAK_JWKS_URI || `${issuer}/protocol/openid-connect/certs`,
  );
  const jwksUrl = new URL(jwksUri);
  const allowInternalHttp = env.KEYCLOAK_ALLOW_HTTP_JWKS === "true";
  if (!isAllowedJwksUrl(jwksUrl, allowInternalHttp)) {
    throw new Error("KEYCLOAK_JWKS_URI must use HTTPS outside localhost.");
  }

  return { issuer, audience, jwksUri: jwksUrl.toString() };
}

/** Creates a verifier that accepts only RS256 Keycloak access tokens with the configured issuer and audience. */
export function createKeycloakAccessTokenVerifier(
  config: KeycloakServerConfig = resolveKeycloakServerConfig(),
  keyResolver: Parameters<typeof jwtVerify>[1] = createRemoteJWKSet(new URL(config.jwksUri)),
): KeycloakAccessTokenVerifier {
  return async (token: string): Promise<string> => {
    const { payload } = await jwtVerify(token, keyResolver, {
      algorithms: ["RS256"],
      issuer: config.issuer,
      audience: config.audience,
      requiredClaims: ["sub"],
    });
    if (typeof payload.sub !== "string" || payload.sub.trim() === "") {
      throw new Error("Authentication failed.");
    }
    return payload.sub;
  };
}

/** Extracts a bearer token from the non-echoed WebSocket subprotocol without placing it in the logged URL. */
function accessTokenFrom(socket: RpgServerAuthSocket): string {
  const protocols = socket.handshake.headers["sec-websocket-protocol"] || "";
  const bearerProtocol = protocols
    .split(",")
    .map((protocol) => protocol.trim())
    .find((protocol) => protocol.startsWith("bearer."));
  const token = bearerProtocol?.slice("bearer.".length) || "";
  if (token.length === 0 || token.length > 8192) {
    throw new Error("Authentication failed.");
  }
  return token;
}

/** Builds the RPGJS server module that rejects guests and maps verified Keycloak subjects to player IDs. */
export function createKeycloakAuthModule(
  verifyAccessToken: KeycloakAccessTokenVerifier = createKeycloakAccessTokenVerifier(),
): RpgServer {
  return {
    engine: {
      async auth(_server, socket): Promise<string> {
        try {
          return await verifyAccessToken(accessTokenFrom(socket));
        } catch {
          console.error("[mirror-island:auth] WebSocket authentication failed.");
          throw new Error("Authentication failed.");
        }
      },
    },
  };
}
