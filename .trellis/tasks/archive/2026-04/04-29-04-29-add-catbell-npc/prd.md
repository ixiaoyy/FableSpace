# Add NPC to Catbell Tavern

## Goal
在默认公益酒馆 `静安猫铃避难所` 中，为现有猫娘 `眯眯喵桑` 增加一个同馆 NPC。

## Requirements
- 新 NPC 与 `char_pw_mimi_nya` 位于同一个 Tavern：`pw_jingan_catbell_refuge`。
- 不新增或修改 TavernCharacter Schema 字段；只增加默认 seed 内容和项目内 NPC 资产引用。
- 新 NPC 必须是成年、原创、轻喜剧、安全边界明确的酒馆角色。
- 新 NPC 必须带项目内头像 / 表情资源路径，满足 formal NPC asset contract。
- 更新默认公益酒馆测试，验证同馆存在两个 NPC 且新 NPC 资源文件存在。

## Acceptance Criteria
- [ ] `pw_jingan_catbell_refuge` 默认 seed 的 `characters` 包含 `char_pw_mimi_nya` 和新 NPC。
- [ ] 新 NPC 的 `avatar`、`sprites.neutral/joy/anger/embarrassment/curiosity` 指向项目内 PNG。
- [ ] focused pytest 通过。
- [ ] `py -3 -m compileall -q backend/src` 或等效 Python 语法检查通过。

## Technical Notes
- 复用现有 tavern-themed NPC art 资产并复制为新 NPC 专属文件名，不使用临时目录或聊天预览图。
- 仅更新默认 seed 源码、测试和 Trellis 留痕；不做 API/schema/前端 UI 改造。

## Implementation Notes

* Added `char_pw_yinpiao` (银票) to `pw_jingan_catbell_refuge` as a second default public-welfare NPC in the same tavern as `char_pw_mimi_nya`.
* Added direct `avatar` plus `sprites.neutral/joy/anger/embarrassment/curiosity` and semantic aliases `happy/angry/shy/curious` using project-local PNG paths under `frontend/public/assets/npcs/`.
* Added a Catbell world-info entry for 银票's ledger / fish-budget / revisit-code context.
* Updated `tests/test_default_public_welfare_taverns.py` to assert both Catbell NPCs, required sprite aliases, and file existence.
* Debug note: full default-public-welfare test initially caught that the new neutral asset duplicated `char_pw_wenjian-neutral.png`; replaced it with a distinct project-local derivative and reran the full file successfully.

## Verification

* `py -3 -m compileall -q backend/src` — passed.
* `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py -k jingan --tb=short` — passed.
* `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py --tb=short` — passed (`16 passed`).
* `npm --prefix .\frontend run build` — passed.
* Asset check: five `char_pw_yinpiao-*.png` files exist under `frontend/public/assets/npcs/` with distinct hashes.
