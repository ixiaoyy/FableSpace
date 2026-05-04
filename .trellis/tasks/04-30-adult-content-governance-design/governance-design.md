# Adult Content Governance Design

## Completion decision

This task is completed as a governance boundary design, not as an adult-content product implementation. FableMap's MVP continues to ship no adult-content space, no adult role template, and no default adult interaction mode.

## Existing evidence inspected

- `docs/WHAT_NOT_TO_BUILD.md`: platform must not bypass owner confirmation, become unbounded visitor social, or control content publication.
- `docs/PRODUCT_BRIEF.md`: owner-authored content and owner confirmation remain the authority for taverns/NPCs.
- `docs/ARCHITECTURE.md`: preview layers are deterministic/proposal layers and must not write owner canon automatically.
- `docs/WORLD_SCHEMA.md`: no adult-content schema exists and no field is added here.
- `.trellis/spec/frontend/character-prompt-risk-linter.md` and `frontend/app/product/characterPromptRiskLinter.js`: current guardrail blocks forced/minor/adult-risk prompt patterns before owner save/import.

## Non-negotiable future gates

A future adult-space proposal must not proceed beyond design unless all of these are explicitly specified and approved:

1. Age declaration and jurisdiction/compliance review owned outside this code task.
2. Explicit owner opt-in per tavern; never enabled by default.
3. Visitor entry gate, clear content labeling, and a one-click exit/hide path.
4. Consent boundaries in owner-facing editor and runtime prompt guardrails.
5. No minors, coercion, harassment, forced intimacy, blackmail, or non-consensual dynamics.
6. Moderation/reporting path and owner takedown workflow before public availability.
7. Data retention/deletion policy for reports and content labels.
8. Tests proving labels are not discovery bait and are never generated/applied by AI without owner confirmation.

## MVP decision

- Do not add schema fields, routes, UI, seed content, or runtime behavior now.
- Keep existing prompt-risk linting as the only active guardrail for this slice.
- If a future task is opened, start from a separate PRD with legal/compliance input and explicit user approval.

## Verification

Docs-only completion. Verified by inspecting the files above and recording this design artifact. No build/test command is required because no runtime code or schema changed.
