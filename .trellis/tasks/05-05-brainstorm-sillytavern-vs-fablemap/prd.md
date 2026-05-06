# SillyTavern vs FableMap 架构对比头脑风暴

## 一、背景

用户要求使用 Trellis 进行头脑风暴，对比"项目参考"目录中的项目和当前项目（FableMap）的真实情况。

参考项目：`项目参考/SillyTavern/`
当前项目：FableMap（赛博酒馆 UGC 平台）

---

## 二、SillyTavern 参考项目分析

### 2.1 核心定位
- **一句话**：LLM Frontend for Power Users
- **定位**：本地运行的 LLM 对话前端
- **许可**：AGPL-3.0（开源）

### 2.2 技术架构

```
┌─────────────────────────────────────────┐
│           SillyTavern (Node.js)          │
├─────────────────────────────────────────┤
│  Frontend: Vanilla JS + 模板渲染         │
│  Backend: Express.js                     │
│  Data: Local JSON/文件存储              │
│  LLM: 多后端支持 (OpenAI, Claude, etc.) │
│  Character Cards: V1/V2 格式             │
│  Extensions: 插件系统                    │
└─────────────────────────────────────────┘
```

### 2.3 核心功能模块

| 模块 | SillyTavern 实现 | 说明 |
|------|------------------|------|
| 角色卡 | SillyTavern Character Card V2 | JSON + PNG 元数据 |
| Prompt 构建 | Prompt Manager 分层注入 | 场景/系统/角色/世界书 |
| 世界书 | World Info (Keyword 触发) | 背景信息注入 |
| 对话历史 | Chat Log 持久化 | JSONL 格式 |
| 记忆 | Imported via prompt | 无独立记忆系统 |
| 多角色 | Group Chat | 群聊模式 |
| 插件 | Plugin API | 扩展机制 |

### 2.4 优势分析

1. **成熟的角色卡生态**：SillyTavern 角色卡已成为社区标准
2. **灵活的 Prompt 注入**：分层、选择性注入
3. **插件系统**：允许深度定制
4. **多后端支持**：统一的 LLM 调用接口
5. **活跃社区**：Discord + Reddit 生态

---

## 三、FableMap 当前项目分析

### 3.1 核心定位
- **一句话**：赛博酒馆 UGC 平台
- **定位**：地图 + 酒馆 + AI NPC 对话
- **愿景**：每个人都可以在真实地图上开赛博酒馆

### 3.2 技术架构

```
┌─────────────────────────────────────────────────┐
│              FableMap (已实现 + 规划中)           │
├─────────────────────────────────────────────────┤
│  Frontend: React (Vite) + 高德地图               │
│  Backend: FastAPI (Python)                       │
│  Data: JSON + SQLite (fablemap_data/)           │
│  LLM: 多后端支持 (规划中)                        │
│  Character Cards: SillyTavern 兼容               │
│  特色: 地图锚点 + 酒馆 + WorldInfo              │
└─────────────────────────────────────────────────┘
```

### 3.3 已实现功能

| 模块 | 状态 | 说明 |
|------|------|------|
| 地图展示 | ✅ | 高德地图 + 酒馆标记 |
| 酒馆 CRUD | ✅ | 创建/编辑/删除 |
| 角色卡导入 | ✅ | SillyTavern V2 兼容 |
| 对话系统 | ✅ | ChatPanel |
| 访客状态 | ✅ | visit_count, relationship |
| 写回协议 | ✅ | writeback-state.json |
| 公开酒馆 | ✅ | 公益酒馆 |
| WorldInfo | ✅ | 关键词注入 |
| 玩法系统 | ✅ | GameplayDefinition |
| 状态卡 | ✅ | StateCard 台账 |
| 多 NPC 房间 | ✅ | 群聊模式 |

### 3.4 规划中/未完成功能

| 模块 | 状态 | 优先级 |
|------|------|--------|
| LLM Client Factory | 规划中 | P1 |
| Token 统计面板 | 规划中 | P2 |
| API Key 加密存储 | 规划中 | P1 |
| 移动端适配 | 进行中 | P2 |
| 角色立绘自动生成 | 规划中 | P3 |
| 语音问候 TTS | 规划中 | P3 |

---

## 四、对比分析矩阵

### 4.1 功能维度对比

| 维度 | SillyTavern | FableMap | 差距 |
|------|-------------|----------|------|
| **地图锚点** | ❌ 无 | ✅ 真实坐标 | +FableMap 独特 |
| **酒馆概念** | ❌ 无 | ✅ 核心 | +FableMap 独特 |
| **空间发现** | ❌ 无 | ✅ 地图浏览 | +FableMap 独特 |
| **角色卡兼容** | ✅ 原生 | ✅ 兼容 | 持平 |
| **Prompt 注入** | ✅ 分层 | ✅ 分层 | 持平 |
| **世界书** | ✅ Keyword | ✅ Keyword | 持平 |
| **群聊** | ✅ 支持 | ✅ 支持 | 持平 |
| **插件系统** | ✅ 成熟 | ❌ 无 | -差距 |
| **多后端 LLM** | ✅ 成熟 | ⚠️ 规划中 | -差距 |
| **本地运行** | ✅ 是 | ❌ 云端 | 架构差异 |
| **UGC 平台** | ❌ 否 | ✅ 是 | +FableMap 独特 |

### 4.2 技术架构对比

