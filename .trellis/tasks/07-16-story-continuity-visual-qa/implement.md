# Execution Plan

- [x] Verify the JSON-backed seed/runtime contract without starting browser automation.
- [x] Review the identity -> character -> Space -> chat route contract.
- [x] Review narrow/mobile layout rules in the changed UI scope.
- [x] Run the conversation matrix against offline rules and record its limited scope.
- [x] Record real LLM as BLOCKED because all three launch seeds use `rules`; do not substitute offline results.
- [x] Verify revisit state and private identity persistence.
- [x] Verify all six character portrait fallbacks resolve to imported assets; role fit remains a human visual judgment.
- [x] Record final typecheck/build and changed-scope React Doctor results.
- [x] Write PASS/BLOCKED evidence into `qa-evidence.md`.

## Validation

```powershell
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
npx -y react-doctor@latest apps/web --verbose --scope changed
py -3 -m compileall -q apps/api/src
```

## Known Environment Risk

Previous browser attempts reached a local fallback error instead of loading public Space data. Browser automation is no longer required; do not repeatedly restart services for screenshot evidence.
