# Technical Design

## Media contract

- Canonical production origin: `https://img.pingxingxian.space`.
- Canonical immutable media namespace: `/fablespace/media/v1/`.
- Frontend configuration: `VITE_MEDIA_BASE_URL`, defaulting to the canonical namespace so local development uses URLs too.
- Backend configuration: `FABLESPACE_MEDIA_BASE_URL`, with the same default.
- Frontend helper accepts logical media keys and legacy site-local paths, preserves already absolute/data/blob URLs, and returns a normalized HTTPS media URL.
- Backend helper emits absolute URLs for project-owned public media fields.

## Object-key layout

Tracked Web images migrate without filename rewriting:

- `apps/web/app/assets/**` -> `app/assets/**`
- `apps/web/app/product/assets/**` -> `app/product/assets/**`
- `apps/web/public/**` -> `public/**`

The versioned namespace makes these objects immutable. Replacements use a new namespace version rather than overwriting cached objects.

## Migration and deletion

1. Generate `deploy/cdn/media-manifest.json` with source path, object key, URL, SHA-256, byte size, and disposition for all tracked images.
2. Replace active Vite imports and site-local image strings with the media URL helpers.
3. Remove offline-only backend image packs and all offline sample code paths.
4. Add a temporary CI migration step that uploads every manifest `migrate` source to `media/v1`, then verifies representative public and imported assets through the CDN.
5. Push and wait for the migration workflow to succeed.
6. Delete migrated binary sources from Git and remove the temporary upload-from-repository step; retain the manifest and URL-only runtime contract.

## Compatibility

- Existing persisted `https://`, `data:`, `blob:`, and generated `/generated/` values remain unchanged.
- Existing persisted `/assets/...`, `/place-atmosphere...`, and legacy public-welfare sprite paths are translated to `media/v1/public/...` in the frontend compatibility layer.
- Private generated files remain under `/generated/` and are never mapped to the public media namespace.
- Public API fields created by current code use absolute media URLs; no schema field type changes are required because the fields are already strings.

## Identity catalog changes

- `乞丐` and `太监` receive card tag `古代`.
- `萝卜精` and `小奶狗` use filter category `fantasy` while retaining card subtype label `奇幻生物`.
- Locked cards use muted artwork plus a full-card translucent overlay and centered enlarged lock.

## Rollback

- Before binary deletion, rollback is a normal commit revert.
- After stable media upload, the immutable `media/v1` objects remain available even if code is reverted.
- Never use `aws s3 sync --delete` against the stable media namespace.
