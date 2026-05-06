# Tavern Owner/Visitor View Separation Playwright Self Acceptance

Date: 2026-05-06

Base URL: http://127.0.0.1:5174

## Viewports

- Desktop: 1440 x 1000
- Mobile/narrow: 390 x 920

## Assertions

- Visitor route `/tavern/:id` loads the SillyTavern-style chat workbench.
- Visitor route shows the chat composer and folded public tools.
- Visitor route has no `data-owner-only-panel`, no `店主角色控制台`, and no `店主管理` entry.
- Owner route `/tavern/:id/manage?owner_id=<owner>` loads `data-tavern-owner-management="dedicated-route"`.
- Owner route renders owner management panels and does not render the chat workbench or composer.
- Desktop and mobile routes have no obvious horizontal overflow.

## Screenshots

- `D:\work\ai-\.trellis\tasks\05-06-tavern-owner-visitor-view-separation\artifacts\playwright\desktop-visitor-chat-only.png`
- `D:\work\ai-\.trellis\tasks\05-06-tavern-owner-visitor-view-separation\artifacts\playwright\desktop-owner-management-only.png`
- `D:\work\ai-\.trellis\tasks\05-06-tavern-owner-visitor-view-separation\artifacts\playwright\mobile-visitor-chat-only.png`
- `D:\work\ai-\.trellis\tasks\05-06-tavern-owner-visitor-view-separation\artifacts\playwright\mobile-owner-management-only.png`

## Console errors

- None captured during checked pages.

## Limits

- Chromium only.
- API calls are fulfilled with Playwright route fixtures; this is a frontend visual self-acceptance pass and does not exercise the backend.
- Screenshots are saved as task artifacts, not product image assets.
