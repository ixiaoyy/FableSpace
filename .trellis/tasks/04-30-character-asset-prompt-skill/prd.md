# Character asset prompt skill

## Goal

把用户提供的角色素材/视觉风格 Prompt 方法沉淀为 Trellis 可追踪知识：新增一个项目本地 skill，帮助后续 FableMap 角色创建流程生成更聪明、更符合店主意图的角色卡 Prompt 与视觉素材 Prompt。

## Source reference from user

用户给出的参考重点：

- 角色/宣传图质量不只靠主体名，而要靠明确的风格语言、构图、媒介、色彩、纹理、后期痕迹和符号系统。
- 可通过「设计风格术语检索」与「从图反推 Prompt」两条路径得到新风格。
- 反推 Prompt 应剥离具体角色、文字、品牌或情节，仅保留可迁移的美学结构。
- 对 FableMap 的实际价值是：在创建角色时，先生成更好的角色卡 Prompt / 视觉素材 Prompt，让模型更懂角色定位、场景和留存钩子。

## Scope

### Allowed

- 新增 `.agents/skills/generate-character-prompt/` 项目 skill。
- 新增 skill reference，沉淀角色卡生成 Prompt、视觉素材 Prompt、图片风格反推 Prompt、风格语汇和质量检查清单。
- 更新 `.trellis/spec/frontend/npc-art-guidelines.md`，记录角色素材 Prompt 元生成规则。
- 只做文档/技能沉淀，不改产品代码、API、Schema 或图片资源。

### Not Allowed

- 不新增或修改 `TavernCharacter` / `NpcDraftPreview` 持久字段。
- 不把 AI 草稿写成已发布的店主内容。
- 不引入具体版权 IP、品牌 Logo、在世艺术家风格或敏感数据到项目资产规范。
- 不生成图片，不移动/删除现有 docs 文档。

## Deliverables

- `.agents/skills/generate-character-prompt/SKILL.md`
- `.agents/skills/generate-character-prompt/references/prompt-templates.md`
- `.agents/skills/generate-character-prompt/agents/openai.yaml`
- `.trellis/spec/frontend/npc-art-guidelines.md` 更新

## Acceptance Criteria

- [x] Skill 描述能触发角色卡 Prompt、NPC 视觉素材 Prompt、表情组 Prompt、图片风格反推 Prompt 等场景。
- [x] Prompt 模板遵守 FableMap 约束：真实地点/酒馆锚点、主人主权、AI 草稿需确认、SillyTavern 兼容字段、不要新增 Schema。
- [x] 视觉 Prompt 模板要求 tavern cues，并避开具体 IP/Logo/水印/在世艺术家模仿。
- [x] Trellis frontend NPC art spec 记录该 meta-generation contract。
- [x] 运行可行的文档/skill 验证；若官方验证工具因本地依赖缺失失败，需要如实记录。

## Verification Plan

```powershell
# Skill validator if dependencies are available
$env:PYTHONUTF8='1'; & 'C:\Users\phpxi\miniconda3\python.exe' C:\Users\phpxi\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/generate-character-prompt

# Stdlib fallback validation
& 'C:\Users\phpxi\miniconda3\python.exe' -c "...check required files and frontmatter..."

# Trellis task validation
& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py validate .\.trellis\tasks\04-30-character-asset-prompt-skill
```

No frontend/backend build is required because this task changes only Trellis/spec/skill documentation and does not generate or wire runtime image assets.

## 2026-04-30 Verification Results

