# brainstorm: 嵌入式剧情小游戏 + 游戏工坊空间设计

## Goal

为“让聊天玩法不再单调”提供一套可落地的方向：

1. 在已存在的空间内加入更多可直接玩的小型剧情玩法；
2. 新增一个“游戏工坊”空间，提供老开源小游戏的直接可玩入口。

本轮仅做 Trellis 头脑风暴，不执行实现。

## User Signal / 现有事实

* 你提出了两个明确方向：
  * “空间内嵌一点剧情小游戏”；
  * “新增游戏工坊空间，内嵌老的开源小游戏，可直接玩”。
* 仓库已确认事实（待复用，不再做与主线冲突的内容）：
  * 主线仍是真实地图锚点空间；
  * 店主是内容与体验主权方；
  * AI 只做 NPC 对话与辅助，不可替代店主发布。
  * 已有 `GameplayDefinition` / `GameplaySession` 能作为“轻量玩法骨架”；
  * 已有 `layout_style='quest-play'` / `hybrid-room` 可用于玩法入口化空间。
  * 现有 schema `place_type` 枚举目前固定为 `tavern/cafe/milk-tea-shop/restaurant/convenience-store/bookstore/school/hospital/home`，新增值需要后端+前端联动更改。

## Constraints (已知边界)

* 不做平台级付费经济、战斗、等级、装备、竞技排行榜。
* 不做无锚点自由空间；空间要么 `home`（私有）要么挂在公开地图坐标下。
* 不做平台自动发布：玩法/剧情必须可编辑、可审核、店主确认。
* 不把“小游戏”变成平台级游戏中心，避免脱离空间体验。

## Approach A（推荐优先）

### A1. 以现有 GameplayDefinition 为主：空间内剧情“小剧场”玩法增强

**做法**：复用 `Tavern.gameplay_definitions`，先做 2–4 个“叙事型微玩法模板”（事件+选择+再来一次+提示）。

**价值**

* 风险低：前后端 schema 基本不动；符合当前开发边界。
* 体验快：直接和现有 `GameplayManager / GameplaySessionPanel` 对接。
* 规矩稳：店主确认、访客会话私有、回放可做。

**建议模板方向**

* “救场/判词”型：3–5 步剧情选择。
* “误会/线索”型：多分支小互动。
* “目标驱动”型：到达目标才算完成，可复玩。

### A2. 叙事玩法与场景卡位（空间内嵌）

**做法**：在 tavern 详情页增加“玩法入口卡片”，按既有布局进入 `GameplaySessionPanel`。

**边界**

* 不添加跨空间社交系统；
* 不添加传统闯关数值循环；
* 仍以聊天→玩法→回访为主线。

## Approach B（下一步可实现）

### B1. 游戏工坊（薄层，不新增 schema）

**做法**：把“游戏工坊”实现为“可见主题化 tavern”，例如 `layout_style='quest-play'` + 特定世界文案 + 一组 `GameplayDefinition` 触发卡；并在该空间展示“小游戏工作台”。

**实现约束（不改 schema）**

* 先用现有 `place_type` 映射到可见类型（如 `bookstore`/`cafe` 之一）；
* 在描述/标签/世界书中写明“游戏工坊主题”；
* 仅内置少量可控玩法，不开放 owner 任意上传。

### B2. 游戏工坊（有 schema 扩展）

**做法**：新增 `place_type='game-workshop'` 或专用元数据开关。

**优点**

* 便于后续分类、筛选、默认模板。

**代价**

* 需要跨层改动（backend/frontend/schema/docs/test）；
* 必须同步更新约束：默认值、验证、兼容路径、兼容未知类型。

## Approach C（当前用户主诉点：直接玩开源小游戏）

### C1. 开源小游戏“嵌入式画廊”（MVP）

**做法**：先不做通配上传，先建一个“允许列表”——例如 2048 这类经典轻量游戏（纯静态前端资源）。

**技术要求**

