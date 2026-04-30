# Public-welfare NPC batch visual and role upgrade

## Goal

逐批升级旧公益店 NPC 的视觉素材、角色差异化和店内分工体验，解决用户指出的“旧版素材和形象过于相似、审美疲劳、缺乏吸引力”问题，同时保持 FableMap 的核心约束：真实坐标店铺、店主主权、SillyTavern 兼容、每个店至少三名角色、每个角色都能聊天。

本任务是医院三人组之后的后续批量任务；医院 `pw_hospital_night_care` / 弥夏、青柚、南星作为新质量基线，不在第一轮重构范围内，除非后续审查发现资产或聊天契约不达标。

## Source context from current session

用户在本会话中明确提出的未完成方向：

- “检索现有的图片素材，使用不同风格作图，减少重复感”。
- “检索现有图片/种子数据，检索之后，最好能对旧版过时的素材进行重构”。
- 一个 `店` 最少要有三名角色。
- 所有店都要有核心角色聊天功能。
- 生成素材资源默认使用 `$image-style-prompt-extractor`；如果项目缺失所需风格，需要补充本地风格记忆。
- 异世界 / 奇幻类角色最好不要全是人类，否则会显得无聊；后续角色和素材生成要把物种 / 体态多样性作为明确检查项。

本会话已完成但仍需在后续延续的基础：

- 已新增医院公益店 `pw_hospital_night_care`，并补齐三名角色：弥夏 / 青柚 / 南星。
- 已把默认公益店契约写入 `.trellis/spec/backend/database-guidelines.md`：每店 ≥3 角色、每角色可聊天、rules 后端、token 使用为 0、角色分工清楚。
- 已把素材生成默认流程写入 `.trellis/spec/frontend/image-asset-guidelines.md` 与 `.trellis/spec/frontend/npc-art-guidelines.md`：先用 `$image-style-prompt-extractor` 做风格提取/归一化，缺失风格写入 `style-recipes.md`。
- 已在 `/create` 页面要求至少填写首个 NPC，避免 UI 创建无聊天角色的店。

## Current public-welfare seed inventory

当前默认公益店及角色（后续批量审查以实际代码为准）：

1. `pw_lantern_helpdesk` / 公益·灯塔问讯台：小舟、路明、桥桥。
2. `pw_midnight_treehole` / 公益·夜航树洞电台：安澜、夜雨、灯芯。
3. `pw_community_repair` / 公益·街角修补工坊：阿槐、和光、巧手。
4. `pw_lost_found_archive` / 公益·城市拾光档案亭：闻笺、拾忆、索引。
5. `pw_third_shelf_observatory` / 公益·第三货架观测站：社长 9-Delta、临时店员 Mu-Mu、样本保管员 V-17、地球礼仪实习生 Pi-Pi。
6. `pw_midnight_commission_board` / 公益·午夜委托局：墨栈、栀灯、火眼。
7. `pw_after_school_hero_supply` / 公益·放学后英雄补给社：阿衡、纸剑、星袋。
8. `pw_jingan_catbell_refuge` / 公益·静安猫铃小屋：眯眯喵桑、银票、铜铃。
9. `pw_hospital_night_care` / 公益·夜间护理站：弥夏、青柚、南星（新质量基线）。

现有项目资源目录：`frontend/public/assets/npcs/public-welfare/<character_id>/{neutral,joy,anger,embarrassment,curiosity}.png`。

## Requirements

### 1. Batch audit before generation

- 读取并比对：
  - `backend/src/fablemap_api/core/default_taverns.py`
  - `frontend/public/assets/npcs/public-welfare/`
  - `tests/test_default_public_welfare_taverns.py`
  - 既有 `artifacts/04-30-npc-asset-audit/` 接触表 / 审查输出（如存在）
  - 旧拒稿清单 / rejected manifest（如存在）
- 产出批次审查表：每个角色记录当前风格、物种/体态、分辨率、表情完整度、重复风险、优先级、建议新风格、是否需要同步角色文案。
- 不允许直接覆盖旧图而不保存来源：每一批生成源图、参考图、裁剪脚本/参数、hash 都要进入 `artifacts/<task>/batch-*/` 或 PRD 附录。

### 2. Style diversity and prompt workflow

- 默认使用 `$image-style-prompt-extractor` 作为素材生成前置步骤；没有参考图时也要用它的 15 维风格框架归一化目标风格。
- 若需要新风格，先补充完整 recipe 到 `.agents/skills/generate-character-prompt/references/style-recipes.md`，不要只写几个关键词。
- 每个批次要显式避免：同脸、同构图、同制服、同色板、同姿态、同一套热门模板机械复用。
- 异世界、奇幻、魔物镇、灵异、外星等非现实主题店铺不得无意中全员普通人类；至少要评估原创非人 / 非普通体态角色，如兽人、灵体、机械生命、异星居民、物件成精等，并让物种特征服务于店内职责。
- 可以参考已记录风格，但要控制疲劳：Y2K 蓝橘、街头拼贴等高刺激模板不要连续用于多个角色；优先为不同店铺建立不同“视觉宇宙”。
- 不使用具体版权 IP、品牌 logo、水印、在世艺术家模仿或会误导为真实医疗/法律/金融结论的视觉文案。

### 3. Character and shop quality contract

