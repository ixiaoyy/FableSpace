# 三世界六角色内容种子

## Goal

Ship three original, story-directed system Spaces with exactly two clear launch characters in each Space.

## Requirements

- Palace: a powerful chief eunuch and a spoiled, willful princess.
- Supernatural: a fox spirit cultivated into human form and the scholar who once saved her.
- Campus: a dedicated gentle female teacher and a lawless rich male student.
- Each Space has a real coordinate anchor, public premise, current incident, stable rules, visitor hook, relationship definition, clue set, and one lightweight chapter gameplay.
- Each character card includes public identity, decision style, current situation, desire, concealed secret, fate pressure, visitor stance, opening, and example dialogue.
- Character reactions to the ancient beggar differ inside each pair and remain grounded in the Space's era.
- Offline rules provide a finite, honest fallback; they must not be presented as equivalent to an open-ended LLM.
- Content is original and avoids protected IP imitation.

## Acceptance Criteria

- [x] `default_public_welfare_spaces()` returns exactly three public Spaces and six characters.
- [x] Every Space has exactly two characters, six WorldInfo entries, and one published gameplay definition.
- [x] Launch IDs and public names match the parent design.
- [x] Every character system prompt contains motive, secret, fate pressure, and progression rules.
- [x] Asking `怎么玩` produces a Space-specific offline fallback in all three Spaces.
- [x] The same visitor opening receives distinguishable responses from both characters in each pair under a real LLM, or the LLM check is explicitly BLOCKED.
- [x] Python compile and focused content construction assertions pass.

## Notes

- Initial character names in the candidate implementation are 魏观海, 萧明珠, 绯月, 宁怀书, 沈清禾, and 顾野.