1. 游戏文件必须作为仓库资产收敛（或只引用可信稳定来源）；
2. 每个游戏有许可清单：`name/source_url/license_file/license_version/attribution`；
3. 前端以 `<iframe>` 作为隔离视图加载。

**Security notes（基于官方文档）**

* MDN 的 `sandbox` 会施加脚本/表单/弹窗/导航等限制；若需要脚本则常见会加 `allow-scripts`。
* MDN 同时提醒：`allow-scripts + allow-same-origin` 在同源场景会弱化隔离，因此需谨慎；
* 应避免 `allow-popups` 等扩展权限，默认加标题与尺寸限制，并配合 `CSP` 的资源域收敛。

## Approach D（与你新诉求最匹配）：空间属性驱动“聚合能力平台”

### D1. 以 `place_type/layout_style/world_info/skill_packs` 做空间能力图

**目标**：每个空间保留主线定位，但在“空间详情页”聚合一组常用功能模块，像“轻量平台”一样可操作。

**能力图映射（不改 Schema）**

1. `place_type` 决定默认能力卡片  
   - `school`：流程协助 / 材料分诊 / 需求吧台；  
   - `hospital`：陪伴清单 / 风险边界提示 / 回访便签；  
   - `bookstore/cafe`：资料查找 / 创作工坊 / 回访信笺；  
   - `restaurant/milk-tea-shop`：陪伴清单 / 需求澄清 / 回访便签；  
   - `home`：私密待办 / 回访摘要 / 下一次提醒。
2. `layout_style` 决定展示顺序  
   - `quest-play`：玩法卡片优先；  
   - `hybrid-room`：聊天/玩法并列；  
   - `npc-chat`：陪伴与资料模块更前置；  
   - `lobby`：保留邀请/反馈类入口优先。
3. `world_info` 与 `scene_prompt` 用于“加权补齐”  
   命中“材料/流程/报修/咨询/回访”等语义词时，自动解锁对应功能卡（可配置白名单）。  
4. `skill_packs` 作为显式开关  
   例如 `local-rumor` 仅提供情境补充能力，不参与任何全局社交或交易系统。

### D2. “聚合卡片”落地模型（当前前端可先实现）

在 `TavernChatWorkbench` 的「更多空间功能」区增加 4 层卡片面板：

* **聊天核心**：邀请/回访反馈（当前已有）；  
* **互动玩法**：已有的 `gameplay_definitions`（剧本/流程微任务）；  
* **工作助手**：需求整理、流程引导、资料提示（先用既有模板能力，内容保持通用）；  
* **小游戏工坊**：白名单小游戏（2048 这类）入口。

每个卡片包含「一键开始」「完成后回到聊天」「可给店主复核摘要」三件套，这样“聊天→玩法→回访”闭环不变形。

### D3. 深度与专业性（前期保持轻量）

* 前期不做行业级深流程判定；先打通通用、可复用的轻量链路：  
  - `需求整理（可复核）→ 任务清单（可归档）→ 回访提醒（可发给店主）`
* 根据 `place_type` 做“默认卡片排序”差异（例如 school / hospital / bookstore），但不新增复杂行业规则引擎。
* NPC/AI 回答只生成“建议草案 + 风险边界”，不替代医疗/法律等最终决策。  
* 同一能力可在不同空间重复复用，但展示和默认排序由空间属性差异化。  

### D4. 两阶段建议

* **第1阶段（本任务）**：先做“空间能力图 + 能力卡片入口”与现有玩法联动（不改 Schema），并采用轻量通用链路。  
* **第2阶段（后续）**：再考虑新增能力配置字段（如 `space_capability_profile`）做 owner 可配置化，必要时跨层变更 schema/API。  

### D5. 为什么不是真正“平台化”

不新增平台好友、消息中台、排行榜或跨店主内容托管；  
不引入平台统一资产市场；  
每个空间内容与能力仍归属本空间 owner，可编辑与可下线，用户行为仍在单空间入口闭环中。

## 结论建议（当前最小共识）

