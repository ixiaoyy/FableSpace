# 故事连续性与视觉验收

## Goal

Produce the final conversation, revisit, responsive UI, and visual consistency evidence for the six-character launch MVP.

## Requirements

- Test both gender selections with both characters in each Space using comparable openings.
- Verify at least three turns with one character per Space and prove concrete story progression.
- Verify refusal, a truthful clue, a lie, and a cross-world power claim do not break character knowledge or Space canon.
- Verify a revisit retains confirmed private knowledge or relationship state without restarting the first meeting.
- Distinguish offline rules-backend evidence from real-LLM evidence.
- Check identity selection, character-first homepage, character detail, target character entry, and chat through code contracts and responsive styles.
- Browser/Playwright visual inspection is optional and is not a delivery prerequisite.
- Confirm all six launch characters resolve to non-broken portrait imports before old assets are deleted.

## Acceptance Criteria

- [x] Each character pair produces different stance, language, and offers for the same visitor identity in the offline rules matrix.
- [x] Three-turn samples show a clue, consequence, or explicit choice within the first two replies in every Space.
- [x] Revisit evidence does not repeat the initial introduction after a fact has been confirmed.
- [x] Rules fallback tests pass and real-LLM Verdict is explicitly BLOCKED because no launch seed configures a real LLM.
- [x] Responsive route/style contracts and imported portrait fallbacks are checked; no browser visual PASS is required or claimed.
- [x] Frontend typecheck/build and changed-scope quality scan results are recorded without treating unrelated legacy warnings as regressions.

## Notes

- This child is the release gate for executable contracts. It does not rewrite product behavior to make a failed check pass without returning the issue to the owning child.
- Playwright self-check was removed from the project delivery requirements at the user's direction on 2026-07-16.
- Full evidence is recorded in `qa-evidence.md`; the executable offline matrix is `verify_continuity.py`.
