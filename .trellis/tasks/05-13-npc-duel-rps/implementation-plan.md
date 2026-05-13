# Implementation Plan / Claim — NPC Duel v0 RPS

## Claim

- Module / area: frontend tavern mini-game surface (`frontend/app/product/`, native tavern chat workbench route, frontend scripts).
- Owner: lijin / Codex session.
- Change type: frontend feature slice + regression/self-acceptance scripts.
- Target: add a tavern-local, session-local NPC rock-paper-scissors duel with deterministic local rule resolution.
- Status: in_progress — implementation exists in working tree; this session is validating and closing the Trellis record.

## Allowed modification scope

- `frontend/app/product/tavernMiniGames.js`
- `frontend/app/product/TavernMiniGamePanel.jsx`
- `frontend/app/product/tavernMiniGames.css`
- `frontend/app/product/TavernChatRoom.jsx`
- `frontend/app/features/tavern-chat-workbench/index.tsx`
- `frontend/scripts/mini-games-test.mjs`
- `frontend/scripts/playwright-npc-rps-check.mjs`
- `.trellis/tasks/05-13-npc-duel-rps/*`

## Explicit non-scope

- No backend API, database, schema, persistence, ranking, matchmaking, PVP, rewards, economy, levels, equipment, or cross-space social features.
- No platform-authored NPC/story content beyond local UI copy for the selected tavern/NPC interaction.
- No dependency upgrades or new large UI/game libraries.

## Basis documents

- `AGENTS.md`
- `README.md`
- `docs/PRODUCT_BRIEF.md`
- `docs/FABLEMAP_TAVERN_PLATFORM.md`
- `docs/ARCHITECTURE.md`
- `docs/WORLD_SCHEMA.md`
- `docs/WHAT_NOT_TO_BUILD.md`
- `docs/AI参与开发协议.md`
- `.trellis/workflow.md`
- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/component-guidelines.md`
- `.trellis/spec/frontend/state-management.md`
- `.trellis/spec/frontend/type-safety.md`
- `.trellis/spec/frontend/quality-guidelines.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`

## Expected outputs

- RPS template with `family-friendly` tag and explicit non-ranking boundary.
- Pure helper functions for move validation, NPC move selection, result matrix, and state transition.
- Mobile-safe panel UI showing player move, NPC move, score, and NPC line.
- Existing prompt-based mini-game start flow remains intact for non-duel templates.
- Regression test coverage and Playwright desktop/mobile self-acceptance evidence.

## Verification plan

- `npm --prefix .\frontend test`
- `npm --prefix .\frontend run typecheck`
- `npm --prefix .\frontend run build`
- `node .\frontend\scripts\playwright-npc-rps-check.mjs`

## 2026-05-13 session notes

- Trellis context initialized with `implement.jsonl`, `check.jsonl`, and `debug.jsonl`.
- Auto-injected stale `.claude/commands/trellis/*.md` context entries were replaced with existing `.agents/skills/check` and `.agents/skills/finish-work` skill docs; `task.py validate` now passes.

## Check / Grill-Me closeout — 2026-05-13

Verdict: PASS.

Source of truth:
- `prd.md` acceptance criteria.
- `docs/WHAT_NOT_TO_BUILD.md` boundaries: no battle system, ranking, levels/equipment, platform economy, matchmaking, or cross-space social.
- Frontend specs for component structure, local state, runtime validation, and build/test requirements.

Evidence:
- `npm --prefix .\frontend test` — PASS.
- `npm --prefix .\frontend run typecheck` — PASS.
- `npm --prefix .\frontend run build` — PASS.
- `node .\frontend\scripts\playwright-npc-rps-check.mjs` with `FABLEMAP_PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174` — PASS.
- Playwright artifacts: `artifacts/playwright/npc-duel-rps/report.md`, `desktop-1440.png`, `mobile-390.png`.
- `git diff --check` — PASS except Git line-ending warnings.

Problems:
1. [P3] Port `5173` was already occupied and returned `502 Bad Gateway`; validation used local dev server port `5174` instead.

Smallest safe next step:
- Human visual review / commit / record session. Do not broaden this task into deferred parent work.

