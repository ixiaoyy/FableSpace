# Mobile Adaptation - 移动端适配

## 目的

优化移动端用户体验，确保在手机和平板上有良好的可用性。

## 当前问题

通过移动端测试发现的问题（待确认）：
- 按钮/链接点击区域过小
- 布局不适应窄屏幕
- 字体在小屏幕上难以阅读
- 滚动/滑动体验不佳

## 优化方向

### 1. 响应式布局
- 移动端断点：320px, 480px, 768px
- 核心页面适配：
  - 首页
  - 地图发现页
  - 酒馆详情页
  - 聊天页
  - Owner 后台

### 2. 触摸优化
- 最小点击区域：44x44px
- 按钮间距加大
- 手势支持（滑动、拖拽）
- 长按菜单

### 3. PWA 支持
- Service Worker 配置
- 离线缓存策略
- 添加到主屏幕提示
- 应用图标

### 4. 性能优化
- 图片懒加载
- 虚拟列表（长列表优化）
- 骨架屏加载

## 响应式断点

```css
/* Mobile first */
.container { /* 默认 100% width */ }

/* Tablet */
@media (min-width: 768px) {
  .container { max-width: 720px; }
}

/* Desktop */
@media (min-width: 1024px) {
  .container { max-width: 960px; }
}

/* Large Desktop */
@media (min-width: 1280px) {
  .container { max-width: 1200px; }
}
```

## 触摸目标尺寸

| 元素 | 最小尺寸 | 推荐尺寸 |
|------|----------|----------|
| 按钮 | 44x44px | 48x48px |
| 链接 | 44x44px | 48x48px |
| 图标按钮 | 44x44px | 48x48px |
| 表单输入 | 44px 高 | 48px 高 |
| 列表项 | 48px 高 | 56px 高 |

## 实现步骤

1. [ ] 定义响应式断点
2. [ ] 修复首页移动端布局
3. [ ] 修复地图发现页
4. [ ] 修复酒馆详情页
5. [ ] 修复聊天页
6. [ ] 修复 Owner 后台
7. [ ] 添加 PWA 支持
8. [ ] 移动端测试验证

## 验收标准

- [ ] 所有核心页面在 320px 宽度下可用
- [ ] 触摸目标符合最小尺寸要求
- [ ] 页面加载时间 < 3s
- [ ] 可以添加到主屏幕
- [ ] 离线时显示缓存内容

## Implementation Notes: Touch Target Slice (2026-04-28)

Scope: focused mobile usability pass for homepage + discover controls.

Changes:

* Updated shared `frontend/app/ui/button.tsx` so all Button sizes, including `size="sm"`, keep at least `h-11` / 44px touch height and use `touch-manipulation`.
* Added explicit `min-h-11` and `touch-manipulation` to homepage mobile navigation/search links and large card links in `frontend/app/routes/home.tsx`.
* Added explicit `min-h-11` and `touch-manipulation` to discover view toggles, filter chips, clear button, checkbox labels, preview title buttons, card image buttons, and enter links in `frontend/app/routes/discover.tsx`.
* Added `frontend/scripts/mobile-touch-targets-test.mjs` and wired it into `npm --prefix .\frontend test`.

Verification:

* RED: `node .\frontend\scripts\mobile-touch-targets-test.mjs` failed before implementation because `Button` small variant used `h-9`.
* GREEN: `node .\frontend\scripts\mobile-touch-targets-test.mjs`: exit 0, `mobile-touch-targets-test: ok`.
* `npm --prefix .\frontend run typecheck`: exit 0.
* `npm --prefix .\frontend test`: exit 0; all script tests ok including `mobile-touch-targets-test`.
* `npm --prefix .\frontend run build`: exit 0; React Router/Vite production build completed.
* Browser screenshot check from local dev server:
  * `artifacts/dev-server/home-compact-mobile.png` (390x844) confirms homepage top nav/search/buttons remain usable and visually stable.
  * `artifacts/dev-server/discover-mobile.png` (390x844) confirms discover header/toggle/create CTA remain readable; backend was not running, so the screen showed the existing API unavailable fallback while still validating mobile layout.

Deferred:

* Full 320px audit across tavern detail, chat, and owner pages remains for later slices in this task.
* PWA/offline support remains out of scope for this slice.
