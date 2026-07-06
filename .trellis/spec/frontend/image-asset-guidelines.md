# Image Asset Guidelines

Concise rules for project image assets.

## Scope

Read when adding, replacing, compressing, deleting, or referencing image assets.

## Placement

- Deliverable images must live inside the repo, e.g. `apps/web/public/...`, `apps/web/app/assets/...`, or `artifacts/...`.
- Do not ship references to `.codex/generated_images`, temp folders, or chat-only previews.
- Generated NPC art follows `npc-art-guidelines.md` sidecar rules.

## Compression/deletion

- Prefer web-sized PNG/JPEG/WebP appropriate to usage.
- Delete stale assets only after checking references.
- Update manifests/imports when deleting or replacing files.
- Do not keep duplicate `2x`/backup/reference slices unless currently used.

## Owner reference images

- Treat owner-provided design drafts as reference, but avoid blanket `1:1` claims unless there is fresh evidence.
- Do not store large historical screenshots in Trellis as permanent context.
- Keep only final reusable assets in project asset paths.

## Verification

Use proportional checks:

- Reference check: search/import manifest usage.
- File check: path exists, size/format reasonable.
- Frontend build when code imports the asset.
- Browser screenshots only for visual acceptance tasks.

## Anti-patterns

- Reporting “replaced” while old asset is still imported.
- Keeping temporary generation outputs as deliverables.
- Adding huge screenshot evidence to `.trellis/tasks`.
- Adding brittle exact-visual checks instead of checking asset existence/reference.
