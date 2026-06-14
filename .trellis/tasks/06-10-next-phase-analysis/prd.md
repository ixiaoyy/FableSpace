# Next Phase Product Analysis - FableMap

## 分析校准说明

本文是下一阶段候选方向分析，不是已批准 Roadmap，也不是最终需求承诺。下文的价值判断允许带有个人视角，但所有“当前状态”和“已有能力”必须尽量绑定到可核对证据；证据不足的地方统一写成“待确认”或“需验证”，避免把猜测写成结论。

### 本轮核对依据

- 产品边界：`README.md`、`docs/PRODUCT_BRIEF.md`、`docs/FABLEMAP_TAVERN_PLATFORM.md`、`docs/WHAT_NOT_TO_BUILD.md`。
- 数据/API 边界：`docs/ARCHITECTURE.md`、`docs/WORLD_SCHEMA.md`。
- Trellis 约束：`.trellis/workflow.md`、`.trellis/spec/frontend/index.md`、`.trellis/spec/backend/index.md`。
- 代码抽查：`backend/src/fablemap_api/api/v1/router.py`、`backend/src/fablemap_api/api/v1/taverns.py`、`backend/src/fablemap_api/api/v1/runtime.py`、`backend/src/fablemap_api/api/v1/notifications.py`、`backend/src/fablemap_api/api/v1/gameplay.py`、`backend/src/fablemap_api/api/v1/state_cards.py`、`frontend/app/routes/home.tsx`、`frontend/app/lib/homepage-taverns.ts`、`frontend/app/lib/tavern-first-minute.ts`、`frontend/app/product/TavernMemoryPanel.jsx`。

### 分析写法约定

| 标记 | 含义 |
|------|------|
| 已核对 | 本轮在代码或权威文档中看到直接证据。 |
| 推断 | 基于现有实现和产品方向的合理判断，仍需需求评审。 |
| 待验证 | 需要真实数据、用户反馈、运行截图或接口测试才能定论。 |
| 边界风险 | 可能触碰 `WHAT_NOT_TO_BUILD.md` 或 Schema 权限边界，需要先收敛。 |

### 必须守住的产品边界

- 空间必须绑定真实 `lat/lon`，发现优化不能滑向传统导航/POI 评分。
- AI 可以辅助生成候选，但店主确认前不能发布为正史、NPC、玩法或公开内容。
- 店主 LLM Key、Token 统计、访客记忆和运行时状态默认敏感，不进入公开分享 payload。
- 回访、分享、奖励类能力要避免通用社交、排行榜、平台钱包、充值、Token 配额或增长裂变系统。
- 状态卡、玩法和记忆要服务“空间/NPC/访客关系连续性”，不能变成战斗、等级、装备系统。

## 当前项目阶段总结

### 已核对的核心能力

| 区域 | 证据等级 | 说明 |
|------|----------|------|
| 空间发现 | 已核对 | `frontend/app/routes/discover.tsx`、`GET /api/v1/taverns` 已支持搜索和 `lat/lon/radius` 参数。地图视图/距离展示仍需单独确认。 |
| 空间进入 | 已核对 | `frontend/app/routes/tavern.tsx`、`POST /api/v1/taverns/{id}/enter` 存在；密码/私密规则需按具体用例测试。 |
| NPC 聊天 | 已核对 | `TavernChatWorkbench`、`/api/v1/chat`、`/api/v1/taverns/{id}/chat` 相关能力存在。 |
| 店主管理 | 已核对 | `tavern-owner-management` 与 `TavernOwnerPanel` 已有较多面板，当前问题更像信息架构和高频入口整理。 |
| 角色卡导入 | 已核对 | 角色解析/导入/导出接口存在；兼容范围需以现有测试为准。 |
| 第一分钟引导 | 已核对 | `buildTavernFirstMinuteGuide` 已输出 `anchorLine/whyHere/experienceType/tryThisFirst/quickActions`。 |
| 通知系统 | 已核对 | `/api/v1/notifications` 已有站内通知 REST/WebSocket；回访提醒调度还不应默认视为已具备。 |
| 玩法/状态卡/记忆 | 已核对 | gameplay、state_cards、memory-atoms API 存在；可视化和回访动机仍是体验层问题。 |
| 分享功能 | 已核对 | `GET /api/v1/taverns/{id}/share` 是 public-safe payload；当前不是邀请码、奖励或统计系统。 |
| 领地/关系图谱 | 已核对 | API 和组件线索存在；是否进入下一阶段主线需结合真实使用场景。 |

### 已核对的技术模块

