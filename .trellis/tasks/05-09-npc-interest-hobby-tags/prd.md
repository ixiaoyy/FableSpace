# Brainstorm: NPC Interest and Hobby Tags

## 1. Goal
Enhance NPC personalities and conversation depth by adding "Interest and Hobby" tags. These tags will be selectable by the Tavern Owner and dynamically injected into the AI's system prompt to influence its knowledge base and conversation style.

## 2. Curated Tag List (Proposal)
We should provide a curated list to ensure high-quality AI responses, while still allowing free-form tags if needed.

| Category | Suggested Tags |
| :--- | :--- |
| **Arts & Culture** | Retro Gaming, Vinyl Records, Local Folklore, Mixology, Calligraphy, Street Photography, Sci-Fi Cinema, Cyberpunk Literature |
| **Lifestyle & Craft** | Gardening, Gourmet Cooking, Knitting, Pottery, Sustainable Living, Tea Ceremony, Coffee Brewing, Bonsai |
| **Activity & Nature** | Urban Exploration, Star Gazing, Hiking, Bird Watching, Cycling, Foraging, Geocaching |
| **Intellectual** | Astrology, Crypto-zoology, Ancient Languages, Mathematics, Paranormal Research, Quantum Physics (Simplified) |

## 3. Technical Design

### A. Data Model (Backend)
- **File**: `backend/src/fablemap_api/core/tavern.py`
- **Class**: `TavernCharacter`
- **Change**: Add `hobbies: list[str] = field(default_factory=list)`.

### B. Prompt Injection
- **File**: `backend/src/fablemap_api/core/prompt_builder.py`
- **Change**: Update `PromptBuildConfig` to include `char_hobbies`.
- **Logic**: In `PromptBuilder.build`, add a section:
  ```text
  【兴趣与偏好】
  该角色对以下领域有深厚兴趣：{hobbies}。
  在对话中，角色可以根据这些兴趣点展开话题、分享见解或以此作为比喻。
  ```

### C. UI Integration (Frontend)
- **Character Editor**: `frontend/app/product/CharacterEditor.jsx`
  - Add a "Hobbies & Interests" section.
  - Use a Chip/Badge input component.
  - Provide auto-suggestions from the curated list.
- **Chat View**: `frontend/app/product/TavernChatRoom.jsx`
  - Show hobby badges in the "Character Sidebar".
  - (Optional) Show a small icon/indicator in the chat header when a hobby is relevant.

## 4. Verification Plan
1.  **Backend Unit Tests**: Verify `TavernCharacter` serialization/deserialization with `hobbies`.
2.  **Prompt Logic Test**: Use `test_world_info_payload` or a similar tool to verify the hobby section appears in the final prompt.
3.  **Frontend Build**: Run `npm run build` to ensure no UI regressions.
4.  **Manual Chat Test**: Create an NPC with "Retro Gaming" hobby and verify they can talk about it.

## 5. Questions for User
1. Should we restrict hobbies to the curated list, or allow users to type anything (free-form)?
2. Do we want specific icons for each hobby (e.g., a controller for "Retro Gaming")?
3. Should hobbies influence WorldInfo retrieval (e.g., if a user mentions "Game Boy", a "Retro Gaming" NPC gets a boost in relevant knowledge)?
