# Web Routing Contract

## Authority and scope

This file governs user-visible React Router paths and links. FastAPI endpoints remain under `/api/v1/*`; asset paths such as `/assets` and `/generated` are not web-page routes and must not be localized.

## Canonical resource paths

```text
/
/空间
/空间/新建
/空间/{spacePublicId}
/空间/{spacePublicId}/管理
/空间/{spacePublicId}/角色/{characterPublicId}
/空间/{spacePublicId}/角色/{characterPublicId}/提示词
/任务
/寻宝/{routePublicId}
/店主
/店主/{ownerPublicId}
/领地
/通知
/我的家
```

Use collection/resource nesting: characters live below their Space; management and prompt editing are sub-resources of the entity they edit. React Router may register these dynamic segments as `:spaceRef`, `:characterRef`, `:routeRef`, and `:ownerRef`, but every newly generated canonical value must be the bare 11-character public ID. For example: `/空间/sbprKxgBpl4`.

## Public ID

- The public ID itself is the canonical reference and matches `[A-Za-z0-9_-]{11}`. Do not add `~` or another prefix to canonical URLs.
- Public ID input uses UTF-8 FNV-1a 64-bit over a namespaced stable identity:
  - `space:{spaceId}`
  - `character:{spaceId}:{characterId}`
  - `clue-hunt:{routeId}`
  - `owner:{ownerId}`
- Serialize the unsigned 64-bit hash as exactly 8 big-endian bytes, encode those bytes with URL-safe base64, and remove `=` padding. The result is exactly 11 characters.
- A display name is never part of the canonical reference. Renaming an entity does not change its code.
- Keep the hash value in `bigint` or byte/string form in JavaScript; never convert it to `Number`.
- On multiple matches, fail closed. Do not guess.

## Link generation

- Use `apps/web/app/lib/web-routes.ts` for page constants and entity paths.
- Backend-generated share and clue-node links must use the matching Python helper.
- Do not concatenate `/空间/`, `/space/`, `/tavern/`, or `/npc/` in components.
- Owner-authored names may contain Latin characters; the platform does not translate owner content. Display names and internal English IDs must never appear in canonical page paths.

## Compatibility

Legacy `~{11-character-public-id}`, `{readable-name}~{20-digit-decimal-code}` references, and English paths are read-only compatibility aliases. Convert the decimal unsigned 64-bit value directly to the equivalent 8-byte big-endian base64url public ID; the readable prefix never decides identity.

Compatibility aliases must use an HTTP 308 redirect when handled by the server, or a replace redirect when normalized inside the SPA. Preserve query/hash data where safe, and never render a parallel page implementation. New links, share URLs, and redirect targets must emit only canonical bare-public-ID paths.

FastAPI endpoints remain English and resource-oriented under `/api/v1/*`. API management writes continue to use internal IDs even when the corresponding page URL uses a public short code.

Unknown paths render the router's normal not-found state; they must not silently redirect to the homepage.

## Verification

- Run frontend typecheck and build.
- Check canonical and legacy paths in a real browser; the SPA server returning HTTP 200 is not proof of a valid route.
- Assert final URL, absence of `404 Not Found`, no page/console errors, and no narrow-screen horizontal overflow.
