# brainstorm: npc-personality-optimization

## Goal
Test and optimize NPC conversational ability to ensure distinct personality, vividness (actions/sensory details), and human-like interaction. Provide a scoring system for evaluation.

## What I already know
- FableMap uses a 6-layer prompt structure defined in `prompt_builder.py`.
- `npc_voice.py` contains the "voice contract" which enforces vividness and personality.
- Current instructions include sensory details in asterisks, avoiding repetitive greetings, and emotional resonance.
- We have diverse default characters in `default_taverns.py`.

## Requirements
- NPC responses must not feel like a "generic AI assistant."
- Responses should include 1-3 sentences with natural action/sensory descriptions.
- The voice must remain consistent with the character's traits and hobbies.
- A scoring system (1-10) must be provided for evaluation.

## Acceptance Criteria
- [x] 3 distinct NPC test cases created (Plain, Empathetic, Absurd).
- [x] Full system prompts for these NPCs are audited.
- [x] Sample interactions are generated and scored.
- [i] **Findings**: Current contract enforces asterisk format and character perspective well. "Plain" NPCs (no contract) fall back to parentheses and generic "AI Assistant" tone.
- [ ] Improvements are proposed and implemented in `npc_voice_contract`.
- [ ] Final "human-likeness" score shows improvement over baseline.

## Technical Approach
1. **Scripted Prompt Generation**: Create a test script to dump the exact prompts sent to the LLM.
2. **Evaluator Role**: Use the AI assistant's persona to evaluate the generated prompts.
3. **Prompt Refinement**: Inject "Micro-behaviors" and "Negative Constraints" into the voice contract to prevent common AI patterns (e.g., "I'm here to help").

## Technical Notes
- Relevant files: `backend/src/fablemap_api/core/npc_voice.py`, `backend/src/fablemap_api/core/prompt_builder.py`.
- Existing voice contract is in `build_npc_voice_contract`.
