# Revisit-care Notifications Playwright Check

Date: 2026-05-04

## Assertions

- Notifications route renders the revisit-care policy preview.
- Preview clearly states it is not enabled and does not send notifications.
- Default state blocks touch because opt-in is missing.
- Opt-in preview allows only an in-app notification preview.
- Quiet-hours preview blocks touch again.
- Desktop and mobile/narrow screenshots were captured.

## Screenshots

- `D:\work\ai-\artifacts\playwright\revisit-care-notifications\desktop-revisit-care-notifications.png`
- `D:\work\ai-\artifacts\playwright\revisit-care-notifications\mobile-revisit-care-notifications.png`

## Limits

- This check does not require a backend notification WebSocket.
- No proactive notification scheduling, schema persistence, push, email, SMS, or marketing delivery is enabled.
