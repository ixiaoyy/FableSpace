# 2026-04-09 · T0.2 前端边界拆分与最小体验收敛

## 背景

依据 [`docs/AI_SHARED_TASKLIST.md`](../AI_SHARED_TASKLIST.md) 中的 [`T0.2`](../AI_SHARED_TASKLIST.md:55)，本次改动继续推进前端边界拆分，但保持最小侵入，不改变现有主链路：`坐标输入 -> nearby preview -> world map -> writeback -> feedback`。

对应认领说明：[`docs/claims/2026-04-09-t0-2-frontend-boundary-split.md`](../claims/2026-04-09-t0-2-frontend-boundary-split.md)

## 本次改动

### 1. 抽离 app shell 展示派生逻辑

新增 [`frontend/src/services/appShellViewModel.js`](../../frontend/src/services/appShellViewModel.js)，将以下原本位于 [`frontend/src/App.jsx`](../../frontend/src/App.jsx) 内的派生展示逻辑移出：

- 入口状态文案构建
- Hero metrics 卡片数据构建

这样 [`frontend/src/App.jsx`](../../frontend/src/App.jsx) 更聚焦于页面装配，而不是混合 UI 组合与派生展示计算。

### 2. 抽离 world session 展示态聚合

新增 [`frontend/src/services/worldSessionViewState.js`](../../frontend/src/services/worldSessionViewState.js)，集中封装 [`frontend/src/hooks/useWorldSession.js`](../../frontend/src/hooks/useWorldSession.js) 内的一组展示派生状态：

- `presetMeta`
- `previewUrl`
- `recentEchoes`
- `recentMarks`
- `placeLegend`
- `honorBoard`
- `playerState`
- `feedback`
- `writebackTimeline`
- `writebackResidues`
- `selectedActionMeta`
- `selectedVisibilityMeta`
- `lastWritebackPoiId`
- `resolvedActivePoi`
- `writebackTargetSummary`
- `revisitSummary`
- `sliceHighlights`
- `worldAtmosphere`
- `worldPois`

同时保留 [`frontend/src/hooks/useWorldSession.js`](../../frontend/src/hooks/useWorldSession.js) 对副作用、持久化、地图图层和写回协同的主导职责，避免过度重构。

### 3. 抽离 App 面板 props 组合层

新增 [`frontend/src/services/appPanelProps.js`](../../frontend/src/services/appPanelProps.js)，统一生成四组面板 props：

- `entryPanelProps`
- `resultPanelProps`
- `mapStageProps`
- `adminPanelProps`

对应地，[`frontend/src/App.jsx`](../../frontend/src/App.jsx) 从逐项下发大量 props，调整为以组合对象方式传入 [`WorldEntryPanel`](../../frontend/src/WorldEntryPanel.jsx)、[`WorldSliceResultPanel`](../../frontend/src/WorldSliceResultPanel.jsx)、[`WorldStagePanel`](../../frontend/src/WorldStagePanel.jsx) 与 [`AdminDebugPanel`](../../frontend/src/AdminDebugPanel.jsx)。

这一步没有改变现有面板接口语义，但显著收缩了 [`frontend/src/App.jsx`](../../frontend/src/App.jsx) 的模板噪音，并为下一步继续拆分 stage / writeback / filter props 提供稳定边界。

### 4. 抽离 WorldStagePanel 的 POI 筛选子区块

