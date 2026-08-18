import Keycloak, { type KeycloakConfig } from "keycloak-js";

const TOKEN_REFRESH_INTERVAL_MS = 30_000;
const TOKEN_MIN_VALIDITY_SECONDS = 60;

export type AuthenticatedKeycloak = Keycloak & {
  subject: string;
  token: string;
};

/** Resolves the public Keycloak browser configuration from Vite variables and local-safe defaults. */
export function resolveKeycloakClientConfig(env: ImportMetaEnv = import.meta.env): KeycloakConfig {
  return {
    url: String(env.VITE_KEYCLOAK_URL || "http://localhost:8081").replace(/\/+$/, ""),
    realm: String(env.VITE_KEYCLOAK_REALM || "mirror-island"),
    clientId: String(env.VITE_KEYCLOAK_CLIENT_ID || "mirror-island-web"),
  };
}

/** Refreshes the in-memory token and returns to login if the Keycloak session can no longer refresh. */
async function refreshKeycloakToken(keycloak: Keycloak): Promise<void> {
  try {
    await keycloak.updateToken(TOKEN_MIN_VALIDITY_SECONDS);
  } catch {
    await keycloak.login();
  }
}

/** Initializes login-required PKCE authentication and returns a session with a stable subject and memory-only token. */
export async function initializeKeycloakSession(): Promise<AuthenticatedKeycloak> {
  const keycloak = new Keycloak(resolveKeycloakClientConfig());
  const authenticated = await keycloak.init({
    onLoad: "login-required",
    pkceMethod: "S256",
    checkLoginIframe: false,
  });

  if (!authenticated || !keycloak.subject || !keycloak.token) {
    await keycloak.login();
    throw new Error("Authentication did not establish a Keycloak session.");
  }

  keycloak.onTokenExpired = () => {
    void refreshKeycloakToken(keycloak);
  };
  keycloak.onAuthLogout = () => {
    void keycloak.login();
  };

  const refreshTimer = window.setInterval(() => {
    void refreshKeycloakToken(keycloak);
  }, TOKEN_REFRESH_INTERVAL_MS);
  window.addEventListener("beforeunload", () => window.clearInterval(refreshTimer), { once: true });

  return keycloak as AuthenticatedKeycloak;
}

/** Replaces the empty game root with a retryable local authentication error without exposing provider details. */
export function renderAuthenticationFailure(): void {
  const root = document.getElementById("rpg");
  if (root === null) return;
  root.innerHTML = `
    <main class="authFailure" role="alert">
      <h1>暂时无法进入镜像岛</h1>
      <p>登录服务没有准备好，请稍后重试。</p>
      <button type="button" class="authFailure__retry">重试</button>
    </main>
  `;
  root.querySelector<HTMLButtonElement>(".authFailure__retry")?.addEventListener("click", () => {
    window.location.reload();
  });
}
