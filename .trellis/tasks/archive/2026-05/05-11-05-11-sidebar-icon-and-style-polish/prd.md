# Sidebar Icon and Style Polish

## Goal

针对 `index_light.png` 设计稿与当前实现在图标精致度上的差距，进行专项打磨。核心是将侧边栏及主入口的 Unicode 字符/粗糙图标替换为精细的 `lucide-react` 组件，并移除沉重的圆形边框，还原设计稿的“空气感”与“高级感”。

## Requirements

- [x] **图标系统升级**：引入 `lucide-react`，替换侧边栏所有 Unicode 图标。
- [x] **去除重边框**：移除侧边栏图标外围的 `rounded-xl border` 容器，直接展示图标，匹配设计稿布局。
- [x] **活跃态优化**：重构 `activeClass`，实现更精致的背景胶囊色与左侧垂直指示条（Indicator Bar）。
- [x] **品牌 Logo 修正**：调整 "SoulLink" 字体权重与副标题间距。
- [x] **交互细节**：
  - 增加“回响”项的数字角标（Badge）。
  - 更新搜索框（Search）与播放按钮（Play）图标。
  - 更新主题切换（Sun/Moon）与设置（Settings）图标。

## Acceptance Criteria

- [x] 侧边栏图标不再有圆形背景容器，视觉重心保持轻盈。
- [x] 活跃项拥有明显的紫色/青色（黑夜模式）左侧指示条。
- [x] 搜索框内使用 Lucide `Search` 图标，比例协调。
- [x] `npm run build` 构建通过。
- [x] UI 在桌面端与移动端均无溢出，符合 `mobile-single-mainline` 规范。

## Technical Notes

- 涉及文件：`frontend/app/components/soul-link-reference-artboards.tsx`。
- 依赖：`lucide-react`。
- 遵循 `.trellis/spec/frontend/` 下的组件与质量规范。
