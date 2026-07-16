# 迁移项目图片到对象存储

## Goal

Make every production-facing FableSpace image load from the configured object-storage CDN through an explicit URL contract, instead of relying on images served from the application container or unresolved repository-relative paths.

## Requirements

- Inventory every Git-tracked raster and vector image and classify it as production runtime media or removable non-production material.
- Production-facing images must resolve to HTTPS object-storage/CDN URLs in deployed builds.
- Reuse the existing S3-compatible bucket and `CDN_BASE_URL` deployment contract; do not add another storage provider or commit credentials.
- Preserve release isolation, immutable caching, and a rollback path while changing asset resolution.
- Remove offline sample/reference image inputs and the code/configuration paths that exist only to support them; this project must not retain an offline sample asset mode.
- Remove obsolete demonstration terminology from project-owned directories, filenames, configuration keys, commands, functions, UI copy, and maintained documentation. Rename genuinely production-owned concepts to their precise business meaning; delete concepts that exist only for demonstration rather than replacing them with another vague synonym.
- Local development must use the same URL-based production media contract rather than bundled image fallbacks.
- Update code, seed data, public manifests, compatibility normalizers, and deployment sync coverage for every production image path that currently bypasses the CDN.
- Keep generated/private runtime files out of the public CDN, as required by `docs/DEPLOYMENT.md`.
- Update `docs/IMAGE_ASSETS_SPEC.md`, `docs/DEPLOYMENT.md`, and relevant examples to reflect the final source-of-truth and URL rules.
- In visitor identity onboarding, add the `古代` tag to `乞丐` and `太监`.
- In visitor identity onboarding, classify `萝卜精` and `小奶狗` under the `幻想` filter while retaining `奇幻生物` as their card-level subtype label.
- For every preview-only identity card, place a larger lock indicator in the visual center, cover the full card with a translucent unavailable-state overlay, and reduce the base artwork opacity without making the identity unrecognizable.

## Acceptance Criteria

- [ ] The inventory accounts for all 406 initially tracked images plus 24 ignored project artifacts: 358 migrate to object storage and 72 offline-only inputs are deleted.
- [ ] No production UI or active seed path depends on site-local `/assets/...` image delivery when a CDN base is configured.
- [ ] Vite-imported assets, public runtime assets, CSS image URLs, seed/template image paths, and active compatibility fallbacks all resolve through the same documented CDN contract.
- [ ] The deployment workflow uploads every object referenced by that contract and verifies at least one migrated non-bundled runtime image through the public CDN domain before deployment proceeds.
- [ ] Local development and self-hosted builds use the documented URL-based media contract and do not require bundled/offline image fallbacks.
- [ ] No offline sample/reference image directory or image-only offline fallback remains in active code or configuration.
- [ ] A case-insensitive repository scan has no obsolete demonstration naming in active code, configuration, scripts, UI copy, or maintained documentation.
- [ ] Private generated files remain local in the ParallelLines-linked deployment and are not made public.
- [ ] The identity catalog displays `古代` for `乞丐` and `太监`; the `幻想` filter includes both `萝卜精` and `小奶狗`.
- [ ] Preview-only identity cards use a full-card translucent overlay, a clearly centered larger lock, and visibly muted artwork while selectable cards remain visually unaffected.
- [ ] Frontend typecheck and production build pass, and a repository scan finds no unexplained production image references outside the final URL helpers/contracts.

## Notes

- Current evidence: 406 images were tracked at planning time and 24 ignored audit/reference images also existed inside the workspace. The migration set contains 358 images; 72 offline-only backend inputs are removed.
- Local checkout currently has no S3/R2 CLI, no matching credential environment variables, and no `gh` CLI. Production bucket credentials exist only as GitHub Actions secrets according to repository documentation, so direct local upload is not currently available.
- User decision: the project does not need any offline sample mode. Production and retained reference images migrate to CDN URLs; inputs used only by the removed offline path are deleted. The authoritative image policy must be revised accordingly.
