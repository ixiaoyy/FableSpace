import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import Provider, { type Configuration } from "oidc-provider";
import type { ForumSsoConfig } from "./config.ts";
import { resolveForumSsoConfig } from "./config.ts";
import {
  signForumEntryState,
  signInteractionState,
  verifyForumEntryState,
  verifyInteractionState,
} from "./state.ts";
import type { ForumIdentity } from "./ticket.ts";
import { redeemForumTicket } from "./ticket.ts";
import { createTransientOidcAdapter } from "./transient-adapter.ts";

const INTERACTION_COOKIE = "mirror_forum_interaction";
const ENTRY_IDENTITY_COOKIE = "mirror_forum_entry_identity";
const ENTRY_OAUTH_COOKIE = "mirror_forum_entry_oauth";
const MAX_CACHED_ACCOUNTS = 10_000;

interface ForumAccountClaims {
  [claim: string]: string;
  sub: string;
  preferred_username: string;
  name: string;
  locale: string;
}

/** Keeps only short OIDC claim projections; Keycloak remains the durable identity owner. */
class ForumAccountStore {
  private readonly claimsById = new Map<string, ForumAccountClaims>();
  private readonly pendingEntries = new Map<string, { accountId: string; expiresAt: number }>();

  /** Inserts or refreshes one forum account and evicts the oldest transient projection when bounded capacity is reached. */
  remember(identity: ForumIdentity): string {
    const accountId = `forum:${identity.accountId}`;
    if (!this.claimsById.has(accountId) && this.claimsById.size >= MAX_CACHED_ACCOUNTS) {
      const oldest = this.claimsById.keys().next().value;
      if (oldest) this.claimsById.delete(oldest);
    }
    this.claimsById.set(accountId, {
      sub: accountId,
      preferred_username: `forum_${Buffer.from(identity.accountId, "utf8").toString("base64url")}`,
      name: identity.displayName || identity.username,
      locale: identity.locale,
    });
    return accountId;
  }

  /** Returns the OIDC account contract required by oidc-provider, or undefined after a bridge restart. */
  find(accountId: string) {
    const claims = this.claimsById.get(accountId);
    if (!claims) return undefined;
    return {
      accountId,
      async claims() {
        return claims;
      },
    };
  }

  /** Binds one already-redeemed forum identity to a short random nonce for the Keycloak entry flow. */
  beginEntry(accountId: string): string {
    this.purgePendingEntries();
    const nonce = randomBytes(32).toString("base64url");
    this.pendingEntries.set(nonce, { accountId, expiresAt: Date.now() + 5 * 60_000 });
    return nonce;
  }

  /** Consumes one pending forum identity exactly once when Keycloak reaches the broker login prompt. */
  consumeEntry(nonce: string): string | null {
    this.purgePendingEntries();
    const pending = this.pendingEntries.get(nonce);
    this.pendingEntries.delete(nonce);
    return pending?.accountId ?? null;
  }

  /** Removes expired direct-entry bindings before each access. */
  private purgePendingEntries(): void {
    const now = Date.now();
    for (const [nonce, pending] of this.pendingEntries) {
      if (pending.expiresAt <= now) this.pendingEntries.delete(nonce);
    }
  }
}

/** Owns the narrow HTTP adapter between ParallelLines tickets and Keycloak's OIDC broker. */
export class ForumSsoBridge {
  private readonly provider: Provider;
  private readonly config: ForumSsoConfig;
  private readonly accounts: ForumAccountStore;
  private readonly providerCallback: ReturnType<Provider["callback"]>;

  /** Captures the configured provider and transient account owner for one game-server process. */
  constructor(
    provider: Provider,
    config: ForumSsoConfig,
    accounts: ForumAccountStore,
  ) {
    this.provider = provider;
    this.config = config;
    this.accounts = accounts;
    this.providerCallback = provider.callback();
  }