新增 [`frontend/src/WorldStagePoiFilterLane.jsx`](../../frontend/src/WorldStagePoiFilterLane.jsx)，将 [`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 内原本内联的 POI 搜索、类型筛选、阵营筛选、熟悉地点开关与结果列表区块抽离为独立子组件。

对应地，[`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 仅保留主舞台编排职责，通过统一 props 将以下能力下发给 [`frontend/src/WorldStagePoiFilterLane.jsx`](../../frontend/src/WorldStagePoiFilterLane.jsx)：

- POI 搜索关键字与重置
- 类型 / 阵营筛选状态
- 熟悉地点过滤开关
- 过滤结果统计与点击激活
- 当前激活 POI 高亮

这一轮拆分保持了原有筛选交互与点击进入观察的行为语义不变，同时降低了 [`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 对展示细节和筛选控件模板的耦合。

### 5. 抽离 WorldStagePanel 的 writeback 双组件边界

新增 [`frontend/src/WorldStageWritebackActionPanel.jsx`](../../frontend/src/WorldStageWritebackActionPanel.jsx)，承接 [`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 内原本内联的写回动作选择、快速输入、可见性摘要与提交错误提示。

新增 [`frontend/src/WorldStageWritebackInsightsPanel.jsx`](../../frontend/src/WorldStageWritebackInsightsPanel.jsx)，承接写回后的结构化时间线、残留痕迹回访说明，以及 [`AIO4`](../../frontend/src/WorldStagePanel.jsx:662) / [`AIO5`](../../frontend/src/WorldStagePanel.jsx:708) / [`AIO6`](../../frontend/src/WorldStagePanel.jsx:751) 派生展示区块。

对应地，[`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 从大段 writeback 内联模板收缩为主舞台容器，通过 props 转发保留原有行为语义与 className 体系，不改写回协议、动作字段名或现有交互路径。

### 6. 抽离 WorldStagePanel 的 disturbance / D3 子区块

新增 [`frontend/src/WorldStageDisturbancePanel.jsx`](../../frontend/src/WorldStageDisturbancePanel.jsx)，承接 [`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 中的人为扰动表单、扰动提交与清除按钮，以及当前扰动状态展示。

新增 [`frontend/src/WorldStageParticipationLane.jsx`](../../frontend/src/WorldStageParticipationLane.jsx)，承接 [`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 中的 [`D3`](../../frontend/src/WorldStagePanel.jsx:423) 玩家参与入口、可见性语义卡片与参与路径说明。

对应地，[`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 继续收缩为主舞台装配层，仅保留布局和 props 转发，不改变 disturbance 表单字段、不改变 D3 文案语义，也不改变写回链路。

### 7. 抽离 WorldStagePanel 的地图控制器与当前舞台卡

新增 [`frontend/src/WorldStageMapLayerToolbar.jsx`](../../frontend/src/WorldStageMapLayerToolbar.jsx)，承接 [`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 中主舞台分支的地图图层控制器、图层预设、全开全关、重置默认与单层切换能力。

新增 [`frontend/src/WorldStageActivePoiPanel.jsx`](../../frontend/src/WorldStageActivePoiPanel.jsx)，承接当前舞台卡头部、空状态占位、回到上次写回目标入口，以及对 [`frontend/src/WorldStageWritebackActionPanel.jsx`](../../frontend/src/WorldStageWritebackActionPanel.jsx) 与 [`frontend/src/WorldStageWritebackInsightsPanel.jsx`](../../frontend/src/WorldStageWritebackInsightsPanel.jsx) 的组合装配。

对应地，[`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 进一步收缩为主舞台骨架与 [`WorldMap`](../../frontend/src/WorldMap.jsx) 装配层，保持 [`mapOnly`](../../frontend/src/WorldStagePanel.jsx:69) 分支、图层交互语义与写回链路不变。

### 8. 抽离 WorldStagePanel 的 mapOnly 舞台与共享 map frame

新增 [`frontend/src/WorldStageMapFrame.jsx`](../../frontend/src/WorldStageMapFrame.jsx)，统一承接 [`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 主舞台分支与 [`mapOnly`](../../frontend/src/WorldStagePanel.jsx:69) 分支共享的地图外框骨架，组合 [`frontend/src/WorldStageMapLayerToolbar.jsx`](../../frontend/src/WorldStageMapLayerToolbar.jsx) 与 [`frontend/src/WorldMap.jsx`](../../frontend/src/WorldMap.jsx) 的装配关系。

同时扩展 [`frontend/src/WorldStageMapLayerToolbar.jsx`](../../frontend/src/WorldStageMapLayerToolbar.jsx)，允许通过可选 props 定制标题、说明文案与额外 className，以兼容 [`mapOnly`](../../frontend/src/WorldStagePanel.jsx:69) 分支原有的“地图”文案和 [`map-only-stage__toolbar`](../../frontend/src/WorldStagePanel.jsx:89) 视觉挂点。

对应地，[`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 不再内联维护 [`mapOnly`](../../frontend/src/WorldStagePanel.jsx:69) 分支的图层控制器与地图骨架，也不再重复维护主舞台分支的 [`storyboard-map-frame`](../../frontend/src/WorldStagePanel.jsx:158) 装配模板，继续收敛为顶层编排组件。

### 9. 首页切换到最小化可体验版本

[`frontend/src/services/appPanelProps.js`](../../frontend/src/services/appPanelProps.js) 已将 [`mapStageProps`](../../frontend/src/services/appPanelProps.js:80) 固定为 [`mapOnly`](../../frontend/src/WorldStagePanel.jsx:71) 体验舞台，因此首页主舞台不再默认进入完整写回 / 扰动 / D3 编排页，而是直接进入地图观察模式。

同时，[`frontend/src/App.jsx`](../../frontend/src/App.jsx) 收敛首页文案，只强调“立即进入、立即看图、立即点节点”，并将 [`AdminDebugPanel`](../../frontend/src/AdminDebugPanel.jsx:1) 调整为仅在 [`adminOpen`](../../frontend/src/App.jsx:219) 时才渲染，降低开发控制台在首屏的存在感。

### 10. mapOnly 舞台补充首屏即时反馈条

[`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 在 [`mapOnly`](../../frontend/src/WorldStagePanel.jsx:71) 分支内追加轻量选中信息条，直接复用 [`resolvedActivePoi`](../../frontend/src/WorldStagePanel.jsx:52) 与 [`activePoiId`](../../frontend/src/WorldStagePanel.jsx:13) 状态，不恢复完整版当前舞台侧栏。

该反馈条以 [`aria-live`](../../frontend/src/WorldStagePanel.jsx:95) 方式输出当前据点名、世界 hook、阵营标签、地点类型与“是否已设为当前据点”状态，使用户在首页点击地图节点后立刻获得可感知反馈。

同时，[`frontend/src/styles.css`](../../frontend/src/styles.css) 为 [`map-only-stage__feedback`](../../frontend/src/styles.css:1261) 与 [`map-only-stage__feedback-meta`](../../frontend/src/styles.css:1285) 补充地图浮层样式和窄屏降级布局，保证该即时反馈在桌面端贴附地图底部，在小屏下退化为普通信息区块。

### 11. 结果摘要收敛为“继续点地图”的引导卡

[`frontend/src/WorldSliceResultPanel.jsx`](../../frontend/src/WorldSliceResultPanel.jsx) 不再把结果区当作首屏资源面板，而是改成生成成功后的过渡引导卡：标题、摘要和主强调区统一收敛到“世界已准备好，下一步直接点地图”。

其中新增的 [`world-result-panel__next-action`](../../frontend/src/WorldSliceResultPanel.jsx:35) 直接给出单线动作提示，保留 [`sliceHighlights`](../../frontend/src/WorldSliceResultPanel.jsx:46) 作为进入前线索，同时把 [`result.preview_url`](../../frontend/src/WorldSliceResultPanel.jsx:65)、[`result.world_url`](../../frontend/src/WorldSliceResultPanel.jsx:66)、[`result.manifest_url`](../../frontend/src/WorldSliceResultPanel.jsx:67) 收纳为次级补充资源区，避免继续与地图主路径竞争。

同时，[`frontend/src/styles.css`](../../frontend/src/styles.css) 为 [`world-result-panel__hero-card`](../../frontend/src/styles.css:822)、[`world-result-panel__next-action`](../../frontend/src/styles.css:839) 与 [`world-result-panel__resources`](../../frontend/src/styles.css:872) 补充引导卡样式，使结果区在视觉上更像“进入地图前的过渡站”，而不是资源下载面板。

### 12. 入口区收敛为单主动作入口

[`frontend/src/WorldEntryPanel.jsx`](../../frontend/src/WorldEntryPanel.jsx) 在入口区新增 [`primaryActionText`](../../frontend/src/WorldEntryPanel.jsx:21) 与 [`primaryActionHint`](../../frontend/src/WorldEntryPanel.jsx:27) 两组派生文案，把“当前将执行什么进入动作”直接前置到 [`world-entry-panel__action-brief`](../../frontend/src/WorldEntryPanel.jsx:57) 中。

同时，[`frontend/src/WorldEntryPanel.jsx`](../../frontend/src/WorldEntryPanel.jsx:81) 已将原本三个并列按钮改成“单主动作 + 两个次级动作”：主按钮只承担进入 / 重新生成附近世界，重新定位与强制刷新地图数据降级到次级操作，减少首屏动作竞争。

[`frontend/src/styles.css`](../../frontend/src/styles.css) 也为 [`world-entry-panel__action-brief`](../../frontend/src/styles.css:714)、[`origin-actions--primary-first`](../../frontend/src/styles.css:732) 与 [`origin-actions__primary`](../../frontend/src/styles.css:738) 补充层级样式，使主入口在视觉上更加明确。

### 13. Hero 指标区收敛为“当前可做动作”提示

[`frontend/src/services/appShellViewModel.js`](../../frontend/src/services/appShellViewModel.js) 中的 [`buildHeroMetrics()`](../../frontend/src/services/appShellViewModel.js:17) 不再把 Hero 区组织为偏仪表盘式的状态指标卡，而是改成 3 条更短的动作提示：当前步骤、现在就做、世界规模。

其中“现在就做”会根据 [`result.world`](../../frontend/src/services/appShellViewModel.js:26) 是否存在，在“先生成附近世界”和“直接点地图节点”之间切换；同时把图层数量降级到补充说明，不再占据单独一张状态卡。

对应地，[`frontend/src/App.jsx`](../../frontend/src/App.jsx:198) 的 Hero 渲染保留现有装配边界，但将卡片语义改成 [`article`](../../frontend/src/App.jsx:200)，并新增 [`aria-label`](../../frontend/src/App.jsx:198) 标记为“当前动作提示”，让首页头部更直接回答“现在该做什么”。

[`frontend/src/styles.css`](../../frontend/src/styles.css) 也同步收紧 [`world-app-shell__hero-metrics`](../../frontend/src/styles.css:119) 与 [`world-shell-metric-card`](../../frontend/src/styles.css:126) 的样式：减少悬浮仪表盘感，压低卡片视觉重量，让 Hero 更像主标题下的一组行动提示条。

## 结果

- [`frontend/src/App.jsx`](../../frontend/src/App.jsx) 继续收敛为 app shell 组合层
- [`frontend/src/hooks/useWorldSession.js`](../../frontend/src/hooks/useWorldSession.js) 减少了展示派生状态拼装代码
- 新增 [`frontend/src/services/appPanelProps.js`](../../frontend/src/services/appPanelProps.js) 作为面板 props 组合层
- 新增 [`frontend/src/WorldStagePoiFilterLane.jsx`](../../frontend/src/WorldStagePoiFilterLane.jsx) 作为主舞台 POI 筛选子区块
- 新增 [`frontend/src/WorldStageWritebackActionPanel.jsx`](../../frontend/src/WorldStageWritebackActionPanel.jsx) 作为写回动作输入层边界
- 新增 [`frontend/src/WorldStageWritebackInsightsPanel.jsx`](../../frontend/src/WorldStageWritebackInsightsPanel.jsx) 作为写回结果反馈与 AIO 派生展示层边界
- 新增 [`frontend/src/WorldStageDisturbancePanel.jsx`](../../frontend/src/WorldStageDisturbancePanel.jsx) 作为扰动注入表单边界
- 新增 [`frontend/src/WorldStageParticipationLane.jsx`](../../frontend/src/WorldStageParticipationLane.jsx) 作为 D3 参与入口展示边界
- 新增 [`frontend/src/WorldStageMapLayerToolbar.jsx`](../../frontend/src/WorldStageMapLayerToolbar.jsx) 作为地图控制器边界
- 新增 [`frontend/src/WorldStageActivePoiPanel.jsx`](../../frontend/src/WorldStageActivePoiPanel.jsx) 作为当前舞台卡边界
- 新增 [`frontend/src/WorldStageMapFrame.jsx`](../../frontend/src/WorldStageMapFrame.jsx) 作为共享地图外框骨架
- [`frontend/src/WorldStageMapLayerToolbar.jsx`](../../frontend/src/WorldStageMapLayerToolbar.jsx) 支持 mapOnly / 主舞台双分支复用
- [`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 进一步收缩为主舞台装配层
- [`mapOnly`](../../frontend/src/WorldStagePanel.jsx:69) 分支已从 [`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 内联模板中抽离
- 首页默认体验已收敛为“入口 + 结果摘要 + mapOnly 地图舞台”
- [`AdminDebugPanel`](../../frontend/src/AdminDebugPanel.jsx:1) 不再默认占据首页首屏
- [`frontend/src/WorldStagePanel.jsx`](../../frontend/src/WorldStagePanel.jsx) 在首页 [`mapOnly`](../../frontend/src/WorldStagePanel.jsx:71) 舞台内补上轻量即时反馈条
- [`frontend/src/styles.css`](../../frontend/src/styles.css) 为地图反馈浮层补充桌面端覆盖与移动端降级样式
- [`frontend/src/WorldSliceResultPanel.jsx`](../../frontend/src/WorldSliceResultPanel.jsx) 已收敛为“生成后继续点地图”的首屏引导卡
- [`frontend/src/styles.css`](../../frontend/src/styles.css) 为结果摘要区补充主动作强调卡与次级资源区样式
- [`frontend/src/WorldEntryPanel.jsx`](../../frontend/src/WorldEntryPanel.jsx) 已收敛为单主动作优先的入口区
- [`frontend/src/styles.css`](../../frontend/src/styles.css) 为入口动作摘要卡与主次按钮层级补充样式
- [`frontend/src/services/appShellViewModel.js`](../../frontend/src/services/appShellViewModel.js) 已将 Hero 数据收敛为“当前步骤 / 现在就做 / 世界规模”三条动作提示
- [`frontend/src/App.jsx`](../../frontend/src/App.jsx) 的 Hero 区已从状态卡改为当前动作提示卡
- [`frontend/src/styles.css`](../../frontend/src/styles.css) 已降低 Hero 指标区的仪表盘感，强化单线引导
- [`frontend/src/App.jsx`](../../frontend/src/App.jsx) 已为地图舞台增加自动滚动定位与独立状态提示条，并在生成完成后轮询等待真实地图节点挂载，再滚动到实际画布而非状态条
- [`frontend/src/WorldEntryPanel.jsx`](../../frontend/src/WorldEntryPanel.jsx) 已补充生成中 / 已生成状态 chip，并在成功后明确提示“画布会出现在下方地图舞台”
- [`frontend/src/services/appPanelProps.js`](../../frontend/src/services/appPanelProps.js) 已将 [`result`](../../frontend/src/services/appPanelProps.js:25) 继续透传给入口区，用于同步首页生成状态
- [`frontend/src/styles.css`](../../frontend/src/styles.css) 已为 [`world-app-shell__stage-status`](../../frontend/src/styles.css:170)、[`world-entry-panel__status-chip`](../../frontend/src/styles.css:739) 与 [`map-only-stage__feedback`](../../frontend/src/styles.css:1218) 增补“等待生成 / 生成中 / 已生成”视觉反馈

## 验证

已十三次执行前端构建验证：

- [`frontend/package.json`](../../frontend/package.json) 的 [`build`](../../frontend/package.json:8) 脚本执行成功
- `npm run build` 通过，Vite 生产构建成功
- 第二轮 props 组合层拆分后再次执行 `npm run build`，结果仍通过
- 第三轮 POI 筛选子区块拆分后再次执行 `npm run build`，结果仍通过
- 第四轮 writeback 双组件拆分后再次执行 `npm run build`，结果仍通过
- 第五轮 disturbance / D3 子区块拆分后再次执行 `npm run build`，结果仍通过
- 第六轮地图控制器 / 当前舞台卡拆分后再次执行 `npm run build`，结果仍通过
- 第七轮 mapOnly 舞台 / 共享 map frame 拆分后再次执行 `npm run build`，结果仍通过
- 最小化可体验首页收敛后再次执行 `npm run build`，结果仍通过
- 首屏地图即时反馈增强后再次执行 `npm run build`，结果仍通过
- 结果摘要收敛为地图优先引导卡后再次执行 `npm run build`，结果仍通过
- 入口区收敛为单主动作入口后再次执行 `npm run build`，结果仍通过
- Hero 指标区收敛为当前动作提示后再次执行 `npm run build`，结果仍通过
- 本轮“生成后自动滚动到地图舞台 + 明确生成状态提示”改动后再次执行 `npm run build`，结果仍通过

## 未包含内容

本次未涉及：

- 后端 API 或写回协议变更
- 地图渲染器重构
- 新功能扩张
- 大规模组件 props 语义重写
