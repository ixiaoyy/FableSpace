# 世界编排器协议附录

## 六、与现有协议的对齐

### 6.1 与 P5 写回协议对齐

编排器消费写回事件，根据写回类型生成不同反馈。

**对齐点**：
- 编排器读取 `recent_actions` 中的写回事件
- 根据写回类型（`observe / dwell / mark`）生成不同反馈
- 尊重写回的 `visibility` 约束

### 6.2 与 P3 治理边界对齐

编排器遵守治理规则，不生成违反规则的事件。

**对齐点**：
- `local_public` 事件需检查玩家熟悉度
- `global` 事件需更严格的审核
- 过滤不符合治理规则的输出

### 6.3 与 P4 时间褶皱协议对齐

编排器支持历史层触发。

**对齐点**：
- 高 `attunement` 玩家更容易触发历史回声
- 编排器建议何时显现时间褶皱入口
- 历史层事件优先级由编排器动态调整

---

## 七、实施指南

### 7.1 最小可行实现（MVP）

第一版应实现：

**必须**：
- 规则引擎（至少 10 条规则）
- POI 排序（基于距离 + 简单规则）
- 时间信号接入
- 基础事件类型（`broadcast`, `echo`, `player_trait_update`）
- 失败降级机制

**可选**：
- AI 编排引擎
- 动态信号（天气、交通）
- 观察者效应
- 镜头切换建议

### 7.2 规则引擎示例

```python
# 规则 1: 深夜便利店
def night_convenience_rule(inp: OrchestratorInput) -> List[EventSuggestion]:
    if inp.dynamic_signals.time_of_day != "night":
        return []

    convenience_pois = [
        poi for poi in inp.world_state.pois
        if poi.fantasy_type == "supply_depot"
    ]

    if not convenience_pois:
        return []

    return [EventSuggestion(
        type="broadcast",
        target_type="global",
        priority=5,
        effect=EventEffect(
            effect_type="broadcast",
            params={"text_key": "night_wanderer", "mood": "mysterious"}
        ),
        visibility="local_public"
    )]

# 规则 2: 探索者识别
def explorer_pattern_rule(inp: OrchestratorInput) -> List[EventSuggestion]:
    observe_count = len([
        e for e in inp.player_state.recent_actions
        if e.action == "observe"
    ])

    if observe_count < 3:
        return []

    return [EventSuggestion(
        type="player_trait_update",
        target_type="global",
        priority=7,
        effect=EventEffect(
            effect_type="state_change",
            params={"trait": "explorer", "increment": 1}
        ),
        visibility="private"
    )]
```

---

## 八、版本演进路线

- **v1.0**（当前）: 协议定义完成
- **v1.1**（Phase 1）: 动态信号接入
- **v1.2**（Phase 2）: AI 编排引擎
- **v1.3**（Phase 3）: 镜头引擎集成

---

## 九、参考文档

- [AI_NATIVE_WORLD_ORCHESTRATION.md](AI_NATIVE_WORLD_ORCHESTRATION.md)
- [AIO1_WORLD_ORCHESTRATOR_PLAN.md](AIO1_WORLD_ORCHESTRATOR_PLAN.md)
- [PLAYER_STATE.md](PLAYER_STATE.md)
- [WORLD_WRITEBACK_PROTOCOL.md](WORLD_WRITEBACK_PROTOCOL.md)
- [WORLD_WRITEBACK_GOVERNANCE.md](WORLD_WRITEBACK_GOVERNANCE.md)
- [TIME_FOLDS_PROTOCOL.md](TIME_FOLDS_PROTOCOL.md)
- [WORLD_SCHEMA.md](WORLD_SCHEMA.md)

---

## 十、FAQ

**Q: 编排器多久调用一次？**
A: 建议 5-10 分钟轮询一次，或在玩家写回后立即调用。

**Q: AI 编排成本如何控制？**
A: 通过缓存、批处理和规则引擎 fallback 控制成本。

**Q: 编排器会修改世界状态吗？**
A: 不会。编排器只输出建议，由其他系统执行。

**Q: 如何处理多玩家冲突？**
A: 编排器为每个玩家独立生成输出，冲突由治理层处理。

**Q: 观察者效应如何计算？**
A: 统计最近 N 分钟内观察同一 POI 的玩家数量。