  /** Handles one bridge, interaction, discovery, or legacy ticket-callback request. */
  async handle(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const parsed = new URL(request.url || "/", this.config.publicOrigin);
    if (parsed.pathname === "/api/v1/auth/parallellines/callback") {
      await this.finishForumLogin(request, response, parsed.searchParams.get("code"));
      return true;
    }
    if (parsed.pathname === "/forum-sso/keycloak-callback") {
      await this.finishKeycloakEntry(request, response, parsed.searchParams);
      return true;
    }

    const interactionMatch = /^\/forum-sso\/interaction\/([A-Za-z0-9_-]{8,256})$/.exec(
      parsed.pathname,
    );
    if (interactionMatch) {
      await this.continueInteraction(request, response, interactionMatch[1]);
      return true;
    }

    if (parsed.pathname === "/forum-sso/.well-known/openid-configuration") {
      const originalUrl = request.url;
      request.url = `/.well-known/openid-configuration${parsed.search}`;
      try {
        await this.providerCallback(request, response);
      } finally {
        request.url = originalUrl;
      }
      return true;
    }

    if (parsed.pathname.startsWith("/forum-sso/")) {
      await this.providerCallback(request, response);
      return true;
    }

    if (parsed.pathname === "/.well-known/openid-configuration/forum-sso") {
      await this.providerCallback(request, response);
      return true;
    }
    return false;
  }

  /** Redirects a login prompt to ParallelLines or auto-confirms the narrow OIDC consent prompt. */
  private async continueInteraction(
    request: IncomingMessage,
    response: ServerResponse,
    expectedUid: string,
  ): Promise<void> {
    const interaction = await this.provider.interactionDetails(request, response);
    if (interaction.uid !== expectedUid) {
      writeTextResponse(response, 400, "论坛登录请求已失效。");
      return;
    }
    if (interaction.prompt.name === "login") {
      const pendingAccountId = this.consumePendingEntry(request);
      if (pendingAccountId) {
        await this.provider.interactionFinished(
          request,
          response,
          { login: { accountId: pendingAccountId, amr: ["federated"] } },
          { mergeWithLastSubmission: false },
        );
        return;
      }
      setInteractionCookie(
        response,
        signInteractionState(interaction.uid, this.config.cookieKeys[0]),
      );
      response.writeHead(303, { Location: `${this.config.forumPublicBaseUrl}/play` });
      response.end();
      return;
    }
    if (interaction.prompt.name === "consent") {
      await finishConsent(this.provider, request, response, interaction);
      return;
    }
    await this.provider.interactionFinished(
      request,
      response,
      { error: "access_denied", error_description: "Unsupported login prompt" },
      { mergeWithLastSubmission: false },
    );
  }

  /** Redeems the fixed ParallelLines callback ticket and completes only the matching OIDC login interaction. */
  private async finishForumLogin(
    request: IncomingMessage,
    response: ServerResponse,
    code: unknown,
  ): Promise<void> {
    let interaction: Awaited<ReturnType<Provider["interactionDetails"]>> | null = null;
    try {
      const cookies = parseCookies(request.headers.cookie);
      const state = verifyInteractionState(
        cookies.get(INTERACTION_COOKIE),
        this.config.cookieKeys[0],
      );
      interaction = await this.provider.interactionDetails(request, response);
      if (interaction.uid !== state.uid || interaction.prompt.name !== "login") {
        throw new Error("Forum login interaction does not match the callback.");
      }
    } catch {
      interaction = null;
    }

    if (interaction === null) {
      await this.beginKeycloakEntry(request, response, code);
      return;
    }

    try {
      const identity = await redeemForumTicket(this.config, code);
      const accountId = this.accounts.remember(identity);
      await this.provider.interactionFinished(
        request,
        response,
        { login: { accountId, amr: ["federated"] } },
        { mergeWithLastSubmission: false },
      );
    } catch {
      await this.provider.interactionFinished(
        request,
        response,
        { error: "access_denied", error_description: "Forum account authorization failed" },
        { mergeWithLastSubmission: false },
      );
    }
  }

