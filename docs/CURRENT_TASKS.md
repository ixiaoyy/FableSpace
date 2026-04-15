# FableMap 当前任务清单（赛博酒馆平台版）

## 战略转型

FableMap 已从「AI 生成游戏地图」的战略方向，转向「赛博酒馆 UGC 平台」。

**核心转变**：
- 平台不再生成内容，而是提供酒馆托管平台
- 内容由用户（店主）创作，而非平台生成
- AI 驱动 NPC 对话，而非生成地图画面

---

## 当前最高优先级

### Phase 1: 数据结构 + 最小可运行

| 任务 | 状态 | 说明 |
|------|------|------|
| T1.1 扩展 `placeProtocol.js` | `done` | tavern.py 模块已实现 |
| T1.2 后端 `tavern.py` | `done` | 酒馆 CRUD 核心模块 |
| T1.3 `/api/taverns/*` 路由 | `done` | 酒馆 CRUD API 端点 |
| T1.4 前端 `tavernService.js` | `done` | 酒馆服务层 |
| T1.5 酒馆地图标记 | `done` | WorldMap.jsx 复用 POI 标记层展示酒馆，点击触发 activeTavernId |
| T1.6 酒馆创建面板 | `done` | TavernCreatePanel.jsx 已实现 |
| T1.7 Chat Panel 接入 | `done` | TavernChatRoom 已实现 |
| T1.8 酒馆入场 | `done` | enter_tavern API 已实现 |
| T1.9 Chat 历史 writeback | `done` | 对话历史持久化 |

### Phase 2: 角色管理 + SillyTavern 导入

| 任务 | 状态 | 说明 |
|------|------|------|
| T2.1 角色卡编辑器 UI | `partial` | 基础组件存在，需完善 |
| T2.2 JSON 粘贴导入 | `done` | import_character_card API |
| T2.3 PNG 上传导入 | `done` | tavernService.js 解析 PNG tEXt chunk (chara/ccv3) |
| T2.4 角色列表展示 | `done` | CharacterSidebar 已实现 |
| T2.5 角色切换 | `done` | TavernChatRoom 已实现 |

### Phase 3: LLM 接入

| 任务 | 状态 | 说明 |
|------|------|------|
| T3.1 `llm_clients.py` | `done` | 客户端工厂（OpenAI/Claude/Ollama）已实现 |
| T3.2 Prompt 构建器 | `done` | 场景 + 角色 + 历史 prompt_builder.py 已实现 |
| T3.3 WorldInfo 注入器 | `done` | 关键词匹配 world_info_injector.py 已实现 |
| T3.4 真实 LLM 调用 | `done` | Chat Panel 接入真实 LLM，`test_llm` 端点已添加 |
| T3.5 Token 统计 | `done` | 用 TokenCounter 替代字符长度估算 |
| T3.6 闭店状态检测 | `done` | LLM 不可用时自动降级为规则响应，标记 closed |

> Phase 3 已于 2026-04-15 完成。LLM 对话链路已完整：前端 TavernChatRoom → tavernService.sendChat → POST /api/taverns/{id}/chat → service.tavern_chat_payload → llm_clients → LLM API。

### Phase 4: 店主管理 + 地图整合

| 任务 | 状态 | 说明 |
|------|------|------|
| T4.1 我的酒馆面板 | `planned` | 店主管理界面 |
| T4.2 LLM 配置 UI | `planned` | API Key 输入、模型选择 |
| T4.3 Token 统计面板 | `planned` | 查看使用量 |
| T4.4 酒馆搜索发现 | `planned` | 浏览与搜索 |
| T4.5 标记分类显示 | `planned` | 公开/密码/私人分类 |

### Phase 5: 打磨

| 任务 | 状态 | 说明 |
|------|------|------|
| T5.1 情绪精灵图 | `planned` | 角色表情切换 |
| T5.2 错误处理 | `planned` | 导入错误处理 |
| T5.3 LLM 降级策略 | `planned` | API 失败友好提示 |
| T5.4 移动端适配 | `planned` | 响应式 UI |
| T5.5 性能优化 | `planned` | 大量酒馆时渲染优化 |

---

## 关键参考文档

- [FABLEMAP_TAVERN_PLATFORM.md](FABLEMAP_TAVERN_PLATFORM.md) — 产品设计主线
- [ARCHITECTURE.md](ARCHITECTURE.md) — 系统架构
- [WHAT_NOT_TO_BUILD.md](WHAT_NOT_TO_BUILD.md) — 明确不做
- [AI_SHARED_TASKLIST.md](AI_SHARED_TASKLIST.md) — 任务认领

---

## 当前取舍

### 明确降低优先级

- 平台自动生成酒馆内容
- 复杂地图视觉资源包
- 生成式场景画面
- 地图审美目标

### 明确抬升优先级

- 酒馆创建与配置
- SillyTavern 角色卡导入
- LLM 对话接入
- 访问控制（公开/密码/私人）
- 写回与记忆

---

## 明确不再作为主线的方向

1. 继续以自绘 Web-2D 地图作为产品核心
2. 平台生成酒馆内容
3. 复杂地图视觉资源包体系
4. 地图审美目标
5. 平台级 Token 付费/充值系统
6. 酒馆间访客社交

---

## 架构判断标准

如果一个新需求满足以下条件，说明它方向正确：

1. 它强化了「地图浏览 → 酒馆发现 → 入场 → 对话 → 写回 → 回访」链路
2. 它提升了酒馆创建的便利性、角色配置的灵活性或对话体验的真实感
3. 它符合「平台做地图和入口，酒馆主人做内容」的最小平台原则

如果一个新需求满足以下特征，则应谨慎：

1. 主要目标是让地图更炫，而不是让酒馆体验更好
2. 需要新增大量自绘几何、资源包和渲染细节
3. 平台生成酒馆内容（而非主人创作）
4. 会把前端重新拖回旧地图主舞台路线
