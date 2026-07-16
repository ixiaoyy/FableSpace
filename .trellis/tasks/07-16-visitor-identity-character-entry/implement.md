# Execution Plan

- [x] Review current candidate diffs in API contracts, services, identity helper, homepage, routes, and chat workbench.
- [x] Confirm entry, single chat, and group chat share one normalized identity contract.
- [x] Confirm private persistence happens before prompt construction.
- [x] Confirm character discovery remains balanced across Spaces and retains Space attribution.
- [x] Remove owner and legacy bypasses from the new visitor-facing route while leaving global ownership/API deletion to an explicit later scope.
- [x] Run focused backend identity prompt assertions.
- [x] Run frontend typecheck and build.
- [x] Review responsive onboarding and character-targeted entry in code; defer optional browser evidence to the final visual QA child.
- [x] Record React Doctor changed-scope findings; fix only confirmed regressions from this child.

## Verification Record

- `py -3 -m compileall -q apps/api/src` — PASS.
- Focused identity contract/prompt assertions — PASS (`identity-contract-ok`).
- `npm --prefix .\apps\web run typecheck` — PASS.
- `npm --prefix .\apps\web run build` — PASS.
- `npx -y react-doctor@latest . --verbose --scope changed` — 76/100, 17 warnings; score did not regress and one confirmed dead-state warning was removed.
- Playwright self-check is intentionally not required after the 2026-07-16 project-rule update.

## Validation

```powershell
py -3 -m compileall -q apps/api/src
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
npx -y react-doctor@latest apps/web --verbose --scope changed
```

## Rollback

Remove the identity gate and request fields together, keeping existing Space navigation intact. Do not leave a client-only identity label that the backend ignores.
