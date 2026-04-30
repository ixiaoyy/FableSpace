# Image asset prompt sidecars and inventory

## Goal

把“每张项目图片旁边都有可复用最终生成 prompt”升级为 FableMap 图片资产的硬流程：后续任何需要重绘、高清化、换模型生成或人工审美复审的图片，都能在同目录直接找到当时的最终 prompt / 反推 prompt / 生成约束，而不是只能回翻聊天记录、临时 manifest 或 `%USERPROFILE%\.codex\generated_images`。

本任务优先级为 **P0**。原因：图片资产一旦缺 prompt，后续替换质量会依赖记忆和猜测；这会放大视觉不一致、版权/IP 风险、路径引用错误和“已替换但实际仍引用旧图”的风险。

## User request source

用户在 2026-04-30 明确要求：

- “把图片对应的最终prompt也放进相同的图片素材目录里面”。
- “这样后续方便使用相同的prompt生成更高质量的图片进行替换”。
- “把这种方式写入全局记忆里面”。
- “对当前项目内图片素材进行梳理，如果没有prompt的，就反向解析生成prompt，放在相同位置”。
- “先作为优先级最高的 Trellis 任务写到任务里面”。

## Scope

### In scope

1. **制定 sidecar 规范**
   - 每张正式项目图片旁边必须有同目录 prompt sidecar。
   - 推荐命名：`<image-stem>.prompt.md`。
   - 若一个目录内有一组强绑定 sprite（如 NPC 五表情），允许额外提供目录级 `prompts.md` 或 `prompt-manifest.json`，但不能替代单图可追溯记录，除非规范明确说明映射关系。
   - Sidecar 必须注明：
     - 对应图片相对路径。
     - prompt 类型：`original-final` / `reverse-engineered` / `reference-only` / `unknown-needs-human`。
     - 最终正向 prompt。
     - 负面约束 / safety constraints。
     - 风格 recipe / Style DNA 来源。
     - 角色或场景 identity locks。
     - 若是表情图：base prompt + expression suffix。
     - 生成来源：生图模型、项目内脚本、人工反推、或历史 manifest。
     - 图片尺寸、SHA-256、最后核验时间。
     - 是否可直接用于高清重绘。

2. **写入全局记忆 / 项目规范**
   - 因用户已明确要求，可更新全局/长期规则，但只能写这条图片资产流程，不夹带其他临时任务规则。
   - 至少同步：
     - `AGENTS.md`：图片类任务完成前，正式图片必须有同目录 prompt sidecar。
     - `docs/IMAGE_ASSETS_SPEC.md`：图片资产规范加入 prompt sidecar 格式与示例。
     - `.trellis/spec/frontend/image-asset-guidelines.md`：实现与验收规则。
     - `.trellis/spec/frontend/npc-art-guidelines.md`：NPC sprite / 表情组 prompt sidecar 规则。
     - `.agents/skills/generate-character-prompt/SKILL.md` 或 reference：Prompt-first 产物必须落到图片同目录 sidecar。
     - `.agents/skills/image-style-prompt-extractor/SKILL.md` 或 reference：反向解析图片时输出可落盘 sidecar 格式。

3. **梳理当前项目图片资产**
   - 扫描正式项目引用/可交付图片路径，至少包括：
     - `frontend/public/`
     - `frontend/app/assets/`
     - `artifacts/` 中被任务/文档引用为正式验收依据的图片。
   - 排除：
     - 构建输出目录，如 `frontend/build/`。
     - 缓存、node_modules、临时下载、未引用废稿。
   - 产出 inventory：
     - 图片路径、尺寸、格式、SHA-256、引用位置、是否已有 sidecar、sidecar 类型、优先级。

4. **补齐缺失 prompt sidecar**
   - 若图片已有历史 prompt manifest 或生成脚本记录，优先用原始最终 prompt 生成 `original-final` sidecar。
   - 若找不到原始 prompt，则用 `image-style-prompt-extractor` 的 15 维风格框架对图片进行反向解析，生成 `reverse-engineered` sidecar。
   - 反推 prompt 必须显式标记为“反向解析，不是原始生成 prompt”。
   - 对 NPC 五表情图，sidecar 要保留统一 identity locks，并把每张图的表情差异写清楚，避免后续高清重绘时角色换脸。

