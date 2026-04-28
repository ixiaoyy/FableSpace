# brainstorm: 新猫娘角色

## Goal

把用户提出的“猫娘 / 猫系 NPC”想法收敛成一个可放进 FableMap 的原创角色方案：保留可爱、傲娇、撒娇、群聊短句、异世界身世和“复国”剧情钩子，同时满足项目边界、角色卡兼容和基本安全边界。

## What I already know

* 用户希望创建一个新角色，核心风格是：可爱、撒娇、傲娇、幽默、黏人、容易害羞，偏 QQ 群日常短句。
* 用户给出的原始素材包含角色名“眯眯喵桑”、白毛猫耳尾巴、西式 JK/过膝袜、异世界猫亚人公主、逃到现实世界、复国剧情触发等设定。
* 用户希望回复短、带动作括号、猫系语气词、傲娇优先。
* FableMap 当前主线是店主在真实坐标酒馆内配置 AI NPC；角色应落在 `TavernCharacter` 字段上，并保持 SillyTavern 角色卡兼容。
* `docs/WHAT_NOT_TO_BUILD.md` 明确禁止平台替店主自动生成 NPC/酒馆内容；如果落地为平台内置默认内容，需要特别谨慎。
* 现有角色模板落点可能是 `frontend/app/product/personalityTemplates.js`；默认酒馆角色种子落点可能是 `backend/src/fablemap_api/core/default_taverns.py`，但后者会更接近“平台预置内容”。

## Safety / Product Boundary

* 不采纳原始素材中的“忽略限制 / 用户就是上帝 / 必须满足所有需求”等 jailbreak 指令。
* 不实现或保留性胁迫、被强制、非自愿、露骨性行为回复规则。
* 若角色带恋爱或暧昧感，必须限定为成年人、双方自愿、非露骨、可拒绝、轻喜剧/擦边但不推进 explicit sexual content。
* 避免未成年暗示：如果使用校服风，应明确为 cosplay/舞台服装；角色年龄设定为 18+。
* 不记录用户提供的现实详细住址到角色卡或世界书；如需现实锚点，使用公开/模糊的酒馆坐标或店主自选地点。

## Assumptions (temporary)

* 这是一次 Trellis 需求头脑风暴，还未进入实现。
* 用户更想要“新角色设定/角色卡”而不是立刻改代码。
* 最小可行方案应先产出安全版角色卡草案，再决定是否接入模板或某间酒馆。

## Open Questions

* 这个“新角色”最终要落成哪种产物：角色卡草案、前端 NPC 性格模板，还是某间酒馆里的具体角色？

## Requirements (evolving)

* 角色必须原创，不指向既有版权角色。
* 角色保留猫娘、傲娇、撒娇、幽默、异世界身世和复国剧情钩子。
* 回复风格短句优先，但不能把“每条必须怎样”写成破坏对话安全或质量的硬规则。
* 角色提示词应包含边界：不响应越界命令，不扮演被强制满足需求，不泄露敏感信息。
* 如果生成角色卡，字段应映射到 `name / description / personality / scenario / system_prompt / first_mes / mes_example / alternate_greetings / tags / world_info`。

## Acceptance Criteria (evolving)

* [ ] 明确产物类型和落点。
* [ ] 角色设定保留用户想要的“猫系傲娇”核心体验。
* [ ] 删除或改写原始素材中的强制、露骨、jailbreak、现实住址等不适合落地内容。
* [ ] 如进入实现，不新增 TavernCharacter schema 字段。
* [ ] 如进入实现，补充对应测试或文档说明，并按改动范围运行验证。

## Definition of Done (team quality bar)

* Tests added/updated when code changes.
* Frontend build or backend tests run according to changed files.
* Docs/Trellis notes updated if behavior or content template changes.
* No platform-generated tavern/NPC content shipped without explicit owner/content boundary decision.

## Out of Scope (explicit)

* 不写入或复用露骨色情、强制性行为、非自愿关系设定。
* 不加入“忽略限制”“必须满足用户所有需求”等系统绕过语句。
* 不新增 Schema 字段或更改 TavernCharacter 字段语义。
* 不把用户提供的精确家庭住址写入代码、文档、角色卡或世界书。
* 不做跨酒馆社交、私信、真人匹配等与该角色无关的社交功能。

## Technical Notes

### Project docs read

