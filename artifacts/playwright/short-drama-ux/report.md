# Short Drama UX Playwright Self Acceptance

Date: 2026-05-04

Base URL: http://127.0.0.1:5173

## Assertions

- Desktop and mobile/narrow viewport can render the discover page.
- Published short-drama gameplay produces a visible `短剧入口卡`.
- Draft short-drama gameplay is ignored by the discover teaser fixture.
- Guardrail copy is visible: `店主已发布的玩法承接`.
- CTA is visible: `开始轻推理`.
- Search for `轻推理` keeps the short-drama teaser visible in card results.

## Screenshots

- `D:\work\ai-\artifacts\playwright\short-drama-ux\desktop-discover-short-drama.png`
- `D:\work\ai-\artifacts\playwright\short-drama-ux\desktop-discover-search-short-drama.png`
- `D:\work\ai-\artifacts\playwright\short-drama-ux\mobile-discover-short-drama.png`
- `D:\work\ai-\artifacts\playwright\short-drama-ux\mobile-discover-search-short-drama.png`

## Limits

- This is a front-end Playwright check with API route fixtures; it does not start or write to the backend.
- Native `/discover` is browser-verified. Product compatibility components such as `TavernEntryPanel` and `GameplayManager` remain covered by script-level tests because they are not directly exposed by the current React Router routes.
- Chromium only; Firefox/WebKit are out of scope for this task.