- `$env:PYTHONUTF8='1'; & 'C:\Users\phpxi\miniconda3\python.exe' C:\Users\phpxi\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/generate-character-prompt` — failed before validating skill content because the local Python environment does not have `yaml` / PyYAML installed (`ModuleNotFoundError: No module named 'yaml'`). No dependency was installed for this docs-only task.
- `& 'C:\Users\phpxi\miniconda3\python.exe' -c "...stdlib skill/spec validation..."` — passed; confirmed required skill/reference/openai/spec/task files exist, SKILL frontmatter is present, no TODO remains in `SKILL.md`, reference templates include role-card, visual asset, reverse-style, and style vocabulary sections, and the Trellis spec contains `Character Prompt Meta-Generation Contract`.
- `& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py validate .\.trellis\tasks\04-30-character-asset-prompt-skill` — initially failed because Trellis docs init auto-injected missing `.claude/commands/trellis/*.md` context paths; replaced them with existing `.agents/skills/finish-work/SKILL.md` and `.agents/skills/check/SKILL.md`; rerun passed all implement/check/debug context validation.
- Backend/frontend build/test not run because only Trellis/spec/skill documentation changed; no runtime source or generated image asset was modified.

## 2026-04-30 User Follow-up: Full Style Recipe Memory

User feedback: prior recording was too shallow; future sessions should preserve tested prompt templates, not only short summaries.

Additional recipes preserved in `.agents/skills/generate-character-prompt/references/style-recipes.md`:

- 米白-红色电路图 / 奶油留白赛博平面
- Y2K + 波普艺术 / 电光蓝橘像素街景
- 赛璐璐平涂 + 思维爆发 / 内省碎片拼贴
- 波普艺术 + 拼贴 + 70/80 年代街头海报
- 工业档案袋风格 / 前数字时代技术档案

Also expanded the file into a fuller catalog for the previously discussed recipes so future prompt work can reuse the concrete templates instead of rebuilding from memory.

Spec update: `.trellis/spec/frontend/npc-art-guidelines.md` now requires preserving full user-contributed visual prompt recipes, including subjective notes about palette fatigue, element pile-up, and favored use cases, before reducing them to style keywords.

## 2026-04-30 Follow-up Verification Results

- `& 'C:\Users\phpxi\miniconda3\python.exe' -c "...stdlib skill/style recipe validation..."` — passed; confirmed `SKILL.md` links `style-recipes.md`, prompt templates include new style keywords, full recipe file contains the five new recipes, Markdown code fences are balanced, and NPC art spec requires preserving full recipes.
- `& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py validate .\.trellis\tasks\04-30-character-asset-prompt-skill` — passed all implement/check/debug context validation.
- Backend/frontend build/test not run because this follow-up only updates skill/spec/task documentation; no runtime code or image assets changed.

## 2026-04-30 User Follow-up: Complete External Skill Import

User provided a complete `image-style-prompt-extractor` skill for reverse-engineering reusable Chinese image-style prompts from reference images.

Actions:

- Initialized and added `.agents/skills/image-style-prompt-extractor/SKILL.md`.
- Preserved the full workflow: trigger description, 15 internal style-analysis dimensions, strict output shape, self-checks, and common mistakes.
- Added `.agents/skills/image-style-prompt-extractor/agents/openai.yaml` for UI metadata.
- Cross-linked `generate-character-prompt` so image-upload style extraction can use this skill first, then adapt to FableMap NPC prompts if needed.
- Updated `.trellis/spec/frontend/npc-art-guidelines.md` so future NPC visual prompt work knows when to use `image-style-prompt-extractor` versus `generate-character-prompt`.

No runtime code, API, schema, or image asset changed.

## 2026-04-30 External Skill Import Verification Results

- `& 'C:\Users\phpxi\miniconda3\python.exe' -c "...stdlib external skill import validation..."` — passed; confirmed the imported skill file exists, has frontmatter, includes the 15-dimension analysis contract, strict output requirements, common mistakes, required placeholder text, no TODO marker, valid UI metadata reference to `$image-style-prompt-extractor`, and cross-links from `generate-character-prompt` plus the NPC art spec.
- `& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py validate .\.trellis\tasks\04-30-character-asset-prompt-skill` — passed all implement/check/debug context validation.
- Official `quick_validate.py` remains unavailable in this local environment because PyYAML is not installed; no dependency was installed for this docs/skill-only update.
- Backend/frontend build/test not run because only skill/spec/task documentation changed; no runtime code or image assets changed.

## 2026-04-30 Official Skill Validator After PyYAML Install

User approved installing the missing validation dependency.