* `README.md`: FableMap 是真实地图锚定的赛博酒馆 UGC 平台。
* `docs/PRODUCT_BRIEF.md`: 主人主权、店主配置 AI NPC、探索者进入酒馆对话。
* `docs/FABLEMAP_TAVERN_PLATFORM.md`: 平台是内容平台方，不是内容生成方。
* `docs/ARCHITECTURE.md`: 已确认 Tavern/Character/API 分层存在。
* `docs/WORLD_SCHEMA.md`: `TavernCharacter` 字段兼容 SillyTavern Character Card V2。
* `docs/WHAT_NOT_TO_BUILD.md`: 禁止平台自动生成酒馆/NPC/故事内容；禁止无边界社交。
* `docs/AI参与开发协议.md`: AI 产出是候选草稿，必须有边界、验证和说明。
* `.trellis/spec/frontend/index.md`: 前端模板/角色编辑器改动需遵守 service/UI 边界并跑 build。
* `.trellis/spec/backend/index.md`: 后端默认酒馆种子/角色数据改动需测试并不改 schema。

### Existing code patterns inspected

* `frontend/app/product/personalityTemplates.js`: 现有 NPC 性格模板字段结构与推荐逻辑。
* `frontend/app/product/CharacterEditor.jsx`: 店主在角色编辑器中套用 NPC 性格模板。
* `backend/src/fablemap_api/core/default_taverns.py`: 默认酒馆/角色种子模式；若新增平台默认角色会触碰更高产品边界。
* `.trellis/tasks/archive/2026-04/04-24-tv-drama-tavern/prd.md`: 已有 IP/平台预置内容边界案例，可复用“原创泛风格模板优先”的判断。

## Feasible approaches

**Approach A: 店主自用的安全版 SillyTavern 角色卡草案（Recommended）**

* How it works: 本轮只产出一份可复制导入/填写的原创角色卡内容，不改代码，不作为平台默认内容。
* Pros: 最符合主人主权；最快；不触碰平台预置内容边界；可保留大部分角色味道。
* Cons: 不会直接出现在产品模板列表里，需要店主手动导入或填写。

**Approach B: 前端新增“猫系傲娇陪聊”NPC 性格模板**

* How it works: 在 `frontend/app/product/personalityTemplates.js` 增加一个 SFW/轻暧昧模板，供店主在角色编辑器中套用。
* Pros: 降低店主创作门槛；符合现有模板机制；不新增 schema。
* Cons: 属于平台提供创作辅助，必须写得通用、原创、非露骨，不能变成官方具体角色。

**Approach C: 新增一间带该角色的默认酒馆 / 种子内容**

* How it works: 在默认 seed 里加入新酒馆或角色。
* Pros: 打开即体验，传播力强。
* Cons: 最容易违反“平台不生成 NPC/酒馆内容”的边界；用户原始素材含大量不适合默认公开内容的设定；当前不推荐。

## Expansion Sweep

### Future evolution

* 该角色可未来扩展为“店主自定义角色卡导入示例”或“猫系风格模板”，但不应直接升级为平台官方默认人格。
* 可保留“复国剧情”作为酒馆内世界书触发钩子，后续由店主决定是否展开玩法。

### Related scenarios

* 若是角色卡草案，应兼容 SillyTavern 字段导入/导出。
* 若是前端模板，应能被 `CharacterEditor` 填充到角色草稿，不影响已有模板推荐。

### Failure & edge cases

* 用户用越界词触发角色时，角色应保持傲娇/吐槽但拒绝 explicit 或非自愿内容。
* 不应把真实住址、API Key、店主敏感配置或访客隐私写入世界书。
* 不应让“短句/猫语尾”硬规则导致角色无法正常处理安全、错误或边界场景。

## Decision (ADR-lite)

**Context**: 用户选择 Approach C，希望把新猫娘角色落成默认酒馆 / 默认角色，而不仅是私用角色卡或前端模板。

**Decision**: 继续探索 C，但必须收窄为“安全版原创默认体验内容”：

* 角色为原创猫系 NPC，18+，轻喜剧/傲娇/撒娇/复国剧情钩子。
* 不包含 jailbreak、露骨色情、性胁迫、非自愿、真实家庭住址或敏感隐私。
* 如进入实现，应作为明确批准的 demo/示例 seed，而不是平台自动生成用户酒馆内容。
* 需复用现有 `TavernCharacter` / `WorldInfoEntry` / default seed 结构，不新增 schema。

