# 变更记录：E3 · 地点传说与地点气质演化（基线）

## 变更时间

2026-03-21

## 任务 ID

E3（部分）

## 变更范围

### fablemap/writeback.py

1. 新增 `_TAG_VIBE_LABELS`：5 种 mark tag 的中文气质标签映射
2. 新增 `_LEGEND_THRESHOLDS = (3, 5, 10)`：三级传说阈值（碎片/传说/史诗）
3. 新增 `_build_place_legend(target_id, marks)`：
   - 筛选属于该 POI 的 marks
   - mark_count < 3 时返回 None
   - 统计 tag 频率，找出 dominant_tag 与 dominant_vibe
   - 按 mark 总数确定 tier（碎片/传说/史诗）
   - 生成 narrative 文本与 vibe_summary 摘要
   - 返回结构：`{target_id, tier, dominant_vibe, tag_counts, vibe_summary, narrative, mark_count}`
4. 在 mark 事件处理末尾调用 `_build_place_legend`，结果存入 `target_bucket["place_legend"]`
5. `place_state` 返回结构中新增 `place_legend` 字段

### frontend/src/App.jsx

1. `buildWritebackResidue` 函数中：当 `placeState.place_legend?.narrative` 存在时，向 residues 追加地点传说条目（tier + narrative + vibe_summary）
2. 新增 `placeLegend` 变量：从 `writebackResult?.place_state?.place_legend` 读取
3. 写回结果面板中新增「地点传说」result-card：显示 tier、narrative、vibe_summary、mark_count

## 触发条件

- 对同一 POI 提交 3 次 `mark` 写回后，`place_legend` 出现（碎片级）
- 5 次后升级为「传说」，10 次后升级为「史诗」

## 验证方式

1. 对同一 POI 提交 3 次不同 tag 的 mark 写回
2. 第 3 次响应的 `place_state.place_legend` 应包含 narrative、tier="碎片"、vibe_summary
3. 前端写回结果面板底部出现「地点传说（碎片）」卡片

## 不包含

- 玩家命名权（自定义 POI 名称）
- 地点传说影响地图渲染
- 多玩家共识机制
- 地点气质持久化到磁盘（内存存储）
