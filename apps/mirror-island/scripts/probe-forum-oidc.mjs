const publicOrigin = new URL(String(process.env.MIRROR_ISLAND_PUBLIC_ORIGIN || ""));
const clientId = String(process.env.MIRROR_ISLAND_FORUM_OIDC_CLIENT_ID || "").trim();
if (publicOrigin.protocol !== "https:" || publicOrigin.pathname !== "/" || !clientId) {
  throw new Error("Mirror Island forum OIDC probe configuration is invalid.");
}

/** Probes the registered Keycloak broker client through a real OIDC authorization request. */
async function probeForumAuthorization() {
  const authorizationUrl = new URL("http://127.0.0.1:3001/forum-sso/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${publicOrigin.origin}/identity/realms/mirror-island/broker/parallellines/endpoint`,
    response_type: "code",
    scope: "openid",
    state: "deployment_probe",
    code_challenge: "c".repeat(43),
    code_challenge_method: "S256",
  }).toString();
  const response = await fetch(authorizationUrl, {
    redirect: "manual",
    headers: {
      "X-Forwarded-Host": publicOrigin.host,
      "X-Forwarded-Proto": "https",
      "X-Forwarded-Port": "443",
    },
  });
  const location = response.headers.get("location") || "";
  if (
    response.status !== 303 ||
    !location.startsWith(`${publicOrigin.origin}/forum-sso/interaction/`)
  ) {
    throw new Error(`Mirror Island forum OIDC authorization probe failed (HTTP ${response.status}).`);
  }
}

await probeForumAuthorization();
console.log("forum_oidc_authorization=ready");
