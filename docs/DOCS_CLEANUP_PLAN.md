# FableMap 文档清理计划

## 清理目标

基于新的架构原则（ARCHITECTURE_PRINCIPLES.md）和四层模型，清理过时、冗余、与当前方向不符的文档。

---

## 文档分类

### ✅ 核心架构文档（保留）

**新增的核心文档**：
- `ARCHITECTURE_PRINCIPLES.md` - 架构原则与边界（最高优先级）
- `WHAT_NOT_TO_BUILD.md` - 明确不做清单
- `AI_SHARED_TASKLIST_V2.md` - 按四层模型重构的任务列表
- `AIO1_WORLD_ORCHESTRATOR_PLAN.md` - 世界编排器实施计划
- `AI_NATIVE_WORLD_ORCHESTRATION.md` - AI-native 架构完整设计

**现有核心文档**：
- `WORLD_SCHEMA.md` - 世界数据结构
- `UNIVERSAL_TRANSMUTATION_PROTOCOL.md` - 万物转义协议
- `DUAL_TRACK_MAPPING.md` - 双轨映射规则
- `AI参与开发协议.md` - AI 协作规范
- `WORLD_WRITEBACK_GOVERNANCE.md` - 写回治理（P3）
- `TIME_FOLDS_PROTOCOL.md` - 时间褶皱协议（P4）
- `PLAYER_STATE.md` - 玩家状态设计

---

### ⚠️ 需要更新的文档

**1. AI_SHARED_TASKLIST.md（旧版）**
- **问题**: 未按四层模型组织，M1-M3 任务未标记废弃
- **处理**: 添加废弃声明，指向 AI_SHARED_TASKLIST_V2.md

**2. CURRENT_TASKS.md**
- **问题**: 与 AI_SHARED_TASKLIST_V2.md 重复
- **处理**: 简化为指向 AI_SHARED_TASKLIST_V2.md 的索引

**3. README.md（根目录）**
- **问题**: 可能未反映新的架构原则
- **处理**: 需要检查并更新

**4. ARCHITECTURE.md**
- **问题**: 可能与 ARCHITECTURE_PRINCIPLES.md 冲突
- **处理**: 合并或废弃

---

### ❌ 可以废弃的文档

**1. 过时的设计文档**：
- `GODOT_INTEGRATION.md` - Godot 集成（已不在技术栈中）
- `CAUSAL_RIPPLE_ALGORITHM.md` - 因果涟漪算法（已被世界编排器替代）
- `AESTHETIC_EMOTION_SYSTEMS.md` - 审美情感系统（过于早期，未实施）
- `FACTION_SYSTEM.md` - 阵营系统（长期项，暂不优先）

**2. 过时的技术文档**：
- `CLI_SPEC.md` - CLI 规范（已实现，细节在代码中）
- `TECH_STACK.md` - 技术栈（可能过时）

**3. 过于早期的设计**：
- `LONG_TERM_EXPERIENCE.md` - 长期体验设计（过于宏大，未落地）
- `PRODUCT_BRIEF.md` - 产品简介（可能过时）

---

### 📁 Claims 和 Changes 文件夹

**保留策略**：
- 保留所有 `claims/` 和 `changes/` 文件（历史记录）
- 不主动清理，但可以归档到 `docs/archive/` 子文件夹

---

## 清理步骤

### Step 1: 废弃旧版任务列表

在 `AI_SHARED_TASKLIST.md` 顶部添加废弃声明。

### Step 2: 简化 CURRENT_TASKS.md

将其改为指向 AI_SHARED_TASKLIST_V2.md 的索引。

### Step 3: 移动过时文档到 archive

创建 `docs/archive/` 文件夹，移动以下文档：
- GODOT_INTEGRATION.md
- CAUSAL_RIPPLE_ALGORITHM.md
- AESTHETIC_EMOTION_SYSTEMS.md
- FACTION_SYSTEM.md
- LONG_TERM_EXPERIENCE.md

### Step 4: 检查并更新 README.md

确保 README.md 反映新的架构原则。

### Step 5: 处理 ARCHITECTURE.md

检查是否与 ARCHITECTURE_PRINCIPLES.md 冲突，决定合并或废弃。

### Step 6: 创建文档索引

创建 `docs/INDEX.md`，按优先级列出所有有效文档。

---

## 文档优先级

### P0 - 必读文档（架构决策）
1. ARCHITECTURE_PRINCIPLES.md
2. WHAT_NOT_TO_BUILD.md
3. AI_SHARED_TASKLIST_V2.md
4. AI_NATIVE_WORLD_ORCHESTRATION.md

### P1 - 核心协议文档
5. WORLD_SCHEMA.md
6. UNIVERSAL_TRANSMUTATION_PROTOCOL.md
7. WORLD_WRITEBACK_GOVERNANCE.md
8. TIME_FOLDS_PROTOCOL.md
9. DUAL_TRACK_MAPPING.md

### P2 - 实施计划文档
10. AIO1_WORLD_ORCHESTRATOR_PLAN.md
11. PLAYER_STATE.md

### P3 - 设计参考文档
12. WEB_2D_SPIRIT_VIEW.md
13. CULTURAL_INTERPRETATION.md
14. STYLE_VIBES_MANIFESTO.md
15. STREET_AS_A_SENTENCE.md
16. DISTURBANCE_MODEL.md

### P4 - 协作规范
17. AI参与开发协议.md
18. claims/README.md

---

## 执行时间线

- **立即执行**: Step 1, 2（废弃声明）
- **本周内**: Step 3, 4, 5（移动文档，更新 README）
- **下周**: Step 6（创建索引）

---

## 成功标准

- [ ] 所有开发者能快速找到核心架构文档
- [ ] 过时文档不会误导新协作者
- [ ] 文档优先级清晰
- [ ] 减少文档冗余和混乱
