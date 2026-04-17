# 2026-04-17 — UX-01 浅色/暗色主题切换 + UX-02 卡片化酒馆发现列表

## 完成内容

### UX-01 浅色/暗色主题切换

- 新增 `frontend/src/ThemeToggle.jsx`，支持设置页内切换浅色/暗色模式
- 新增 `[data-theme="light"]` CSS 覆盖层，默认暗色，切换时写入 `document.documentElement.setAttribute('data-theme', theme)`
- `localStorage` 持久化 `fablemap_theme` 键，重启后保持偏好
- 语义化 CSS 变量体系：背景（`--c-bg-*`）、文字（`--c-text-*`）、边框（`--c-border-*`）、按钮（`--c-btn-*`）、阴影（`--c-shadow-*`）均有 dark/light 独立值
- 渐变通过 `--g-*` 变量（`--g-hero-shell`、`--g-shell-bg`、`--g-shell-bg-soft`、`--g-panel-radial`、`--g-hero-radial`）统一管理，切换主题时一并替换
- 已有 CSS 规则中的硬编码颜色（body 背景、input/button/panel/mini-label/world-shell-metric-card/tavern-discovery-* 系列）已全部改为语义变量
- `.world-app-shell` 和 `.world-app-shell::before` 背景已改用 CSS 变量

### UX-02 卡片化酒馆发现列表

已确认 `WorldStageTavernDiscoveryLane.jsx` 已有完整实现：
- 双栏网格卡片（封面图占位、名称、状态、入口、距离、角色数、访问次数）
- 搜索、入口筛选、状态筛选、排序（最近/名称/访问/角色）
- marker 数量上限联动提示（地图最多显示 80 个）
- 逐步加载（每次 +12 间）
- marker/列表联动（`activeTavernId` 同步）

## 验证

- `npm --prefix frontend run build` → passed（86 modules，CSS 145.83 kB gzip 24.16 kB）
- `py -3 -m pytest -q --tb=short` → 180 passed
- `py -3 -m compileall -q fablemap` → passed

## 变更文件

- `frontend/src/ThemeToggle.jsx` — 新增主题切换组件
- `frontend/src/App.jsx` — 导入 ThemeToggle，写入设置面板；在 useEffect 初始化时从 localStorage 恢复主题
- `frontend/src/styles.css` — 新增 100+ 行语义化主题变量（dark 默认 + light 覆盖）、主题切换器样式、tavern-discovery 卡片系列主题化

## 未涉及（不属于本次范围）

- 酒馆编辑对话框、店主控制台内部样式主题化（后续分任务处理）
- 深色主题下的 tavern-discovery 卡片仍使用偏暖色调（与暗色背景形成对比）；若需完全中性暗色，可单独处理