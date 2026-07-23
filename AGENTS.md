# AGENTS.md

本文件是 FableSpace 项目的 AI 协作硬约束入口。所有 AI / Codex / Claude / 其他 agent 在本仓库内工作时，必须先遵守本文件，再按任务读取相关文档。

## 适用范围

- 本文件适用于整个仓库。
- 若子目录未来出现更近层级的 `AGENTS.md`，该子目录内以更近层级文件为准。
- 不要把局部任务里的临时规则提升为全局规则，除非用户明确要求更新本文件。

## 项目定位

FableSpace 是一个真实坐标锚定的角色故事平台：玩家先选择私有游玩身份，再选择想见的角色，进入角色所属的完整故事世界。

当前主链路：选择游玩身份 → 角色优先发现 → 进入角色所属 Space → 对话 / 选择推动事件 → 写回私有记忆与关系 → 回访续写。

核心原则：

- 真实地图是空间锚点，空间必须挂接真实坐标。
- 故事正史优先：角色动机、世界规则、当前事件与后果必须稳定，不能被访客声明或跨世界能力覆盖。
- 历史题材的真实时间线是不可变正史：已核验事件的时间、地点、真实参与者、制度阶段与已知结果不得为了可玩性被改写。剧情只能在不与史料冲突的空白处安排原创角色和局部经历；来源不足的内容必须保持 `待核验`，运行时 AI 不得补写成事实。
- 角色差异优先：同一访客身份面对不同 NPC 时，必须得到不同立场、语言、交易与选择。
- AI 是 NPC 对话与连续性引擎，不在运行时擅自改写已发布的故事正史。
- 店主 / 创作者供给侧属于兼容能力，不是当前产品主线；新工作不得为了旧供给侧设定牺牲角色故事体验。
- 角色卡与数据格式应优先保持 SillyTavern 兼容和可导出。

## 权威文档读取顺序

开始任何中高风险工作前，至少按需读取：

1. `README.md`：项目总览、启动方式、核心模块。
2. `docs/INDEX.md`：既有文档导航。
3. `docs/PRODUCT_BRIEF.md`：产品定义与目标体验。
4. `docs/FABLESPACE_SPACE_PLATFORM.md`：空间平台主线设计。
5. `docs/WORLD_SCHEMA.md`：数据模型与 Schema 约束。
6. `docs/WHAT_NOT_TO_BUILD.md`：明确不做清单。

部署任务按需读取 `docs/DEPLOYMENT.md`；图片资产任务按需读取 `docs/IMAGE_ASSETS_SPEC.md`。AI 协作规则只在本文件维护，不在 `docs/` 保留重复副本。

如果文档与聊天中的临时说法冲突，除非用户明确改口，否则以仓库内权威文档为准。

## 工作流要求

- 新功能：复杂或不清晰的需求先在当前任务中明确目标、范围、约束和验证方式，再实现。
- Bug 修复：先复现 / 定位根因，再改代码；不要凭猜测大范围重构。
- 中高风险任务开始前，需要明确：目标、允许修改范围、不可修改范围、依据文档、验证方式。
- 一个改动尽量只做一类事情：协议变更、功能变更、内容变更不要混在一起。
- 不要未经用户确认移动、删除或重命名既有 `docs/` 文档。
- 每次功能/bug/重构级改动都要在最终汇报中留下可追踪说明；涉及长期产品、Schema、部署、架构边界或开发约束时，同步更新 README、对应权威文档或本文件。
- 任何要被项目引用或验收的 AI 生成图片，不能只停留在 `%USERPROFILE%\.codex\generated_images\`、临时目录或聊天预览里；必须在完成前上传到对象存储的 `fablespace/media/v1/` 不可变命名空间，登记 `deploy/cdn/media-manifest.json`，并让代码/文档引用 HTTPS URL。Git 不保存图片二进制。
- 生成的 NPC 图片资产必须保留 prompt sidecar：单张 NPC 头像 / 立绘 / 精灵图推荐命名为 `<image-stem>.prompt.md`；NPC 同一角色的一组表情图可共用一个 `expression-set.prompt.md`，但必须列出组内每张图片 URL、expression、尺寸、SHA-256、prompt 类型、负面约束、风格来源、identity locks 与核验时间。组级 sidecar 的 `## Final prompt` 只保留自然/neutral 单图 prompt，不要把五个表情 prompt 都写进去，以免生图时生成五表情同框；其它表情只作为资产清单/哈希覆盖记录。若找不到原始最终 prompt，必须用反向解析生成 `reverse-engineered` sidecar，并明确标注“不是原始生成 prompt”。非 NPC 的页面切图、UI 参考图、模块插画、审计截图或用户提供/裁切替换素材，不强制 sidecar；如需记录来源/处理方式，可写入任务记录、manifest、README 或最终汇报。
- 图片类任务完成前必须核对 `.codex/generated_images` 中本轮生成物是否已上传并进入媒体清单；未采用的生成图要明确标记为废稿/参考图，不得被项目引用。

