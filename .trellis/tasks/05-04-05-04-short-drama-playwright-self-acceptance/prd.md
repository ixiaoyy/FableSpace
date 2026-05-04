# Short Drama Playwright Self Acceptance

## Goal

补齐 04-30 AI 短剧方向三个前端/研究子任务缺失的 Playwright 自验收：在已安装 Playwright 后，对可访问的短剧发现页入口做桌面与窄屏验证，并把截图/报告落到仓库内 artifact 路径。

## Requirements

- 使用前端本地 dev server 与 Playwright Chromium。
- 桌面和窄屏/移动视口都要覆盖发现页短剧入口卡。
- API 数据使用本地拦截 fixture，不写后端数据、不改 API/Schema。
- 截图和报告保存到 `artifacts/playwright/short-drama-ux/`。
- 报告要说明哪些 UI 已用浏览器验证，哪些仍只由脚本测试覆盖。

## Acceptance Criteria

- [x] Playwright 检查脚本可重复运行。
- [x] 生成桌面与移动截图。
- [x] 检查短剧入口卡、店主已发布 guardrail 文案、CTA 可见。
- [x] 报告写入 artifact，并在相关 Trellis PRD 记录路径。
- [x] 前端 test/typecheck/build 仍通过或说明不需要重跑的范围。

## Out of Scope

- 不引入 Firefox/WebKit 验收矩阵。
- 不启动或写入后端数据库。
- 不新增平台自动生成/发布内容能力。
- 不做短视频生成或上传管线。

## Technical Notes

- 这是验收/工具补齐任务，不改变产品 API 或 Tavern schema。
- `TavernEntryPanel` / `GameplayManager` 属于当前 native routes 未直接暴露的 product 兼容模块；若浏览器无法直接访问，报告中必须明确说明仍由脚本测试覆盖。

## 2026-05-04 Implementation Notes

- Added reusable Playwright self-check script:
  - `frontend/scripts/playwright-short-drama-ux-check.mjs`
- Added npm script:
  - `npm --prefix .\frontend run test:short-drama-ux`
- The script starts from the running local frontend URL, intercepts `/api/v1/...` requests with tavern/gameplay fixtures, and verifies native `/discover`.
- The fixture includes both:
  - one `draft` short-drama gameplay that must not render in discovery;
  - one `published` short-drama gameplay that must render as the teaser.
- Generated artifacts:
  - `artifacts/playwright/short-drama-ux/report.md`
  - `artifacts/playwright/short-drama-ux/desktop-discover-short-drama.png`
  - `artifacts/playwright/short-drama-ux/desktop-discover-search-short-drama.png`
  - `artifacts/playwright/short-drama-ux/mobile-discover-short-drama.png`
  - `artifacts/playwright/short-drama-ux/mobile-discover-search-short-drama.png`

## 2026-05-04 Verification

- `npm --prefix .\frontend run test:short-drama-ux` — first sandbox run failed with Chromium `spawn EPERM`.
- `npm --prefix .\frontend run test:short-drama-ux` — rerun outside sandbox passed:
  - `short-drama-playwright-ux-check: ok`
  - report path: `D:\work\ai-\artifacts\playwright\short-drama-ux\report.md`
- `npm --prefix .\frontend test` — passed.
- `npm --prefix .\frontend run typecheck` — passed outside sandbox.
- `npm --prefix .\frontend run build` — passed outside sandbox.
- `& 'C:\Users\phpxi\miniconda3\python.exe' ./.trellis/scripts/task.py validate .trellis/tasks/05-04-05-04-short-drama-playwright-self-acceptance` — passed.
