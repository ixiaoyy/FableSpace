# Shared Tavern Space Homepage Layout

## Goal

Reconstruct the shared `/tavern/:tavernId` space homepage layout from `图片参考/空间主页/image.png` so `continuity-tavern`, `engagement-demo`, and every other tavern route use the same structure.

## Scope

- Replace the single-route visual shell with a shared homepage composition in `frontend/app/routes/tavern.tsx`.
- Preserve the existing tavern entry data contract and the existing chat workbench.
- Derive activity, story entry, resident character, and memory sections only from public entry-view fields.
- Keep CTA links anchored to the existing `#tavern-mainline` workbench instead of creating new persistence behavior.

## Out Of Scope

- No backend API changes.
- No schema changes.
- No platform-generated space content workflow.
- No token/payment/social feature changes.

## Validation

- `npm --prefix .\frontend run typecheck` passed.
- `npm --prefix .\frontend run build` passed.
- Browser visual QA is recorded separately in `design-qa.md` when available.