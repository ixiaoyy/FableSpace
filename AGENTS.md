# AGENTS.md

本文件是 FableSpace 项目的 AI 协作硬约束入口。所有 AI / Codex / Claude / 其他 agent 在本仓库内工作时，必须先遵守本文件，再按任务读取相关文档。

## 适用范围

- 本文件适用于整个仓库。
- 若子目录未来出现更近层级的 `AGENTS.md`，该子目录内以更近层级文件为准。
- 不要把局部任务里的临时规则提升为全局规则，除非用户明确要求更新本文件。

## 项目定位

FableSpace 是一个角色故事平台：玩家因想见一个角色而进入其所属的完整故事世界，通过对话和选择建立关系、经历事件，并在回访中延续彼此的故事。

当前主链路：

```text
首页直接发现角色
  -> 选择想见的角色
  -> 查看一句故事处境与该故事固定 PlayerRole
  -> 进入角色开场
  -> 自由对话 / 人工编写的关键选择
  -> 写回关系、故事进度和私有记忆
  -> 回访时恢复已有结果
```

核心原则：

- 角色优先：公开入口是 Character，不要求玩家先浏览 StoryWorld 目录或全局身份目录。
- 角色属于完整世界：动机、语言、当前事件、世界规则与后果必须受所属 StoryWorld 约束。
- 身份属于故事：P0 每个 StoryWorld 只有一个固定 PlayerRole，不提供全局身份、性别选择或用户自定义 Prompt。
- 人工骨架约束 AI：章节、关键选择、状态转换和结局由系统审核；AI 只在边界内理解自由输入和演绎 Character。
- 私有连续性：PlayerStoryState 按玩家与 StoryWorld 隔离，保存进度、关系、关键选择、记忆和回访结果。
- 历史时间线不可改写：经核验的时间、地点、真实参与者、制度阶段与公开结果属于固定史实；来源不足保持 `待核验`。
- 当前只发布系统策划、人工审核并可版本化的故事，不开放用户创建、店主供给或角色卡生态。

当前 P0 只包含：

- 1854 年宽街：Character 为安妮，固定 PlayerRole 为“乞丐”。
- 长明宫·雪夜封宫：Character 为魏观海、萧明珠，固定 PlayerRole 为“小太监”。

青槐驿与临川大学保留为待重写候选，在 PlayerRole、角色反应、剧情骨架和连续性完成评审前不得进入 P0 公开发现。

## 权威文档读取顺序

开始任何中高风险工作前，至少按需读取：

1. `README.md`：项目总览、启动方式、核心模块。
2. `docs/INDEX.md`：当前有效文档导航。
3. `docs/PRODUCT_BRIEF.md`：产品定义、P0 内容和目标体验。
4. `docs/FABLESPACE_SPACE_PLATFORM.md`：角色故事平台主线与能力边界。
5. `docs/WORLD_SCHEMA.md`：StoryWorld 与玩家运行时数据合同。
6. `docs/WHAT_NOT_TO_BUILD.md`：明确不做清单。

部署任务按需读取 `docs/DEPLOYMENT.md`；图片资产任务按需读取 `docs/IMAGE_ASSETS_SPEC.md`；历史题材任务同时读取 `.trellis/spec/guides/historical-content-integrity.md`。AI 协作规则只在本文件维护，不在 `docs/` 保留重复副本。

如果文档与聊天中的临时说法冲突，除非用户明确改口，否则以仓库内权威文档为准。若权威文档彼此冲突，先停止协议实现并修正文档，不得自行选择有利版本。

## 工作流要求

- 新功能：复杂或不清晰的需求先在当前任务中明确目标、范围、约束和验证方式，再实现。
- Bug 修复：先复现或定位根因，再改代码；不要凭猜测大范围重构。
- 中高风险任务开始前，需要明确：目标、允许修改范围、不可修改范围、依据文档、验证方式。
- 一个改动尽量只做一类事情：协议变更、功能变更、内容变更和旧能力清退不要混在一起。
- 不要未经用户确认移动、删除或重命名既有 `docs/` 文档。
- 每次功能、bug 或重构级改动都要在最终汇报中留下可追踪说明；涉及长期产品、Schema、部署、架构边界或开发约束时，同步对应权威文档。
- 新主链路验收前，旧代码可能暂时存在；它是待清退实现，不是新代码可继续扩展的兼容标准。
- 删除旧入口、API、表、配置或部署项前，必须完成引用审计，核对精确目标，记录备份与回滚边界。不得在应用启动时静默清库。
- 保留用户当前工作区已有改动；只修改当前任务范围，禁止用整文件还原覆盖其他人的未提交工作。