| 模块 | 路径 | 说明 |
|------|------|------|
| Tavern CRUD | `/api/v1/taverns` | 列表、创建、读取、更新、删除、进入、指标、访客备注等。 |
| NPC 管理 | `/api/v1/characters` | 角色增删改查与工具接口。 |
| 聊天对话 | `/api/v1/chat`、`/api/v1/taverns/{id}/chat` | LLM/runtime 能力存在，具体 fallback/计费统计需按服务实现验证。 |
| 记忆系统 | `/api/v1/taverns/{id}/memory-atoms` | 记忆原子列表、创建、编辑、删除、反馈。 |
| 状态卡 | `/api/v1/taverns/{id}/state-cards` | 候选/确认流程存在；可视化不等于新增 Schema。 |
| 玩法定义 | `/api/v1/taverns/{id}/gameplays` | 店主玩法定义与访客 session 流程存在。 |
| LLM 测试 | `/api/v1/llm/test-config`、`/api/v1/taverns/{id}/test-llm` | 已有测试接口，配置向导应优先复用。 |
| 首页聚合 | `/api/v1/platform/stats`、`/api/v1/platform/recent-memories` | 已有公开聚合契约，首页增强不必默认新增 homepage 聚合 API。 |

### 当前产品阶段

**阶段定义（推断）**: 核心能力已具备雏形 → 体验收敛与信息架构优化期。

**核心闭环方向已具备实现基础**:
```
发现空间 → 进入空间 → NPC 引导 → 对话互动 → 留下记忆 → 回访
```

**待优化环节（按当前分析）**:
1. 首页入口体验
2. 第一分钟引导系统
3. NPC 主动引导机制
4. 店主配置体验
5. 访客回访动机
6. 发现效率提升

---

## 下一阶段需求方向

### P0: 核心体验优化（必须做）

| ID | 需求 | 价值 | 复杂度 |
|----|------|------|--------|
| P0-1 | 首页空间展示增强 | 提升首次访问理解和进入率 | 中 |
| P0-2 | 第一分钟引导系统完善 | 降低进入门槛，强化“这个空间怎么玩” | 低-中 |
| P0-3 | NPC 主动引导机制 | 增强空间生命力，但需严格控制触发和写入边界 | 高 |
| P0-4 | 新手引导流程 | 帮探索者完成第一次空间体验 | 中 |

### P1: 店主工具完善（应该做）

| ID | 需求 | 价值 | 复杂度 |
|----|------|------|--------|
| P1-1 | 店主后台优化 | 提升配置效率 | 中 |
| P1-2 | NPC 快速配置 | 降低创建门槛 | 低 |
| P1-3 | LLM 配置向导 | 简化接入流程 | 中 |
| P1-4 | 空间数据统计 | 增强运营能力 | 低 |

### P2: 发现与回访增强（可以做）

| ID | 需求 | 价值 | 复杂度 |
|----|------|------|--------|
| P2-1 | 地理发现优化 | 提升发现效率 | 高 |
| P2-2 | 回访提醒系统 | 增强回访理由，但当前只宜先做站内/预览/opt-in | 中-高 |
| P2-3 | 访客记忆卡片 | 强化回访动机 | 中 |
| P2-4 | 分享机制增强 | 降低分享理解成本，不建议做奖励裂变 | 低-中 |

### P3: 高级功能（探索）

| ID | 需求 | 价值 | 复杂度 |
|----|------|------|--------|
| P3-1 | 玩法包/技能包增强 | 丰富内容形态，但应先做 owner-local 管理/导入预览 | 高 |
| P3-2 | 状态卡可视化 | 增强沉浸感 | 中 |
| P3-3 | 多空间联动 | 扩展空间关系，但需防止变成通用社交/游戏地图 | 高 |

---

## 下一阶段优先级建议

### 第一优先级: P0-2、P0-4、P1-2、P1-3

**理由**: 这些任务最贴近“进入空间后马上知道怎么玩”和“店主能更快配置可玩的 NPC”。其中 P1-3 可直接复用已有 `/api/v1/llm/test-config`，对店主接入真实 NPC 对话很关键。

### 第二优先级: P0-1、P1-1、P1-4、P2-3

**理由**: 首页、后台、统计、记忆卡片都更偏“已有能力的可见性和信息架构”。价值明确，但需要先确认当前数据是否足够支撑。

### 第三优先级: P0-3、P2-1、P2-2、P2-4

**理由**: 这些方向价值较高，但容易触碰打扰、地图依赖、增长裂变或 LLM 自动生成边界。建议先做本地规则/站内/只读增强，不急于上调度、push、奖励或新 Schema。

### 第四优先级: P3-1 ~ P3-3

**理由**: 都属于平台扩展能力，需要先跑通 P0/P1 的基础体验，并把 owner 确认、公开 payload、访客隐私和跨 owner 治理边界写清楚。

