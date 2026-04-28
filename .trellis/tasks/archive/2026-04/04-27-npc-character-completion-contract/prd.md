# NPC 角色实现完成标准 PRD

## 背景

用户确认：Trellis 中每次做新的 NPC 角色时，不能只交付文字设定；必须同时补头像 / 立绘 / 表情差分、写入角色 payload，并补测试证明前端不会走默认占位或通用 fallback。

## 标准

新增或实现一个正式 NPC 角色，至少需要：

1. 专属头像 / neutral 立绘资产。
2. 表情差分：happy / angry / shy / curious（在当前表达系统中可映射为 joy / anger / embarrassment / curiosity，并可同时提供别名）。
3. `TavernCharacter.avatar` 或 `sprites.neutral` 写入可访问项目路径。
4. 测试确认角色 payload 含头像字段、sprites 字段和资产文件存在。
5. 文档 / Trellis 规范记录该完成标准；缺一项即不能声称 NPC 实现完成。

## 本次补充

- 将该标准写入 `.trellis/spec/frontend/npc-art-guidelines.md`。
- 将前端 pre-development checklist 改成任何新增正式 NPC 都要读 NPC Art Guidelines。
- 给当前 `眯眯喵桑` 增加 happy/angry/shy/curious 语义别名，保留已有 joy/anger/embarrassment/curiosity。

## Implementation Notes (2026-04-27)

已完成：

- 在 `.trellis/spec/frontend/npc-art-guidelines.md` 新增 `New NPC Character Completion Contract`，明确正式 NPC 必须有专属头像 / neutral 立绘、happy/angry/shy/curious 表情语义、payload 写入和文件存在测试。
- 更新 `.trellis/spec/frontend/index.md`，把该规范加入前端 pre-development checklist。
- 更新 `.trellis/spec/backend/quality-guidelines.md`，要求 backend/default-seed 新 NPC 必须补 art payload 测试。
- 当前 `眯眯喵桑` 的 sprites 已补充语义别名：`happy/angry/shy/curious`，同时保留当前表达系统的 `joy/anger/embarrassment/curiosity`。
- 测试已更新，断言 avatar、neutral、happy/angry/shy/curious、engine aliases 以及 PNG 文件存在。

TDD：

- RED：`py -3 -m pytest -q tests/test_default_public_welfare_taverns.py::test_jingan_catbell_refuge_contains_safe_original_catgirl_npc --tb=short` → `KeyError: 'happy'`。
- GREEN：同命令 → `1 passed in 0.56s`。

验证：

- `py -3 -m compileall -q backend/src` → 通过。
- `py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py --tb=short` → `13 passed in 0.88s`。
- `npm --prefix .\frontend run build` → 通过。