| 维度 | SillyTavern | FableMap | 说明 |
|------|-------------|----------|------|
| 前端框架 | Vanilla JS | React | FableMap 更现代 |
| 后端框架 | Express.js | FastAPI | FableMap 更类型安全 |
| 数据存储 | Local Files | JSON + DB | 取决于规模 |
| 部署方式 | 本地 | 云端/SaaS | 定位不同 |
| 插件架构 | Plugin API | 无 | SillyTavern 优势 |

---

## 五、FableMap 可借鉴 SillyTavern 的点

### 5.1 高优先级（可立即实施）

#### 1. **Prompt 模板系统**
- SillyTavern 的 Prompt Manager 是其核心优势
- FableMap 已有分层注入，可借鉴其"模板变量"机制
- 建议：为 System Prompt 提供 `{{variable}}` 插值语法

#### 2. **角色卡编辑器 UX**
- SillyTavern 的角色卡编辑界面非常直观
- FableMap 可借鉴其 JSON/PNG 导入预览功能
- 建议：增加角色卡导入向导

#### 3. **插件化 API 架构**
- SillyTavern 的插件系统允许第三方扩展
- FableMap 可考虑轻量级插件机制
- 建议：API 中间件模式

#### 4. **多后端统一接口**
- SillyTavern 已经实现了多种 LLM 后端的统一调用
- FableMap 规划中的 LLM Client Factory 可直接参考
- 建议：适配器模式 + 统一 Response 接口

### 5.2 中优先级（需要规划）

#### 5. **聊天格式化增强**
- SillyTavern 支持 Markdown 渲染、图片、语音
- FableMap 已有气泡 UI，可增强富文本
- 建议：Markdown 支持 + 语音消息

#### 6. **快捷设定系统**
- SillyTavern 的 "Author's Note" 允许动态注入上下文
- FableMap 的 WorldInfo 可结合此机制
- 建议：临时注入 (Temporary Injection)

#### 7. **对话导出格式**
- SillyTavern 支持多种导出格式（JSON, Markdown, HTML）
- FableMap 的 Episode Export API 可借鉴
- 建议：增加 HTML 导出格式

### 5.3 低优先级（长期演进）

#### 8. **变量替换引擎**
- SillyTavern 的 `{{raw_text}}` 等变量机制
- 可用于 FableMap 的 NPC 动态生成

#### 9. **社区角色卡市场**
- SillyTavern 社区有大量角色卡资源
- FableMap 可考虑"酒馆市场"功能

#### 10. **协作编辑**
- SillyTavern 支持多用户共享角色卡
- FableMap 可考虑家庭成员/协作场景

---

## 六、FableMap 独特价值（需要强化）

### 6.1 地图锚点 → 真实地点叙事

**SillyTavern 无法做到**：
- 在真实地图上发现酒馆
- 基于真实地点的氛围设定
- 空间邻近的酒馆发现

**建议强化**：
- 酒馆发现雷达 UI（已规划）
- 基于位置的酒馆推荐
- 地点标签系统

### 6.2 酒馆即内容 → UGC 生态

**SillyTavern 是单人工具**：
- 本地使用
- 无分享机制
- 无创作者生态

**FableMap 的机会**：
- 酒馆分享与发现
- 角色卡市场
- 酒馆排名与推荐
- 访客反馈系统

### 6.3 玩法系统 → 结构化叙事

**FableMap 已有 GameplayDefinition**：
- 轻量玩法节点
- 访客进度追踪
- AI Director Fallback

**可进一步探索**：
- 剧本市场
- 玩法模板库
- 连续剧式叙事

---

## 七、头脑风暴结论

### 7.1 FableMap 的核心差异化

| 差异化点 | SillyTavern | FableMap | 战略价值 |
|----------|-------------|----------|----------|
| 地图锚点 | ❌ | ✅ | 高 - 创造独特体验 |
| 酒馆 UGC | ❌ | ✅ | 高 - 构建护城河 |
| 真实地点叙事 | ❌ | ✅ | 中 - 差异化叙事 |
| 云端协作 | ⚠️ 有限 | ✅ | 中 - 社交价值 |

### 7.2 短期行动项（1-2 周）

1. **LLM Client Factory 实现**
   - 参考 SillyTavern 的多后端适配器
   - 统一 Response 接口

2. **角色卡导入增强**
   - 导入预览
   - 字段映射确认

3. ** Prompt 模板系统**
   - 支持变量插值
   - 模板版本管理

### 7.3 中期行动项（1-2 月）

4. **API Key 安全存储**
   - 加密存储
   - Key Vault 实现

5. **Token 统计面板**
   - 消耗追踪
   - 成本预估

6. **酒馆发现系统**
   - 雷达 UI
   - 位置推荐

### 7.4 长期愿景

7. **UGC 生态**
   - 酒馆市场
   - 角色卡市场
   - 玩法模板库

8. **社区建设**
   - 创作者激励
   - 社区排行

---

## 八、开放问题

1. **是否需要插件系统？**
   - 复杂性 vs 灵活性
   - MVP 阶段可能不需要

2. **本地运行 vs 云端？**
   - 当前是云端架构
   - 未来可能支持本地部署

3. **Token 计费模式？**
   - 当前是店主自付
   - 未来是否引入平台补贴？

4. **多语言支持？**
   - 当前主要中文
   - 国际化规划？

---

*创建时间: 2026-05-05*
*状态: Phase 1 - 头脑风暴*