---

## 详细任务列表

### P0: 核心体验优化（必须做）

| ID | 任务 | 优先级 | 复杂度 |
|----|------|--------|--------|
| [homepage-enhancement.md](homepage-enhancement.md) | 首页空间展示增强 | P0 | 中 |
| [first-minute-guide-system.md](first-minute-guide-system.md) | 第一分钟引导系统完善 | P0 | 中 |
| [npc-proactive-guidance.md](npc-proactive-guidance.md) | NPC 主动引导机制 | P0 | 高 |
| [newcomer-guidance-flow.md](newcomer-guidance-flow.md) | 新手引导流程 | P0 | 中 |

### P1: 店主工具完善（应该做）

| ID | 任务 | 优先级 | 复杂度 |
|----|------|--------|--------|
| [owner-dashboard-optimization.md](owner-dashboard-optimization.md) | 店主后台优化 | P1 | 中 |
| [npc-quick-configuration.md](npc-quick-configuration.md) | NPC 快速配置 | P1 | 低 |
| [llm-configuration-wizard.md](llm-configuration-wizard.md) | LLM 配置向导 | P1 | 中 |
| [tavern-analytics.md](tavern-analytics.md) | 空间数据统计 | P1 | 中 |

### P2: 发现与回访增强（可以做）

| ID | 任务 | 优先级 | 复杂度 |
|----|------|--------|--------|
| [geographic-discovery.md](geographic-discovery.md) | 地理发现优化 | P2 | 高 |
| [revisit-reminder.md](revisit-reminder.md) | 回访提醒系统 | P2 | 中 |
| [visitor-memory-card.md](visitor-memory-card.md) | 访客记忆卡片 | P2 | 中 |
| [share-mechanism.md](share-mechanism.md) | 分享机制增强（非裂变） | P2 | 中 |

### P3: 高级功能（探索）

| ID | 任务 | 优先级 | 复杂度 |
|----|------|--------|--------|
| [play-pack-system.md](play-pack-system.md) | 玩法包系统 | P3 | 高 |
| [state-card-visualization.md](state-card-visualization.md) | 状态卡可视化 | P3 | 中 |
| [multi-tavern-linkage.md](multi-tavern-linkage.md) | 多空间联动 | P3 | 高 |

---

## 下一阶段开发优先级建议

### 立即开始（建议）

1. **P0-2: 第一分钟引导系统完善**
   - 价值最高，影响进入体验
   - 已有 `buildTavernFirstMinuteGuide` 可扩展
   - 可独立测试验证

2. **P0-4: 新手引导流程**
   - 降低新用户流失
   - 应聚焦“完成第一次进入和第一条消息”，不要做成成就/奖励系统

### 第二批（建议）

3. **P1-2: NPC 快速配置**
   - 提升店主效率
   - 优先模板 + 确认创建；AI 生成只做草稿候选

4. **P1-3: LLM 配置向导**
   - 接入门槛高，且已有测试接口可复用
   - 安全验收必须前置，避免 Key 日志/公开泄露

### 第三批（按需）

5. **P0-1: 首页空间展示增强**
6. **P1-1: 店主后台优化**
7. **P1-4: 空间数据统计**
8. **P2-3: 访客记忆卡片**

### 暂缓（探索阶段）

9. **P0-3: NPC 主动引导机制**（先做入场问候/本地规则，不做 LLM 自主调度）
10. **P2-1/P2-2/P2-4**（先回答隐私、打扰、地图依赖和增长边界）
11. **P3-*: 高级功能**

## 需要用户/产品确认的问题

1. 下一阶段更看重探索者首次进入，还是店主配置效率？这会决定 P0-2/P0-4 和 P1-2/P1-3 的先后。
2. 回访提醒是否只允许站内通知和用户主动订阅？若要 push/email，需要先补 Schema、权限、退订、频率上限和隐私文档。
3. 分享增强是否明确不做奖励、排行榜、Token 配额和邀请返利？若只是“好分享”，可复用现有 public-safe share payload。
4. 地图增强是否只做空间发现与距离感知？不做路线规划、POI 评分和传统导航。
5. 玩法包到底是 owner-local 模板/导入预览，还是平台市场？后者涉及内容审核、版权、评分评论和通用社交风险，建议暂缓。
6. 状态卡给访客看的范围是什么？只能展示 visitor-scope/已确认/当前访客可见内容，不能泄露 owner canon 草稿、hidden prompt 或其他访客状态。

---

*生成时间: 2026-06-10*
*分析依据: 权威文档读取 + API/前端代码抽查；未运行应用或测试。*
