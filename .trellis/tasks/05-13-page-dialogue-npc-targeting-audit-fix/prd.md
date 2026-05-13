# Page dialogue NPC targeting audit and fix

## Goal

Verify and fix tavern page dialogue where selecting or mentioning an NPC makes the experience sound like a shopkeeper/proxy is passing messages instead of the visitor speaking to that NPC directly.

## Findings from page/API probe

- Browser page: `/tavern/pw_hospital_night_care` loads with public channel copy: “我会把话递给对应的人”. This reinforces a proxy-messenger mental model.
- Page interaction: clicking 青柚 correctly sets “正在对 青柚 发言” and sends `@青柚 ...`; frontend target selection is working.
- Actual page reply to `@青柚 我想找弥夏聊聊`: 青柚 replied “找人？这里是信息整理台，不是寻人处。你走错了。” This is unreasonable because 弥夏 is a co-present NPC in the same tavern.
- API probes across 弥夏/青柚/南星 show character_id targeting is correct, but prompt context does not tell the responding NPC who else is present.

## Requirements

- Public channel/system guide copy must not say “店长/我会把话递给对应的人”. It should say the message is sent to the selected/mentioned NPC.
- LLM prompt context must include a small co-present NPC roster so a selected NPC recognizes nearby characters by name/role.
- Do not change Tavern/Character persisted schema.
- Keep route/service boundaries; no direct ad hoc fetch in UI.

## Acceptance Criteria

- [x] Prompt builder can include co-present NPC names/descriptions in the system context.
- [x] Chat runtime passes tavern character roster clearly marking current NPC.
- [x] Page guide copy no longer uses proxy-messenger wording.
- [x] Focused tests verify roster prompt context and page copy.

## Verification / Grill-Me Review

Verdict: PASS with known unrelated workspace warnings.

Source of truth:
- User report: page dialogue sounded like “代为传递/把话递给”, and selected NPCs did not recognize co-present NPCs.
- Browser DOM for `/tavern/pw_hospital_night_care` after fix.
- `.trellis/spec/backend/npc-dynamic-responses.md` co-present roster contract.

Evidence:
- Browser DOM flags after reload: direct host copy present, direct channel copy present, old proxy copy absent.
- `tests/test_tavern_prompt_blocks.py::test_prompt_builder_includes_co_present_npc_roster_for_targeted_chat` verifies prompt text includes 弥夏/青柚/南星 and the no “不认识/走错地方/代为转达” guard; `tests/test_tavern_prompt_blocks.py::test_prompt_blocks_include_co_present_roster_with_custom_blocks` verifies custom Prompt Blocks cannot drop the roster.
- `backend/tests/test_v1_runtime_features.py::test_v1_chat_prompt_includes_co_present_npc_roster` captures the v1 chat LLM prompt and verifies current vs co-present NPC markers.

Problems / risks:
1. [P2 unrelated] Full `npm --prefix .\frontend test` still fails at `homepage-dynamic-entry-test.mjs` because `frontend/app/routes/home.tsx` lacks `clientLoader`; this predates this dialogue fix.
2. [P2 existing] Dev browser console still shows hydration mismatch warnings on the tavern route; build passes and DOM renders client-side, but this is a separate hydration issue.
3. [P3 nondeterministic] Live model wording can still vary; the deterministic guarantee here is prompt context and UI copy, not one exact model answer.

Smallest safe next step:
- If the user wants live-response hardening beyond prompt context, add a post-generation continuity check for co-present NPC name mentions.