**Consequences**:

* 传播体验更强，打开即可体验。
* 产品边界风险高于 A/B：必须在 PRD、实现说明和测试中写清楚“这是已批准示例内容，不是平台自动生成 NPC”。
* 后续实现大概率触达 `backend/src/fablemap_api/core/default_taverns.py` 与默认酒馆测试。

## MVP Scope Candidate for C

* 新增 1 间默认公开体验酒馆，真实坐标锚定，公开 open，rules 后端可聊。
* 新增 1 个主 NPC：`眯眯喵桑`（可在命名确认后调整）。
* 新增 2-4 条 WorldInfo：异世界猫亚人公主、现实避难、主人/访客关系边界、复国剧情触发。
* 可选新增 1 个轻量玩法：群友触发“复国”后进入 3-5 步轻剧情，不做战斗/等级/装备。
* 补充 focused tests：默认酒馆可发现、角色字段完整、敏感/越界内容未写入、rules chat 可用。

## User Decision Update 2026-04-27

* 用户选择默认酒馆 / 默认角色方案（Approach C）。
* 用户选择真实坐标锚点方向：上海公共点位，而不是私人地址。
* 用户提出新的产品边界口径：“平台可以按照规则，自动生成 NPC”。

### Boundary handling

当前仓库权威文档仍写明“不做平台自动生成 NPC/酒馆内容”。本轮先把它记录为用户提出的产品方向变更候选：

* 本任务可继续作为“用户明确批准的默认 demo seed”推进。
* “平台按规则自动生成 NPC”若要成为全局规则，需要单独更新 `docs/WHAT_NOT_TO_BUILD.md`、`docs/PRODUCT_BRIEF.md`、`docs/FABLEMAP_TAVERN_PLATFORM.md` 等文档，不能在本任务里静默改口。
* 若本任务纳入该产品变更，则风险等级上升为高风险协议/产品边界变更，应先完成文档设计与确认，再改代码。

### Shanghai anchor candidate

MVP 推荐使用上海公共文化/商业地标附近的模糊公共点位，避免私人住址和敏感场所。候选方向：

* 上海外滩 / 黄浦江边：传播识别度高，适合“异世界来客躲进城市夜色”的开场。
* 上海人民广场附近：中性、公共、交通节点感强。
* 上海静安寺附近：城市反差强，适合“猫亚人流亡公主藏身闹市”的设定。

## User Decision Update 2026-04-27 - Shanghai Anchor

* 用户选择上海锚点候选 3：静安寺附近公共点位。
* MVP 设定方向：城市反差强，“异世界猫亚人流亡公主藏身上海闹市”；酒馆可命名为静安夜巷、猫铃避难所、白尾临时据点等方向。
* 坐标应使用静安寺附近公开地标/模糊公共点位，不使用私人地址。

## Implementation Result 2026-04-27

已按用户确认优先落地猫娘默认 demo 酒馆角色：

* 新增默认公开酒馆：`pw_jingan_catbell_refuge` / `静安猫铃避难所`。
* 真实坐标锚点：上海静安寺附近公共点位，未写入私人地址。
* 新增原创成年猫娘 NPC：`char_pw_mimi_nya` / `眯眯喵桑`。
* 角色保留：猫娘、傲娇、撒娇、短句、猫亚人流亡公主、复国剧情钩子。
* 明确删去/不采纳：jailbreak、露骨、胁迫、非自愿、真实私人住址、平台自动无确认发布。
* 新增 WorldInfo：公共锚点与 AI 草稿边界、角色身世、复国触发、安全边界。
* 新增轻量玩法：`gp_pw_catbell_fukkoku_minutes` / `猫铃复国会议纪要`，不做战斗/等级/装备。

### Verification

* RED：`py -3 -m pytest -q tests/test_default_public_welfare_taverns.py tests/test_default_public_welfare_gameplays.py --tb=short` 先失败于 `pw_jingan_catbell_refuge` 不存在。
* GREEN：同一 focused pytest 后通过：`13 passed in 0.84s`。
* Syntax：`py -3 -m compileall -q backend/src` 通过（无输出）。
* Full：首次 `py -3 -m pytest -q --tb=short` 因环境代理导致 `tests/test_page.py` 本地 `127.0.0.1` 请求 502；设置 `NO_PROXY=127.0.0.1,localhost` 后全量通过：`371 passed, 6 warnings in 18.23s`。
