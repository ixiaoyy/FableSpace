# Refine NPC Personality and Vividness

## Goal
Improve the NPC response quality in FableMap to make them feel more vivid, human-like, and distinct in personality. Address the feedback that NPC replies feel "robotic".

## Requirements
- Enhance the system prompt/voice contract to encourage natural conversation.
- Integrate more "vivid" elements: sensory details, actions (using asterisks), and emotional resonance.
- Avoid repetitive or robotic response structures (e.g., "I am [NPC]", "As an AI...").
- Ensure the character's unique traits (personality, hobbies, tags) are more evident in their speech.
- Maintain compatibility with existing character cards and owner sovereignty.

## Acceptance Criteria
- [ ] System prompt/voice contract in `npc_voice.py` or `prompt_builder.py` is updated with "vividness" instructions.
- [ ] NPCs consistently use actions or sensory descriptions when appropriate.
- [ ] Response templates (if any) are reviewed and de-robotized.
- [ ] Test cases or manual validation shows a noticeable improvement in "human-feel".
- [ ] No regression in core NPC functionality (still responds as the correct character, uses correct knowledge).

## Technical Notes
- Target files: `backend/src/fablemap_api/core/npc_voice.py`, `backend/src/fablemap_api/core/prompt_builder.py`.
- Consider adding a "Vividness" block or instruction set to the default prompt builder.
- Ensure instructions work across different models (DeepSeek, etc.).
