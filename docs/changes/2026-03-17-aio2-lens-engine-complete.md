# AIO2 镜头引擎实现完成

## 完成时间
2026-03-17

## 任务状态
✅ 已完成

## 实现内容

### 新增文件

- `fablemap/lens_engine.py` - 镜头引擎核心实现
- `docs/LENS_ENGINE_PROTOCOL.md` - 镜头引擎协议文档 v1.0
- `tests/test_lens_engine.py` - 9 个测试用例

### 修改文件

- `fablemap/orchestrator/schemas.py` - 新增 `LensOutput` 字段到 `OrchestratorOutput`
- `fablemap/orchestrator/rule_engine.py` - 集成镜头引擎调用

---

## 核心设计

### 6 种镜头类型

| lens_id | 中文名 | 触发条件 |
|---------|--------|----------|
| `drift` | 漂流者 | 夜间 + 低密度（< 0.1） |
| `chronicle` | 编年者 | 历史/记忆类地区 |
| `surge` | 共振者 | 高观察密度（> 0.7） |
| `veil` | 隐匿者 | 夜间 + 工业区（中密度）|
| `hearth` | 庇护者 | 公园/住宅/治愈类地区 |
| `oracle` | 先知者 | 高 attunement（> 0.6）+ 标记/回声累积 |

### 匹配规则优先级

1. oracle：高玩家共鸣优先（attunement > 0.6，mark+echo > 5）
2. surge：高密度聚集（density > 0.7）
3. chronicle：历史地区类型
4. veil：夜间工业区
5. hearth：公园/住宅/庇护类
6. drift：夜间低密度（默认漂流）
7. fallback：chronicle（兜底）

### 对编排输出的影响

每个镜头携带：
- `tone`：文案口吻（sparse_poetic / calm_archival / energetic_collective 等）
- `asset_pack_hint`：资源包建议（pack_a_day / pack_b_night）
- `visibility_bias`：可见性偏向（private / local_public / global）
- `event_weight_modifiers`：事件类型权重倍数
- `ui_filter_hint`：前端渲染滤镜提示

## 接入方式

```python
from fablemap.lens_engine import LensEngine, build_vibe_profile

vibe = build_vibe_profile(
    district_type="historic",
    time_of_day="morning",
    observer_density=0.3,
    player_attunement=0.2,
)
lens = LensEngine().resolve_lens(vibe)
print(lens.lens_id)        # "chronicle"
print(lens.tone)           # "calm_archival"
print(lens.ui_filter_hint) # "sepia_overlay"
```

## 前端消费路径

`POST /api/world/orchestrate` → `OrchestratorOutput.lens_output` → 前端读取 `lens_id` / `ui_filter_hint` / `tone` 调整渲染模式