  /** Starts a confidential PKCE Keycloak authorization when a forum launch arrives without an OIDC interaction. */
  private async beginKeycloakEntry(
    _request: IncomingMessage,
    response: ServerResponse,
    code: unknown,
  ): Promise<void> {
    try {
      const identity = await redeemForumTicket(this.config, code);
      const accountId = this.accounts.remember(identity);
      const identityNonce = this.accounts.beginEntry(accountId);
      const oauthState = randomBytes(32).toString("base64url");
      const verifier = randomBytes(48).toString("base64url");
      const challenge = createHash("sha256").update(verifier).digest("base64url");
      appendCookie(
        response,
        ENTRY_IDENTITY_COOKIE,
        signInteractionState(identityNonce, this.config.cookieKeys[0]),
      );
      appendCookie(
        response,
        ENTRY_OAUTH_COOKIE,
        signForumEntryState(oauthState, verifier, this.config.cookieKeys[1]),
      );
      const authorizationUrl = new URL(this.config.keycloakAuthorizationUrl);
      authorizationUrl.searchParams.set("client_id", this.config.entryClientId);
      authorizationUrl.searchParams.set("redirect_uri", `${this.config.issuer}/keycloak-callback`);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("scope", "openid");
      authorizationUrl.searchParams.set("state", oauthState);
      authorizationUrl.searchParams.set("code_challenge", challenge);
      authorizationUrl.searchParams.set("code_challenge_method", "S256");
      authorizationUrl.searchParams.set("kc_idp_hint", "parallellines");
      response.writeHead(303, { Location: authorizationUrl.toString() });
      response.end();
    } catch {
      writeTextResponse(response, 401, "论坛登录票据无效或已过期。");
    }
  }

  /** Exchanges the confidential Keycloak entry code, clears bridge cookies, and returns to the public game root. */
  private async finishKeycloakEntry(
    request: IncomingMessage,
    response: ServerResponse,
    searchParams: URLSearchParams,
  ): Promise<void> {
    try {
      const cookies = parseCookies(request.headers.cookie);
      const entry = verifyForumEntryState(
        cookies.get(ENTRY_OAUTH_COOKIE),
        searchParams.get("state"),
        this.config.cookieKeys[1],
      );
      const code = String(searchParams.get("code") || "");
      if (!/^[A-Za-z0-9._~-]{20,2048}$/.test(code)) {
        throw new Error("Keycloak entry code is invalid.");
      }
      const tokenResponse = await fetch(this.config.keycloakTokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: this.config.entryClientId,
          client_secret: this.config.entryClientSecret,
          redirect_uri: `${this.config.issuer}/keycloak-callback`,
          code,
          code_verifier: entry.verifier,
        }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!tokenResponse.ok) throw new Error("Keycloak entry code was rejected.");
      await tokenResponse.arrayBuffer();
      expireCookie(response, ENTRY_IDENTITY_COOKIE);
      expireCookie(response, ENTRY_OAUTH_COOKIE);
      response.writeHead(303, { Location: `${this.config.publicOrigin}/` });
      response.end();
    } catch {
      writeTextResponse(response, 401, "镜像岛登录会话建立失败，请重试。");
    }
  }

  /** Resolves and consumes a direct forum-entry identity cookie for one broker login prompt. */
  private consumePendingEntry(request: IncomingMessage): string | null {
    try {
      const cookies = parseCookies(request.headers.cookie);
      const state = verifyInteractionState(
        cookies.get(ENTRY_IDENTITY_COOKIE),
        this.config.cookieKeys[0],
      );
      return this.accounts.consumeEntry(state.uid);
    } catch {
      return null;
    }
  }
}