### 推荐收敛到两段式：先 D，再 A，随后 B2/C1 作为二阶段

**第1阶段（本周可落地）**：先做 D1/D2（空间能力聚合枢纽），再补 A1/A2（故事小玩法）让“聊天+玩法+回访”形成完整闭环。

**第2阶段（再确认后）**：再做 B1（无 schema 变更）或 B2（新增 play-space 类型）+ C1（精选 OSS 游戏）。

## 可直接拿去做的 MVP 列表

1. “空间小剧场玩法”模板 3–5 套（无 schema 变化）。
2. “游戏工坊主题页签”与玩法入口卡（无需 `place_type` 变更）。
3. “允许列表”中的 OSS 游戏清单（先只放 2048 这类许可清晰的静态游戏）。
4. 嵌入器安全基线（sandbox + postMessage 通信 + 许可显示）。

## Open Questions（已定稿）

已确认：走轻量版 D（空间能力聚合枢纽）优先，优先级如下（并持续保持轻量化，不做深流程行业规则）：

1. **第一优先级：D1/D2（轻量版）**：空间能力聚合枢纽 + 通用轻量链路（需求整理→任务清单→回访提醒）。  
2. **第二优先级：A1/A2**：剧情小玩法（已有 GameplayDefinition）。  
3. **第三优先级：B1/C1（二阶段）**：B1（无 schema 变更）和/或 C1（精选 OSS 小游戏）按实际节奏接入。  

说明：当前不做“行业级深流程判定”与复杂专业模板，避免前期超范围。

## Research notes (简明) 

### 与玩法方向相关的已知可复用点

* `GameplayDefinition` 已在前端/后端链路稳定；
* `layout_style` 已有 `quest-play/hybrid-room`；
* 地图与空间主权边界不变。

### 开源许可证与合规检查方向

* 已确认：gabrielecirulli 版 2048 的 `LICENSE.txt` 为 MIT；
* 参考上同系 fork `mk314k/2048` 也注明 MIT；
* 另一些老游戏（如 Hextris）为 GPL，若要避免兼容复杂度可暂不进入第一批。

### 嵌入安全方向

* MDN 的 `iframe` 与 `sandbox` 文档已覆盖：
  * token 属性可精细放权（例如 `allow-scripts`）；
  * 同时放行 `allow-scripts` 与 `allow-same-origin` 会降低隔离；
* CSP 可用于收紧资源加载（例如 `default-src`、`script-src`、`frame-src`）。

## Out of Scope（本轮）

* 未决策的地方：平台级上传包审核系统、沙箱外运行的用户脚本、对战/排行榜、付费复活、跨店主社交网关。
* 未引入新数据模型前不承诺“任何旧游戏都可无审查上线”。

## Execution-ready split (if you approve)

可直接继续拆分为 3 个 child task（按你的优先级）：

1. `...-space-capability-hub-mvp`：基于 `place_type/layout_style/world_info/skill_packs` 做空间能力图映射，补齐“聚合平台”入口。  
2. `...-story-microgame-template-mvp`：完善剧情模板库（前端优先）。  
3. `...-game-workshop-curated-oss-minigames`：先落地“1 个可玩游戏 + 游戏工作台 + 安全基线”。



### 参考资料（本轮研究）

* 2048 开源许可示例： [gabrielecirulli/2048 LICENSE](https://github.com/gabrielecirulli/2048/blob/master/LICENSE.txt)
* 旧版 2048 fork 许可证页面（MIT 归类示例）：[mk314k/2048](https://github.com/mk314k/2048)
* MDN `iframe` 与 sandbox 约束说明：[MDN iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)
* MDN CSP 指南：[CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)

## 2026-05-12 Closure Note

This task is closed as `brainstorm_complete`. Closed as brainstorm complete: PRD captures approved priority order and follow-up split. Related lightweight mini-game/gameplay template tests now pass in the current frontend suite.

Deferred / not done:
- Additional game workshop/OSS embedding beyond the existing curated slice remains future scoped work.
