# Execution Plan

- [x] Review current candidate diffs in API contracts, services, identity helper, homepage, routes, and chat workbench.
- [x] Confirm entry, single chat, and group chat share one normalized identity contract.
- [x] Confirm private persistence happens before prompt construction.
- [x] Confirm character discovery remains balanced across Spaces and retains Space attribution.
- [x] Remove owner and legacy bypasses from the new visitor-facing route while leaving global ownership/API deletion to an explicit later scope.
- [x] Run focused backend identity prompt assertions.
- [x] Run frontend typecheck and build.
- [x] Review responsive onboarding and character-targeted entry in code; defer optional browser evidence to the final visual QA child.
- [x] Replace the single-identity promotional split layout with a two-step directory and confirmation flow that remains stable as identities grow.
- [x] Align the two-step flow to `artifacts/design-references/visitor-identity-onboarding-v2.png` while removing era labels and keeping unsupported identities preview-only.
- [x] Refine the character catalog and hero composition against `artifacts/design-references/visitor-identity-onboarding-v3.png`; retain “乞丐” as the only selectable card and keep era labels out of the UI.
- [x] Record React Doctor changed-scope findings; fix only confirmed regressions from this child.

## Verification Record

- `py -3 -m compileall -q apps/api/src` — PASS.
- Focused identity contract/prompt assertions — PASS (`identity-contract-ok`).
- `npm --prefix .\apps\web run typecheck` — PASS.
- `npm --prefix .\apps\web run build` — PASS.
- `npx -y react-doctor@latest . --verbose --scope changed` — 76/100, 17 warnings; score did not regress and one confirmed dead-state warning was removed.
- Playwright self-check is intentionally not required after the 2026-07-16 project-rule update.
- Browser visual QA through the README-supported API-served build (`http://127.0.0.1:8950/`) — **Verdict: PASS**. Desktop catalog/confirmation and fixed footer were checked; `390×844` and `360×800` had no horizontal overflow, card/footer overlap, or unreachable confirmation action. The `5173` React Router development surface dropped its critical stylesheet after hydration, so it was not used as the visual source of truth.

## Validation

```powershell
py -3 -m compileall -q apps/api/src
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
npx -y react-doctor@latest apps/web --verbose --scope changed
```

## Rollback

Remove the identity gate and request fields together, keeping existing Space navigation intact. Do not leave a client-only identity label that the backend ignores.
