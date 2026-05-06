# 完成记录

## 改动

- 首页 Hero 主标题从三行巨型黑体改为两行更短文案：`真实坐标， / 藏着会回应的世界`。
- 桌面字号从旧的 `lg:text-[3.2rem]`/更大风险降到 `lg:text-[2.4rem]`，移动端降到 `text-[1.72rem]`。
- 字重从 `font-black` 改为 `font-bold`，行高放宽到 `leading-[1.24]` / `lg:leading-[1.18]`，去掉过紧字距。
- 更新首页脚本测试，防止回退成大块三行标题。

## 验证

- `node .\frontend\scripts\homepage-dynamic-entry-test.mjs`：通过。
- `node .\frontend\scripts\home-pc-polish-test.mjs`：通过。
- `node .\frontend\scripts\home-visual-density-test.mjs`：通过。
- `npm --prefix .\frontend test`：通过。
- `npm --prefix .\frontend run typecheck`：通过。
- `npm --prefix .\frontend run build`：通过。
- `node .\.trellis\tasks\05-05-05-05-home-hero-title-readability\artifacts\playwright-check.mjs`：通过。

## Playwright 截图

- 桌面：`D:\work\ai-\.trellis\tasks\05-05-05-05-home-hero-title-readability\artifacts\desktop.png`
- 移动：`D:\work\ai-\.trellis\tasks\05-05-05-05-home-hero-title-readability\artifacts\mobile.png`
- 报告：`D:\work\ai-\.trellis\tasks\05-05-05-05-home-hero-title-readability\artifacts\playwright-report.json`

## 备注

只收敛首页首屏标题排版；没有改 API、Schema 或图片资产。