- `& 'C:\Users\phpxi\miniconda3\python.exe' -m pip install PyYAML` — succeeded; installed `PyYAML-6.0.3` into the local Miniconda Python used by Trellis/skill validation.
- `$env:PYTHONUTF8='1'; & 'C:\Users\phpxi\miniconda3\python.exe' C:\Users\phpxi\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/generate-character-prompt` — passed: `Skill is valid!`.
- `$env:PYTHONUTF8='1'; & 'C:\Users\phpxi\miniconda3\python.exe' C:\Users\phpxi\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/image-style-prompt-extractor` — passed: `Skill is valid!`.
- `& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py validate .\.trellis\tasks\04-30-character-asset-prompt-skill` — passed all implement/check/debug context validation.

## 2026-04-30 User Follow-up: Default Style Extractor for Material Assets

User decision: future material/resource generation should default to `$image-style-prompt-extractor`. If a needed project style is missing, supplement the local style memory.

Actions:

- Updated `.agents/skills/image-style-prompt-extractor/SKILL.md` so it explicitly covers FableMap material generation style extraction/normalization, not only reference-image reverse prompting.
- Added a FableMap material-generation mode: use the 15-dimension framework first, choose/extract/write a reusable style recipe, then generate/land assets through project asset rules.
- Updated `.agents/skills/generate-character-prompt/SKILL.md` so visual materials default to `image-style-prompt-extractor`, and missing useful styles must be added as complete recipes in `style-recipes.md`.
- Updated `.trellis/spec/frontend/image-asset-guidelines.md` with a new “Default Style Extraction Before Material Generation” scenario.
- Updated `.trellis/spec/frontend/npc-art-guidelines.md` to make `image-style-prompt-extractor` the default style normalization step for future FableMap material resources.

No runtime code, API, schema, or actual image asset changed.

## 2026-04-30 Default Material Style Workflow Verification Results

- `$env:PYTHONUTF8='1'; & 'C:\Users\phpxi\miniconda3\python.exe' C:\Users\phpxi\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/image-style-prompt-extractor` — passed: `Skill is valid!`.
- `$env:PYTHONUTF8='1'; & 'C:\Users\phpxi\miniconda3\python.exe' C:\Users\phpxi\.codex\skills\.system\skill-creator\scripts\quick_validate.py .agents/skills/generate-character-prompt` — passed: `Skill is valid!`.
- Initial stdlib content assertion used PowerShell backtick-sensitive patterns and failed; reran with path/name patterns that avoid shell backtick parsing.
- `& 'C:\Users\phpxi\miniconda3\python.exe' -c "...default material style workflow validation..."` — passed; confirmed image asset spec contains the default style extraction scenario, image-style skill contains FableMap material-generation mode, generate-character-prompt references image-style extraction as default, and NPC art spec records the default.
- `& 'C:\Users\phpxi\miniconda3\python.exe' .\.trellis\scripts\task.py validate .\.trellis\tasks\04-30-character-asset-prompt-skill` — passed all implement/check/debug context validation.
- Backend/frontend build/test not run because only skill/spec/task documentation changed; no runtime code or image assets changed.

## 2026-04-30 User Follow-up: Fantasy / Isekai Species Diversity

User decision: 异世界 / 奇幻角色最好不要全部默认成人类，否则视觉和角色体验会变得无聊。

Actions:

- Updated `.trellis/spec/frontend/npc-art-guidelines.md` with a Fantasy / Isekai Species Diversity Contract: non-realistic tavern casts should actively decide species/body-plan mix and avoid accidental all-human rosters.
- Updated `.agents/skills/generate-character-prompt/SKILL.md` and `references/prompt-templates.md` so role-card and visual prompts include species/body-plan as a design layer while keeping data inside existing `TavernCharacter` fields.
- Updated `.trellis/tasks/04-30-public-welfare-npc-batch-upgrade/prd.md` so Batch 0 audit records species/body-plan and flags non-realistic shops that are all ordinary humans.

No runtime code, API, schema, or image asset changed.