## 图片资产

- 任何要被项目引用或验收的 AI 生成图片，不能只停留在 `%USERPROFILE%\.codex\generated_images\`、临时目录或聊天预览里；必须在完成前上传到对象存储的 `fablespace/media/v1/` 不可变命名空间，登记 `deploy/cdn/media-manifest.json`，并让代码或文档引用 HTTPS URL。Git 不保存图片二进制。
- 生成的 Character 图片资产必须保留 prompt sidecar：单张头像、立绘或精灵图推荐命名为 `<image-stem>.prompt.md`；同一角色的一组表情图可共用 `expression-set.prompt.md`，但必须列出组内每张图片 URL、expression、尺寸、SHA-256、prompt 类型、负面约束、风格来源、identity locks 与核验时间。
- 组级 sidecar 的 `## Final prompt` 只保留自然 / neutral 单图 prompt，不要把多个表情 prompt 写成同框生成指令；其他表情作为资产清单和哈希覆盖记录。
- 找不到原始最终 prompt 时，必须用反向解析生成 `reverse-engineered` sidecar，并明确标注“不是原始生成 prompt”。
- 非 Character 的页面切图、UI 参考图、模块插画、审计截图或用户提供 / 裁切替换素材不强制 sidecar；来源和处理方式可记录在任务、manifest、README 或最终汇报。
- 图片任务完成前必须核对 `.codex/generated_images` 中本轮生成物是否已上传并进入媒体清单；未采用生成图要明确标记为废稿或参考图，不得被项目引用。

## 禁止事项

- 不要让 AI 生成的系统内容或图片未经人工审核就作为最终产物提交；运行时 Character 对白仍必须经过输出和状态边界校验。
- 不要擅自新增 Schema 字段、改变字段类型、枚举语义、必填 / 可选含义。
- 不要自创项目术语、缩写或中英文混用的新概念。
- 不要引用不存在的模块、接口、包、脚本或数据文件。
- 不要把局部区域或局部功能的规则污染成全局规则。
- 不要夹带无关格式化、重构或依赖升级。
- 不要让运行时 AI 直接改写 StoryWorld 正史、章节、关键标记、关系结果或永久结局。
- 不要恢复或扩展地图 / LBS、用户创作、店主 / owner、SillyTavern、公开访客社交、平台 Token 计费、战斗 / 等级 / 装备等已删除方向。
- 不要为 `Space`、`SpaceCharacter`、`VisitorState`、`play_identity`、旧路由或旧开发数据新增长期兼容适配器。
- 不要执行破坏性 Git 或文件操作（如 reset、clean、删除大目录），除非用户明确要求并已确认精确范围。

## 领域与数据约束

- 新领域统一使用 `StoryWorld`、`Character`、`PlayerRole`、`PlayerStoryState`、`StoryRun` 和 `CharacterRelationship`。
- `NPC` 只描述 Character 由 AI 演绎的运行方式，不作为持久化实体名。
- 新 API 与路由使用 `story_world_id`、`character_id` 和 `/story-worlds/...`，不新增 `/spaces` 或中文兼容路由。
- P0 每个 StoryWorld 只有一个固定 PlayerRole；客户端不能提交任意身份 Prompt、PlayerRole 或 `player_id`。
- `player_id + story_world_id` 唯一定位 PlayerStoryState；登录账号或匿名访客标识由服务端可信边界解析。
- StoryRun 锁定 `content_version`，关键选择在轮次中不能回退；结局后新轮次不继承上一轮好感度和故事标记。
- CharacterRelationship 的连续好感度只供内部计算；前端只显示角色态度、关系阶段和变化原因。
- 系统内容与玩家运行时数据分离：StoryWorld 内容来自可审查的版本化注册表，数据库保存玩家身份映射和私有运行状态。
- 系统 LLM 模型、API Key、服务地址和生成参数由部署环境统一管理，不属于 owner 或 StoryWorld 数据。
- 对话、PlayerStoryState、StoryRun、关系、选择、记忆和事件属于玩家私有数据，不进入公开发现响应。
- 具体字段、枚举、唯一性、发布状态和写回边界必须与 `docs/WORLD_SCHEMA.md` 一致。

## 历史内容约束

