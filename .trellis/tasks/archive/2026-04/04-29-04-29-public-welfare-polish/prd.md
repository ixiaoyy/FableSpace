# Public Welfare Tavern Art and Content Polish

## Goal
Upgrade the newly added 10 public-welfare NPCs from temporary basic PNGs to polished tavern-themed character portraits, and deepen the 8 default public-welfare taverns so each 3+ NPC cast has clearer division of labor through world info and gameplay entry points.

## Requirements

### Art upgrade
- Replace the 10 newly added NPC placeholder/basic PNG sets under `frontend/public/assets/npcs/`:
  - `char_pw_luming`
  - `char_pw_qiaoqiao`
  - `char_pw_yeyu`
  - `char_pw_dengxin`
  - `char_pw_qiaoshou`
  - `char_pw_shiyi`
  - `char_pw_suoyin`
  - `char_pw_huoyan`
  - `char_pw_xingdai`
  - `char_pw_tongling`
- Keep existing file paths and URL contracts stable: `/assets/npcs/<char_id>-<expression>.png`.
- Each NPC must retain 5 expression files: `neutral`, `joy`, `anger`, `embarrassment`, `curiosity`.
- Images must be project-local deliverables, not only chat previews or `.codex/generated_images` files.
- Visual style: polished original anime/game-style tavern NPC portraits; bust/waist-up; visible tavern props/background; no IP imitation, logos, watermarks, placeholders, or abstract icons.

### Content polish
- Keep existing Tavern schema/API unchanged.
- Keep all default public-welfare taverns platform-owned, public, rules-backend, no API key.
- Add or revise world info so every tavern clearly explains the 3+ NPC division of labor.
- Add or revise gameplay definitions where useful so every tavern has a clear entry point that can naturally involve one of its NPC roles.
- Avoid forbidden product directions: no combat/level/equipment/ranking, no platform-generated user taverns, no visitor-to-visitor social graph, no sensitive-data collection.

## Proposed Design

### Approach
Use a two-track polish in one Trellis task:

1. **Asset replacement track**
   - Generate/prepare polished art for the 10 new NPCs.
   - Overwrite the existing `frontend/public/assets/npcs/char_pw_*-<expression>.png` paths so backend seed references do not change.
   - Verify every referenced file exists and is PNG.

2. **Seed content track**
   - Update `backend/src/fablemap_api/core/default_taverns.py` only in seed text/data sections.
   - Add per-tavern world info entries such as “NPC 分工 / 今日入口 / 安全边界”.
   - Add or adjust gameplay entries only as content payloads, not schema changes.
   - Update focused tests in `tests/test_default_public_welfare_taverns.py` and `tests/test_default_public_welfare_gameplays.py` to assert:
     - each tavern still has at least 3 NPCs;
     - each tavern includes role-division world info;
     - focused gameplay keywords remain discoverable;
     - image assets are valid PNGs.

## Acceptance Criteria
- [ ] The 10 new NPCs no longer use temporary/basic generated portraits.
- [ ] Each of the 10 new NPCs has 5 polished project-local PNG expression assets at the existing paths.
- [ ] Each of the 8 public-welfare taverns has at least one explicit NPC-division world-info entry.
- [ ] Gameplay entry points are clearer and remain safe, low-risk tavern text interactions.
- [ ] No Tavern schema/API fields are added or changed.
- [ ] Focused pytest passes.
- [ ] Backend compile check passes.
- [ ] Frontend build passes.

## Verification Plan
```powershell
C:\Users\phpxi\miniconda3\python.exe -m pytest -q --tb=short tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py
C:\Users\phpxi\miniconda3\python.exe -m compileall -q backend/src
npm --prefix .\frontend run build
```

## Relevant Specs
- `.trellis/spec/frontend/image-asset-guidelines.md`: project-local image placement and generated-image audit.
- `.trellis/spec/frontend/npc-art-guidelines.md`: formal NPC art completion and expression asset contract.
- `.trellis/spec/backend/quality-guidelines.md`: default seed tests and backend verification.
- `.trellis/spec/guides/cross-layer-thinking-guide.md`: seed payload → asset URL → frontend public asset boundary.
