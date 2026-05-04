# Revisit-care Proactive Notification Design

## Goal

把“主动回访关怀 / 通知调度”的风险先收敛成一个前端可验证的 preview-only 设计边界：默认不触达访客，必须满足 opt-in、quiet hours、rate limit、unsubscribe，并明确当前不启用真实主动通知调度、不新增 schema/API。

## Source Planning

* Parent task: archived source `.trellis/tasks/archive/2026-04/npc-role-prompt-safety-brainstorm/`
* Source note: revisit-care deferred not done
* Claimed for implementation: 2026-05-04 by `lijin`.

## Requirements

* 默认不主动打扰访客。
* 必须有 opt-in、quiet hours、rate limit、unsubscribe。
* 不做营销推送或社交网络提醒。
* 当前只做前端策略/设计预览；不发送通知、不保存订阅设置、不扩展后端调度。
* 与 `docs/ARCHITECTURE.md` / `docs/WORLD_SCHEMA.md` 保持一致：`revisit-care` 主动通知不属于当前 schema/API 版本。

## Acceptance Criteria

* [x] Relevant existing code/docs are inspected before implementation.
* [x] MVP scope is confirmed against `docs/WHAT_NOT_TO_BUILD.md` and owner-sovereignty rules.
* [x] Implementation uses existing schema/API only; no contract/schema/API change required.
* [x] Policy helper blocks missing opt-in, unsubscribe, quiet hours, weekly cap, minimum interval, non-`in_app` channels, marketing/social triggers, and auto-generated content.
* [x] Notifications route shows a clear “revisit-care · 未启用设计预览” panel and says it will not send notifications or write schema.
* [x] Frontend spec captures the boundary for future work.
* [x] Desktop and mobile Playwright self-acceptance screenshots/report are generated.
* [x] Verification commands are recorded in this PRD before moving to completed.

## Research Notes

Read before implementation:

* Product/architecture/schema guardrails: `docs/WHAT_NOT_TO_BUILD.md`, `docs/ARCHITECTURE.md`, `docs/WORLD_SCHEMA.md`, `docs/PRODUCT_BRIEF.md`, `docs/FABLEMAP_TAVERN_PLATFORM.md`.
* Existing notification/revisit code: `frontend/app/lib/notification-center.js`, `frontend/app/components/NotificationCenterPanel.tsx`, `frontend/app/routes/notifications.tsx`, `frontend/app/hooks/useNotifications.ts`, `frontend/app/lib/revisit-summary.js`, `frontend/scripts/notification-center-test.mjs`.
* Frontend specs/guides: `.trellis/spec/frontend/component-guidelines.md`, `state-management.md`, `quality-guidelines.md`, `.trellis/spec/guides/code-reuse-thinking-guide.md`.

Key constraint found:

* `docs/ARCHITECTURE.md` says real `revisit-care` proactive notification is deferred because of privacy/cost control.
* `docs/WORLD_SCHEMA.md` says `revisit-care` is not part of the current schema version.

## Implementation Notes

* Added pure helper `frontend/app/lib/revisit-care-notification-policy.js`:
  * normalizes preview policy defaults;
  * evaluates candidate reminders against opt-in, quiet hours, frequency cap, unsubscribe, trigger/channel allowlist, social/marketing denial, and generated-content denial;
  * returns checklist items for UI/spec reuse.
* Added `frontend/app/components/RevisitCarePolicyPanel.tsx`:
  * local-only preview state via `useState`;
  * clearly labels the feature as `revisit-care · 未启用设计预览`;
  * explicitly states it will not send notifications or write schema;
  * provides toggles to preview opt-in, quiet-hours, and weekly cap behavior.
* Updated `frontend/app/routes/notifications.tsx` to render the policy panel below the existing notification MVP explanation.
* Added `frontend/scripts/revisit-care-notification-policy-test.mjs` and inserted it into the frontend test chain.
* Added `frontend/scripts/playwright-revisit-care-notifications-check.mjs` and `npm run test:revisit-care-ux`.
* Added `.trellis/spec/frontend/revisit-care-notification-boundary.md` and linked it from `.trellis/spec/frontend/index.md`.

## Verification

Fresh checks run on 2026-05-04:

* RED first: `node .\frontend\scripts\revisit-care-notification-policy-test.mjs` failed with `ERR_MODULE_NOT_FOUND` before `revisit-care-notification-policy.js` existed.
* PASS: `node .\frontend\scripts\revisit-care-notification-policy-test.mjs`
* PASS: `node .\frontend\scripts\notification-center-test.mjs`
* PASS: `npm --prefix .\frontend run typecheck`
* PASS: `npm --prefix .\frontend test`
* PASS: `npm --prefix .\frontend run build`
* PASS: `npm --prefix .\frontend run test:revisit-care-ux`
  * Report: `artifacts/playwright/revisit-care-notifications/report.md`
  * Desktop screenshot: `artifacts/playwright/revisit-care-notifications/desktop-revisit-care-notifications.png`
  * Mobile screenshot: `artifacts/playwright/revisit-care-notifications/mobile-revisit-care-notifications.png`
* PASS: `python .\.trellis\scripts\task.py validate .trellis\tasks\04-30-revisit-care-proactive-notification-design`

Playwright notes:

* First sandbox run failed with `spawn EPERM` while starting the local dev server; reran with approved elevated command because browser/dev-server self-acceptance requires process spawning.
* First browser run exposed a strict-mode locator ambiguity for `当前处于安静时段`; narrowed assertion to exact text and reran successfully.

## Out of Scope / Not Done

* No automatic platform publication of AI-generated tavern/NPC/story content.
* No platform token billing, recharge, settlement, or revenue-share system.
* No visitor-to-visitor social network, ranking, combat, levels, or equipment.
* No backend/API/storage/schema changes.
* No real proactive notification scheduling, push/email/SMS, subscription persistence, or delivery queue.
* No marketing push, advertising reactivation, friend-online pings, ranking reminders, or public social feed.

## Technical Notes

* Created during 2026-04-30 backlog hardening at user request: “把所有的规划全部拆成子任务，防止未来丢失”.
* Completed as a frontend-only, preview-only policy boundary on 2026-05-04.