- 每个公益店继续保持至少 3 名正式 `TavernCharacter`。
- 每个正式角色都必须有完整直连本地资产：`avatar`、`sprites.neutral`、`joy/happy`、`anger/angry`、`embarrassment/shy`、`curiosity/curious`。
- 每个角色都必须能走核心单角色聊天：进入店铺 → 选择角色 → 发送普通消息 → 获得非空、非降级回复 → 持久化两条聊天消息。
- 角色分工不能只靠头像差异；需要同步检查 `description/personality/scenario/system_prompt/first_mes/world_info/gameplay` 是否能体现店内三人组职责差异。
- 物种 / 体态差异不能只靠视觉噱头；需要写入既有角色字段（description、scenario、system_prompt、tags 等）并影响对话方式、职责边界或回访钩子；不新增 `TavernCharacter` schema 字段。
- 保持公益店默认 `llm_config.backend="rules"` 且 `api_key=""`，不引入外部 LLM 依赖。

### 4. Asset landing rules

- 任何被项目引用或验收的 AI 生成图片必须进入仓库路径，不能只留在 `%USERPROFILE%\.codex\generated_images` 或聊天预览。
- 正式 sprite 路径继续使用：`frontend/public/assets/npcs/public-welfare/<character_id>/<expression>.png`。
- 每次替换要记录：生成源路径、仓库参考路径、正式 sprite 路径、尺寸、SHA-256、是否覆盖旧资产、旧资产如何归档或标记。
- 批次完成前检查 `.codex/generated_images` 中本轮生成物是否都已搬入项目或明确标记为废稿/参考。

## Proposed batch plan

### Batch 0 — Audit and prioritization

- 生成当前公益 NPC 接触表和资产矩阵。
- 对 25 个旧角色（医院三人组之外）做重复度/吸引力/风格过时评分。
- 产出第一批候选清单，优先选择最相似、最旧、最不符合当前质量基线的 2-3 个店铺。

### Batch 1 — First visual rebuild slice

- 重构 2-3 个店铺的 NPC 视觉资产，保持每店 3+ 角色完整表情组。
- 每个店铺分配不同风格方向，例如：档案亭可偏工业档案袋/半调雕刻，树洞电台可偏混合媒介/Lo-fi，补给社可偏克莱因秩序/波普水墨等；具体以 Batch 0 审查表为准。
- 同步必要的角色 seed 文案，让新图和职责一致。

### Batch 2 — Remaining legacy shops

- 按 Batch 0 优先级继续升级剩余旧店铺。
- 每批结束都重新跑接触表和 hash/尺寸审查，避免新一轮模板疲劳。

### Batch 3 — Role/chat polish

- 检查每个店的 `NPC 分工` world info / role-triage gameplay 是否足够明确。
- 补齐弱角色的 first_mes、scenario、system_prompt，确保三人组不是“换皮同一人”。
- 保持公益、安全、非专业诊疗/法律/金融建议边界。

## Acceptance criteria

- [ ] Batch 0 审查表落盘，列出所有默认公益店、角色、资产、尺寸、hash、重复风险和优先级。
- [ ] Batch 0 审查表包含每个角色的物种/体态栏；非现实主题店铺若全员普通人类，必须记录原因或列入重构候选。
- [ ] 至少一个旧公益店批次完成视觉重构，且所有正式 sprite 都进入项目资源路径。
- [ ] 每个被升级角色都有完整五表情 PNG，尺寸/格式/hash 审查通过。
- [ ] 每个被升级店仍满足 ≥3 角色、role division、rules 后端、无 API key、核心聊天不降级。
- [ ] 如果新增/复用视觉风格，完整 style recipe 已写入本地技能记忆；不只写短关键词。
- [ ] PRD 记录所有生成源、仓库参考图、正式 sprite、hash、废稿/参考状态。
- [ ] 前端构建和默认公益店后端回归通过。

## Validation plan

```powershell
# Backend seed/chat regression
py -3 -m compileall -q backend/src
py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py --tb=short

# If Place type or v1 payload behavior changes
py -3 -m pytest -q backend/tests/test_v1_place_home_mvp.py --tb=short

# If frontend assets or references change
npm --prefix .\frontend run build

# If style skill/spec recipes change
$env:PYTHONUTF8='1'; & 'C:\Users\phpxi\miniconda3\python.exe' C:\Users\phpxi\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/image-style-prompt-extractor
$env:PYTHONUTF8='1'; & 'C:\Users\phpxi\miniconda3\python.exe' C:\Users\phpxi\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/generate-character-prompt

# Trellis context validation
py -3 .trellis/scripts/task.py validate .trellis/tasks/04-30-public-welfare-npc-batch-upgrade
```

## Deferred / not done from current session

- 未批量重构旧公益 NPC；本会话只完成了医院三人组和相关契约。
- 未完成所有旧公益角色的风格矩阵、重复度评分和批次优先级表。
- 未为旧公益 NPC 生成新的正式替换图；旧素材仍需按批次审查后再替换。
- 未把“所有店必须有核心角色聊天”强制到低层 API / 包导入层；当前已覆盖默认公益店和 `/create` UI 路径，低层兼容策略需单独评估后再决定是否收紧。
- `04-30-character-asset-prompt-skill` 与 `04-30-hospital-nurse-npc-asset` 仍处于 review，尚未由用户最终验收/提交/record-session。

## Notes

- 医院三人组是“新质量基线”，不是“全部公益 NPC 已升级”的证据。
- 每次完成一个批次后，都要明确 Done vs Not Done，避免把局部完成误报成全部旧公益 NPC 已完成。