- 历史 StoryWorld 必须先锁定固定史实，再设计原创角色和分支。
- 固定史实至少包括经核验的时间或时间范围、地点、真实参与者、可证实同场关系、制度阶段和已知公开结果。
- 史料没有记载不等于自动获得虚构许可；原创设定必须核对其最远后果不会改变固定史实。
- `史实`、`剧情设定`、`待核验` 必须分层记录；运行时 AI 不能改变层级。
- 真实人物不得拥有无出处的原话、私密动机或确定性心理描写。
- 玩家可以改变原创 Character 的信任、选择、局部经历和私有回访结果，不能改变真实历史节点或公开结果。
- 当前历史 StoryWorld 不提供架空历史分支；任一关键前提无法核验时停止发布。
- 以儿童作为历史见证者时必须明确其原创身份；禁止恋爱、暧昧、成人、性化、诱导依附、强迫和血腥猎奇内容。

## 代码规范

### Python 后端

- 后端位于 `apps/api/src/fablespace_api/`；旧兼容实现可能仍位于 `core/`，但新 StoryWorld 代码不得以旧 Space 合同为设计依据。
- 优先保持标准库和 `apps/api/requirements.txt` 中已有依赖；新增依赖必须先说明理由并获得确认。
- API、Schema 或持久化改动必须同步相关权威文档，并用当前保留的最小真实验证确认代码可运行。
- StoryWorld 内容加载必须校验引用和内容版本；运行时写回必须结构化、可追踪、可回放。
- 玩家身份解析必须在服务端完成；不得信任客户端提交的任意 player ID。
- 当前仓库不保留 `tests/`、`apps/api/tests/` 这类 pytest 测试目录。除非用户明确恢复测试体系，不要新增或引用 pytest 入口。

### React Router / Vite 前端

- 前端位于 `apps/web/`；React Router Framework Mode + Vite + TypeScript 入口位于 `apps/web/app/`。
- `apps/web/app/product/` 中仍可能存在旧兼容模块；新 StoryWorld 功能不得继续扩大旧 Space 服务边界。
- 新路由 API 调用优先放在 `apps/web/app/lib/`；可复用逻辑优先放在 hooks 或 utility 模块。
- 不要无批准引入大型 UI 框架、状态管理库或地图渲染依赖。
- 首页以 Character 为入口；不得重新加入世界目录或全局身份选择作为必经步骤。
- 前端 UI 改动要考虑移动端和窄屏体验；涉及视觉或交互的改动至少运行 build，并在用户明确要求或任务确有验收需要时进行浏览器人工验证。Playwright 自检不作为交付前置要求。
- 加载、空、失败和回访状态必须使用真实数据，不得以虚构角色、占位 StoryWorld、伪造统计、伪时间或示例记忆兜底。
- 前端图片资源改动必须遵守 `docs/IMAGE_ASSETS_SPEC.md`：生成图先上传对象存储并登记清单，再更新 HTTPS URL 引用和验证。

## 验证要求

验证强度与改动风险相匹配，不允许声称完成但没有本轮新鲜验证输出。

常用命令：

```powershell
# Python 语法检查
py -3 -m compileall -q apps/api/src

# 前端类型检查
npm --prefix .\apps\web run typecheck

# 前端构建
npm --prefix .\apps\web run build
```

验证选择规则：

- 只改文档：检查目标文件内容、术语一致性和链接路径，通常无需运行代码构建。
- 只改图片资源：检查对象 key、CDN URL、尺寸、格式和 hash，确认 Git 跟踪图片数为零；如果前端会加载该资源，运行前端 build。
- 改 Python：至少运行 `py -3 -m compileall -q apps/api/src`。
- 改前端：至少运行前端 build；类型或 API client 改动同时运行 typecheck。
- 改 API、数据模型或协议：同步 `docs/WORLD_SCHEMA.md` 与相关权威文档，运行代码层最小真实验证；不要为了验证恢复已删除的测试体系。
- 改 StoryWorld 内容：运行内容引用和版本校验；历史故事同时按固定史实、剧情设定、待核验三层做对抗式自审并记录 Verdict 与证据。
- 高风险或视觉验收：涉及 UI 还原度、用户素材映射或 source-of-truth 争议时，完成对抗式自审并记录 Verdict（PASS / FAIL / BLOCKED）与证据。
- 浏览器人工验收和截图只在用户明确要求或任务确有需要时执行，不以 Playwright 自检作为通用前置门槛。
- 验证失败要如实报告失败命令、失败原因和下一步，不要包装成成功。

## 变更汇报格式

完成任务时，简明列出：

- 改了哪些文件。
- 为什么改。
- 验证命令与结果。
- 未做事项、风险和需要用户确认的点。

不要声称“完成”“通过”或“没问题”，除非已经有本轮新鲜验证输出支撑。