/** Creates the single-process certified OIDC provider used only as a forum ticket adapter. */
export async function createForumSsoBridge(
  env: Record<string, string | undefined> = process.env,
): Promise<ForumSsoBridge> {
  const config = resolveForumSsoConfig(env);
  const accounts = new ForumAccountStore();

  const configuration: Configuration = {
    adapter: createTransientOidcAdapter,
    clients: [
      {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uris: [config.keycloakRedirectUri],
        response_types: ["code"],
        grant_types: ["authorization_code"],
        token_endpoint_auth_method: "client_secret_basic",
      },
    ],
    claims: {
      openid: ["sub"],
      profile: ["preferred_username", "name", "locale"],
    },
    cookies: {
      keys: config.cookieKeys,
      long: { httpOnly: true, sameSite: "lax", secure: true, path: "/" },
      short: { httpOnly: true, sameSite: "lax", secure: true, path: "/" },
    },
    discovery: {
      authorization_endpoint: `${config.issuer}/auth`,
      token_endpoint: `${config.issuer}/token`,
      userinfo_endpoint: `${config.issuer}/me`,
      jwks_uri: `${config.issuer}/jwks`,
      end_session_endpoint: `${config.issuer}/session/end`,
    },
    features: {
      devInteractions: { enabled: false },
    },
    enabledJWA: {
      idTokenSigningAlgValues: ["ES256"],
    },
    findAccount: async (_context, accountId) => accounts.find(accountId),
    interactions: {
      url: (_context, interaction) => `${config.issuer}/interaction/${interaction.uid}`,
    },
    issueRefreshToken: () => false,
    jwks: { keys: [config.signingJwk] },
    pkce: { required: () => true },
    responseTypes: ["code"],
    routes: {
      authorization: "/forum-sso/auth",
      end_session: "/forum-sso/session/end",
      jwks: "/forum-sso/jwks",
      token: "/forum-sso/token",
      userinfo: "/forum-sso/me",
    },
    scopes: ["openid", "profile"],
    ttl: {
      AccessToken: 5 * 60,
      AuthorizationCode: 60,
      Grant: 60 * 60,
      IdToken: 5 * 60,
      Interaction: 5 * 60,
      Session: 15 * 60,
    },
  };
  const provider = new Provider(config.issuer, configuration);
  provider.proxy = true;
  provider.use(async (context, next) => {
    context.set("Cache-Control", "no-store");
    context.set("X-Content-Type-Options", "nosniff");
    context.set("Referrer-Policy", "no-referrer");
    await next();
  });
  return new ForumSsoBridge(provider, config, accounts);
}

/** Grants only the OIDC scopes and claims already requested by the registered Keycloak client. */
async function finishConsent(
  provider: Provider,
  request: IncomingMessage,
  response: ServerResponse,
  interaction: Awaited<ReturnType<Provider["interactionDetails"]>>,
): Promise<void> {
  const accountId = interaction.session?.accountId;
  const clientId = typeof interaction.params.client_id === "string"
    ? interaction.params.client_id
    : "";
  if (!accountId || !clientId) {
    throw new Error("OIDC consent interaction is incomplete.");
  }
  let grantId = interaction.grantId;
  const grant = grantId
    ? await provider.Grant.find(grantId)
    : new provider.Grant({ accountId, clientId });
  if (!grant) throw new Error("OIDC consent grant is unavailable.");

  const missingScopes = stringArray(interaction.prompt.details.missingOIDCScope);
  const missingClaims = stringArray(interaction.prompt.details.missingOIDCClaims);
  if (missingScopes.length) grant.addOIDCScope(missingScopes);
  if (missingClaims.length) grant.addOIDCClaims(missingClaims);
  grantId = await grant.save();
  await provider.interactionFinished(
    request,
    response,
    { consent: interaction.grantId ? {} : { grantId } },
    { mergeWithLastSubmission: true },
  );
}

/** Parses the request Cookie header without trusting duplicate or malformed records. */
function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of String(header || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name && !cookies.has(name)) cookies.set(name, value);
  }
  return cookies;
}

/** Sets the short-lived, HttpOnly callback binding without putting interaction state in a URL. */
function setInteractionCookie(response: ServerResponse, value: string): void {
  appendCookie(response, INTERACTION_COOKIE, value);
}

/** Appends one short-lived secure bridge cookie without overwriting provider cookies. */
function appendCookie(response: ServerResponse, name: string, value: string): void {
  const current = response.getHeader("Set-Cookie");
  const cookies = Array.isArray(current) ? current : current ? [String(current)] : [];
  response.setHeader("Set-Cookie", [
    ...cookies,
    `${name}=${value}; Max-Age=300; Path=/; HttpOnly; Secure; SameSite=Lax`,
  ]);
}

/** Expires one bridge-owned cookie after the Keycloak entry handshake completes. */
function expireCookie(response: ServerResponse, name: string): void {
  const current = response.getHeader("Set-Cookie");
  const cookies = Array.isArray(current) ? current : current ? [String(current)] : [];
  response.setHeader("Set-Cookie", [
    ...cookies,
    `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
  ]);
}

/** Writes one fixed bridge response without exposing ticket, provider, or upstream details. */
function writeTextResponse(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(body);
}

/** Normalizes an interaction detail to a string array before granting it. */
function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}
