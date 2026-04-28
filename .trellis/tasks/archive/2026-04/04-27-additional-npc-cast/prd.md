# 补充 6 个原创 NPC 角色与头像资产

## Goal

把本轮聊天中确认的 6 个原创 NPC 草稿补齐为项目内可追踪资产：角色卡文本 + 项目内头像 PNG + 生成提示词/进度记录。

## Scope

- 生成 6 个原创 tavern-themed NPC 头像。
- 图片落入 `frontend/app/assets/npc-style-cast/portraits/`，作为项目内可复用素材。
- 角色卡草稿落入本任务目录，作为候选内容，不自动写入默认 seed，不自动发布到任何酒馆。
- 每生成一个角色，就更新 `progress.md` 和 `generated-prompts.md`，记录源文件与目标路径。

## NPC List

1. 岚泊 / mist-bartender-lanbo
2. 赤铆 / commission-chimao
3. 洛铜 / terminal-repair-luotong
4. 银票 / cat-accountant-yinpiao
5. 泊星 / starport-boxing
6. 鸢尾零 / neon-oracle-iris-zero

## Constraints

- 原创角色，不模仿现有 IP、名人或特定画师。
- 头像必须有酒馆/赛博酒馆语义，不使用纯色/几何/抽象占位。
- 本轮不新增 schema，不写入 `TavernCharacter` seed，不覆盖店主内容。
- 图片生成源不能只留在 `.codex/generated_images`；最终必须复制/转换到仓库路径。

## Validation

- 验证 6 张项目 PNG 存在。
- 验证尺寸为 256×256。
- 记录 SHA256。
- 资产未接入 runtime 逻辑时，前端 build 可选；如运行则记录结果。
