# 变更记录：F2 · 现实行为输入与人为扰动接口（基线）

## 变更时间

2026-03-21

## 任务 ID

F2（部分）

## 变更范围

### fablemap/dynamic_signals.py

1. 新增 `_disturbance_overrides: dict[str, dict]`：内存扰动覆盖缓存（slice_id → 覆盖字段）
2. 新增 `inject_disturbance(slice_id, **kwargs)`：写入覆盖
3. 新增 `clear_disturbance(slice_id)`：清除覆盖
4. 新增 `get_disturbance(slice_id)`：读取当前覆盖
5. `get_mock_signals` 在生成返回值前优先使用 `_disturbance_overrides` 中的 weather、traffic_level、crowd_density、is_holiday

### fablemap/web/service.py

1. 导入 `inject_disturbance`、`clear_disturbance`、`get_disturbance`
2. 新增 `inject_disturbance_payload()`：调用注入并返回当前激活覆盖
3. 新增 `clear_disturbance_payload()`：清除并返回空覆盖
4. 新增 `get_disturbance_payload()`：返回当前激活覆盖

### fablemap/web/router.py

1. `POST /api/world/disturbance`：注入扰动（weather/traffic_level/crowd_density/is_holiday/event_tag）
2. `DELETE /api/world/disturbance/{slice_id}`：清除扰动
3. `GET /api/world/disturbance/{slice_id}`：查看当前扰动

### frontend/src/App.jsx

1. API client 新增 `injectDisturbance`、`clearDisturbance` 方法
2. 新增 state：`disturbanceForm`、`disturbanceActive`、`disturbanceSubmitting`
3. 新增 `submitDisturbance()`、`clearDisturbance()` 函数
4. 编排事件区块之后新增「人为扰动注入」面板：天气下拉、人流密度/交通强度数字输入、特殊事件标签下拉，注入/清除按钮，当前激活扰动展示

## 触发条件

- 生成世界切片后，在扰动面板选择信号并点击「注入扰动」
- 下次编排器调用 `get_mock_signals(slice_id)` 时将使用注入的覆盖信号

## 验证方式

1. 生成切片后注入 weather=rainy
2. `GET /api/world/disturbance/{slice_id}` 返回 `{"active": {"weather": "rainy"}}`
3. 触发编排（提交写回事件）后，编排器 broadcast_hints 反映雨天信号
4. 点击「清除扰动」后，`active` 返回空 dict

## 不包含

- 持久化扰动到磁盘（服务重启后清空）
- 真实天气/交通 API 接入
- 扰动影响地图视觉渲染
