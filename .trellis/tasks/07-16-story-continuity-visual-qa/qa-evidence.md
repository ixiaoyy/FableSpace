# Story continuity QA evidence

Recorded: 2026-07-16

## Verdicts

| Area | Verdict | Evidence |
| --- | --- | --- |
| Six-character differentiation | PASS (offline rules) | `verify_continuity.py` runs the same male/female beggar opening against both characters in every Space and asserts that each pair returns different stance/offer copy. |
| Three-turn progression | PASS (offline rules) | One three-turn sequence per Space asserts that the first two replies contain a concrete world clue or consequence marker. |
| Refusal/lie/cross-world containment | PASS (offline rules) | The matrix includes a phone/police power claim, a false “already drank the medicine” claim, and a money-can-erase-fault claim; replies do not grant those claims as canon. |
| Revisit continuity | PASS (rules + storage contract) | A revisit greeting with a confirmed private cue differs from `first_mes`, names the cue, and says to continue. Visitor identity, visit count, relationship, and private memory survive reopening the JSON store. |
| Real LLM | BLOCKED | All three launch seeds intentionally use the local `rules` backend; no configured real-LLM run exists in this environment. Rules evidence is not presented as LLM evidence. |
| Identity-to-chat route | PASS (static contract) | Home gates on explicit identity; detail resolves a concrete character; chat CTA builds a character-targeted Space URL; Space redirects missing identity to home. |
| Responsive contract | PASS (static/build only) | Changed visitor surfaces use narrow-first widths, `overflow-x-hidden`, full-width mobile actions, and `sm`/`lg`/`xl` layout transitions. No browser visual PASS is claimed. |
| Portrait loading | PASS (import/build contract) | Six launch appearance IDs resolve through active scholar/spirit/merchant archetypes, and the production build emitted all imported fallback assets. Role fit remains a human visual judgment. |

## Fresh commands

- `PYTHONPATH=apps/api/src py -3 .trellis/tasks/07-16-story-continuity-visual-qa/verify_continuity.py` — PASS (`story-continuity-contract-ok`).
- `py -3 -m compileall -q apps/api/src` — PASS.
- `npm --prefix .\apps\web run typecheck` — PASS after the final frontend edits.
- `npm --prefix .\apps\web run build` — PASS after the final frontend edits.
- `npx -y react-doctor@latest apps/web --verbose --scope changed` — exit 0, score 76/100, 17 warnings.

React Doctor stayed at the previously recorded 76/100 with 17 warnings. The
scan did not report a regression from this task's final frontend cleanup. Its
remaining findings are broader hook/component/performance debt and were not
mixed into the story-setting change.

## Browser scope

The project requirement for Playwright self-check was removed at the user's
direction. No screenshots were captured and no claim is made about pixel-level
desktop/mobile presentation, overflow observed in a real browser, or subjective
portrait role fit.
