# D3 · 共创主线与镜头引擎对齐完成

## 完成时间
2026-03-17

## 任务状态
✅ 已完成

## 本次改动目标

在既有 D3 共创数据结构基础上，将 `participation_modes` 中三种参与模式与 AIO2 镜头引擎的 `lens_hint` 字段对齐，形成完整的"参与模式 → 镜头感知"映射链路。

## 改动内容

### `fablemap/world_builder.py`

在 `_build_co_creation_layer()` 的三个 `participation_modes` 条目中各新增 `lens_hint` 字段：

| 参与模式 | visibility | lens_hint | 说明 |
|----------|------------|-----------|------|
| `private_capsules` | private | `hearth` | 私密驻留，庇护者镜头 |
| `street_legends` | local_public | `chronicle` | 本地传说，编年者镜头 |
| `repair_rituals` | global | `oracle` | 全局修复，先知者镜头 |

### `tests/test_showcase.py`

新增 `test_co_creation_participation_modes_have_lens_hint` 测试，验证：
- 三个参与模式均存在
- 每个模式都有 `lens_hint` 字段
- lens_hint 值与协议定义一致

## 打通的链路

```
world.co_creation.participation_modes[].lens_hint
    → AIO2 LensEngine.resolve_lens(vibe)
    → LensOutput.lens_id
    → 前端 ui_filter_hint / tone / asset_pack_hint
```

## 不涉及范围

- 未修改联网社区、账号或多人同步逻辑
- 未修改 P3/P4/P5 协议正文
- 未涉及 E1-E4 社区化任务
- 未修改地图资源包 M1/M2/M3
