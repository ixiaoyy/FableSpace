# NPC Art Guidelines

Concise rules for NPC visual assets.

## When to read

Read for new formal NPC roles, NPC portraits, expression sprites, or space character visual payloads.

## Required asset contract

A shipped NPC should have at least one project-local visual reference:

- `avatar`, or
- `sprites.neutral`, or
- an explicit documented fallback reason.

Use repository paths, not `.codex/generated_images` or temp/chat-only paths.

## Style rules

- Fictional, stylized space/NPC art is preferred.
- Avoid unauthorized real-person likeness, celebrity face, photoreal impersonation, or copied IP.
- Keep character identity consistent across expressions.
- Do not use art to bypass owner-authored content or create platform-authored canon.

## Prompt sidecars

For AI-generated NPC art:

- Single image: keep `<image-stem>.prompt.md` beside the image.
- Expression set: keep `expression-set.prompt.md` with image paths, expressions, sizes, SHA-256, prompt type, negative constraints, style source, identity locks, and verification time.
- If original prompt is unavailable, mark sidecar as `reverse-engineered`.

## Expression semantics

Use clear expression names such as `neutral`, `happy`, `sad`, `surprised`, `thinking`, `angry`, `concerned`. Do not ship ambiguous filenames without mapping.

## Verification

Use proportional checks:

- Confirm project-local files exist.
- Confirm references in code/data point to project-local paths.
- For generated NPC sets, confirm sidecar exists and lists hashes/paths.
- Run frontend build only if loaded by frontend code.

## Do not

- Leave deliverable NPC art only in generated/temp folders.
- Claim replacement while code still references old assets.
- Add huge screenshot evidence to Trellis.
- Add brittle exact-visual checks unless protecting an actual asset contract.