5. **优先处理高价值路径**
   - P0-A：`frontend/public/assets/npcs/public-welfare/` 当前所有公益 NPC sprites。
   - P0-B：本次任务产物 `artifacts/04-30-public-welfare-npc-batch-upgrade/` 中 prompt manifest / source / target 的映射回填。
   - P1：发现页、首页、酒馆封面、产品演示图等正式 UI 资产。
   - P2：文档示例图、历史 artifacts 中仅作审查参考的图片。

## Proposed sidecar format

`frontend/public/assets/npcs/public-welfare/char_pw_9_delta/neutral.prompt.md` 示例：

```markdown
---
asset: frontend/public/assets/npcs/public-welfare/char_pw_9_delta/neutral.png
prompt_type: original-final
source_type: prompt-manifest
source_manifest: artifacts/04-30-public-welfare-npc-batch-upgrade/batch-1-prompt-manifest/public-welfare-batch-1-prompt-manifest.json
character_id: char_pw_9_delta
expression: neutral
width: 256
height: 256
sha256: <current image hash>
updated_at: 2026-04-30
can_regenerate_higher_quality: true
---

## Final prompt

<base prompt + neutral expression suffix>

## Negative constraints

- No readable brand text / logo / watermark.
- No existing IP or living-artist imitation.
- No private data / API key.

## Identity locks

- <lock 1>
- <lock 2>

## Notes

This sidecar is intended to regenerate a higher-quality replacement while preserving identity and path semantics.
```

## Implementation plan

1. 读取并确认图片资产规范与当前图片目录。
2. 编写 sidecar schema / markdown 模板。
3. 编写 inventory 脚本：扫描图片、计算 hash/尺寸、检测 sidecar、查找代码/文档引用。
4. 对已有 prompt manifest 的资产生成 sidecar：
   - 先覆盖本次公益 NPC batch upgrade 相关 70 张 sprite。
   - 再追溯医院三人组、其他公开 NPC、首页/发现页图片等已有 manifest/脚本可识别资产。
5. 对无 prompt 的正式图片进行反向解析：
   - 先生成 `reverse-engineered` sidecar 草稿。
   - 不要伪装成原始 prompt。
6. 更新全局记忆/规范文件。
7. 运行核验：sidecar 与图片数量/路径/hash 一致。
8. 更新 Trellis task context 与最终报告。

## Acceptance criteria

- [ ] 任务仍为 P0，且 PRD 明确记录用户原始要求。
- [ ] 已定义同目录 sidecar 命名和内容 schema。
- [ ] `AGENTS.md` 或等价全局入口明确写入：正式项目图片必须同目录保留最终 prompt sidecar；缺失原 prompt 时必须反向解析并标注。
- [ ] `docs/IMAGE_ASSETS_SPEC.md`、`.trellis/spec/frontend/image-asset-guidelines.md`、`.trellis/spec/frontend/npc-art-guidelines.md` 同步 sidecar 规则。
- [ ] 当前项目正式图片 inventory 落盘，包含路径、尺寸、hash、引用、是否有 prompt sidecar。
- [ ] `frontend/public/assets/npcs/public-welfare/` 中每张正式 sprite 都有同目录 prompt sidecar，且公益 NPC 批量升级任务的 70 张图优先使用原 prompt manifest 生成 `original-final` sidecar。
- [ ] 对无法找到原始 prompt 的正式图片，生成 `reverse-engineered` sidecar，并清楚标记非原始 prompt。
- [ ] Sidecar 校验脚本能检查：图片存在、sidecar 存在、frontmatter asset 路径匹配、hash 匹配、prompt 非空。
- [ ] 验证命令通过；若图片被前端引用，至少运行前端 build。

## Validation plan

```powershell
# Sidecar inventory / schema validation
py -3 artifacts/<task>/validate_image_prompt_sidecars.py

# Python syntax if scripts are added under artifacts or backend
py -3 -m compileall -q backend/src
python -m py_compile artifacts/<task>/*.py

# Frontend build if public/frontend assets or docs references change
npm --prefix .\frontend run build

# Trellis context validation
py -3 .trellis/scripts/task.py validate 04-30-image-asset-prompt-sidecars
```

## Explicit non-goals

- 不在本任务里批量重新生成更高质量图片；本任务是 prompt sidecar / inventory / 反向 prompt 基础设施。
- 不把反向解析 prompt 误称为原始 prompt。
- 不为未被项目引用、未验收、明确废稿的临时图片强制补 sidecar，除非后续决定纳入正式资产。
- 不改变图片引用路径，除非 sidecar 校验发现路径错误并单独记录。
