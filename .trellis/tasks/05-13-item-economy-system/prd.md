# PRD：叙事道具经济系统（金币 + 物品）

**任务 ID**：05-13-item-economy-system  
**创建时间**：2026-05-13  
**状态**：in-progress  
**优先级**：P1

---

## 一、背景与动机

FableMap 当前已有 `Engagement` 纪念币框架（`WORLD_SCHEMA.md` 第十一-A 节），但其触发条件仅限于"完成玩法"，且 Schema 较复杂。

用户希望引入一套更直觉的叙事经济模型：  
**NPC 在对话中给你物品 → 物品有金币价值 → 访客自动获得对应金币**

这套系统存在于叙事层，不是真实货币，不涉及充值/结算/平台抽成。

---

## 二、目标

1. **单一货币**：全局只有「金币」一种货币，`coin_label` 固定为 `"金币"`。
2. **物品目录**：每个空间（Tavern）可配置一份 `item_catalog`，每个物品有名称、图标、金币价值。
3. **NPC 对话触发**：LLM 回复中使用结构化标记 `[GIVE:物品名:数量]`，后端解析并自动发放金币。
4. **访客钱包**：金币余额存储在 `VisitorEngagementProgress.wallet.balance`（复用现有结构）。
5. **简单查询**：访客可以查询自己在某个空间的金币余额和收支记录。

---

## 三、MVP 范围

### 3.1 物品目录（ItemCatalog）

挂在 Tavern 配置下，店主可配置：

```typescript
interface ItemDefinition {
  id: string;          // item_<hex>
  name: string;        // 物品名称（如"小鱼"、"热茶"）
  icon?: string;       // emoji 或资源路径（如 "🐟"）
  coin_value: number;  // 转换为金币的价值（正整数）
  description?: string;
}
```

**默认物品表**（内置，免配置）：

| 物品名 | 图标 | 金币价值 |
|--------|------|----------|
| 小鱼 | 🐟 | 2 |
| 热茶 | 🍵 | 1 |
| 纸徽章 | 🏅 | 3 |
| 旧硬币 | 🪙 | 1 |
| 鱼干 | 🐡 | 5 |
| 线索卡 | 📋 | 3 |
| 幸运星 | ⭐ | 1 |

### 3.2 NPC 触发协议

LLM 在叙事文本中嵌入如下标记（对访客不可见）：

```
[GIVE:小鱼:1]   → 发放 2 金币（1条小鱼 × 2）
[GIVE:热茶:2]   → 发放 2 金币（2杯热茶 × 1）
```

后端在 LLM 返回后，扫描并提取标记 → 写入钱包 → 从展示文本中移除标记。

### 3.3 访客钱包（复用现有结构）

复用 `VisitorEngagementProgress.wallet`，存储于 `VisitorState.metadata._engagement_progress`：

```json
{
  "wallet": {
    "balance": 12,
    "lifetime_earned": 15,
    "lifetime_spent": 3
  }
}
```

账本记录 `ledger` 中新增 `source_type: "npc_gift"`。

### 3.4 声音契约扩展

在 `npc_voice.py` 中告知 NPC 可以使用 `[GIVE:物品名:数量]` 标记，并说明可用物品清单。

---

## 四、不做的事

- ❌ 不做金币消费（MVP 只有收入，没有花钱）
- ❌ 不做跨空间金币流通
- ❌ 不做充值/提现/平台结算
- ❌ 不做抽卡/排行榜
- ❌ 不做物品背包 UI（只显示余额数字）

---

## 五、实施计划

### Phase 1：后端（核心逻辑）
1. 新增 `backend/src/fablemap_api/core/item_economy.py`
   - 定义 `ItemDefinition` dataclass
   - 实现默认物品表 `DEFAULT_ITEM_CATALOG`
   - 实现 `parse_give_tags(text)` → 返回 `[(item_name, qty)]`
   - 实现 `apply_gifts(tags, catalog)` → 计算总金币
   - 实现 `strip_give_tags(text)` → 清除标记后返回干净文本

2. 在聊天响应处理链中注入 `item_economy` 处理：
   - 位置：LLM 返回后、存储聊天记录前
   - 调用 `parse_give_tags` → `apply_gifts` → 更新 `VisitorEngagementProgress` → `strip_give_tags`

### Phase 2：NPC 契约
3. 更新 `npc_voice.py`：注入物品馈赠协议
   - 告知 NPC 可以在自然叙事中使用 `[GIVE:物品名:数量]`
   - 提供默认物品清单，要求与角色性格匹配（如眯眯送鱼干）

### Phase 3：验证
4. 编写测试：`tests/test_item_economy.py`
   - 解析标记
   - 金币计算
   - 文本清洗

---

## 六、验收标准

- [ ] `parse_give_tags("[GIVE:小鱼:2]")` 返回 `[("小鱼", 2)]`
- [ ] 2条小鱼 → 余额增加 4 金币
- [ ] 返回给前端的文本不含 `[GIVE:...]` 标记
- [ ] `py -3 -m pytest tests/test_item_economy.py -q` 全部通过
- [ ] `py -3 -m compileall -q backend/src` 无报错