## 禁止事项

- 不要让 AI 自由生成后原样提交；所有 AI 产出都是候选草稿。
- 不要擅自新增 Schema 字段、改变字段类型、枚举语义、必填/可选含义。
- 不要自创项目术语、缩写或中英文混用的新概念。
- 不要引用不存在的模块、接口、包、脚本或数据文件。
- 不要把局部区域 / 局部功能的规则污染成全局规则。
- 不要夹带无关格式化、重构或依赖升级。
- 不要实现 `docs/WHAT_NOT_TO_BUILD.md` 明确排除的方向，包括运行时 AI 未经评审改写故事正史、平台级 Token 付费、无锚点自由空间、访客间社交、传统地图 App 功能、战斗/等级装备系统等。
- 不要执行破坏性 git / 文件操作（如 reset、clean、删除大目录），除非用户明确要求并已确认范围。

## 代码规范

### Python 后端

- 兼容产品核心位于 `apps/api/src/fablespace_api/core/`；企业级 v1 后端位于 `apps/api/src/fablespace_api/`。当前仓库不保留 `tests/`、`apps/api/tests/` 这类 pytest 测试目录。
- 优先保持标准库 + `apps/api/requirements.txt` 中已有依赖；新增依赖必须先说明理由并获得确认。
- API / Schema 改动必须同步相关文档，并用当前保留的最小真实验证确认代码仍可运行。
- 持久化、对话历史、记忆写回相关逻辑要保持可落库、可回放、可测试。

### React Router / Vite 前端

- 前端位于 `apps/web/`；React Router Framework Mode + Vite + TypeScript 入口位于 `apps/web/app/`，迁移后的产品兼容模块位于 `apps/web/app/product/`。
- 不要无批准引入大型 UI 框架、状态管理库或地图渲染依赖。
- 组件改动应保持服务层边界：新路由 API 调用优先放在 `apps/web/app/lib/`；产品兼容模块 API 调用放在 `apps/web/app/product/services/`；可复用逻辑优先放在 hooks / utility 模块。
- 前端 UI 改动要考虑移动端和窄屏体验；涉及视觉/交互的改动应至少做 build，并在用户明确要求或确有验收需要时进行浏览器人工验证。Playwright 自检不作为交付前置要求。
- 前端图片资源改动必须遵守 `docs/IMAGE_ASSETS_SPEC.md`：生成图先上传对象存储并登记清单，再更新 URL 引用和验证，不允许报告“已替换”但实际仍引用旧图。

### 数据与兼容

- Space / SpaceCharacter / WorldInfoEntry / VisitorState 等核心数据结构必须与 `docs/WORLD_SCHEMA.md` 保持一致。
- SillyTavern 角色卡导入/导出兼容性不能被无意破坏。
- 店主 API Key、LLM 配置、Token 统计相关改动必须默认按敏感数据处理，不得写入日志或暴露给访客。

## 验证要求

按改动范围选择最小但真实的验证，不允许声称完成但未运行验证。

常用命令：

```powershell
# Python 语法检查
py -3 -m compileall -q apps/api/src

# 前端构建
npm --prefix .\apps\web run build
```

验证选择规则：

- 只改文档：检查目标文件内容与链接路径，通常无需跑全量测试。
- 只改图片资源：检查对象 key、CDN URL、尺寸/格式和 hash，确认 Git 跟踪图片数为零；如果前端会加载该资源，运行 `npm --prefix .\apps\web run build`。
- 改 Python：至少运行 `py -3 -m compileall -q apps/api/src`；当前仓库不保留 pytest 套件，除非用户明确恢复测试体系，不要新增或引用 pytest 验证入口。
- 改前端：至少运行 `npm --prefix .\apps\web run build`；类型或 API client 改动运行 `npm --prefix .\apps\web run typecheck`；当前 `apps/web/package.json` 不保留 `test` 脚本，不要新增或引用前端测试入口；浏览器人工验收和截图仅在用户明确要求或任务确有需要时执行，不以 Playwright 自检作为前置门槛。
- **高风险/视觉验收**：涉及 UI 还原度、用户提供素材映射或 source-of-truth 存在争议时，必须在完成前对照原始参考图 / Schema 进行对抗式自审，并记录 Verdict（PASS / FAIL / BLOCKED）与证据；当前环境没有专用自审技能时，仍按同一标准人工完成。
- 改 API / 数据模型 / 协议：必须更新对应文档，并运行当前保留的最小真实验证；不要为此恢复已删除的测试体系，除非用户明确要求。
- 验证失败要如实报告失败命令、失败原因和下一步，不要包装成成功。

## 变更汇报格式

完成任务时，简明列出：

- 改了哪些文件。
- 为什么改。
- 验证命令与结果。
- 未做事项 / 风险 / 需要用户确认的点。

不要声称“完成”“通过”“没问题”，除非已经有本轮新鲜验证输出支撑。
