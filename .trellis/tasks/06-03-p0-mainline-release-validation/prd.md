# P0 主链路发布验收与演示硬化

## Goal

把当前 FableMap 从“功能很多但验收分散”收口到一个可重复执行、可演示、可留证的 P0 主链路发布基线。

主链路：真实坐标空间创建 → NPC 配置 → 访客进入 → 聊天 → 记忆/状态写回 → 回访反馈。

## Scope

- [x] 测试环境隔离：本地/CI 的默认验证不能因为 `.env` 指向外部 MySQL 而在 pytest 收集阶段失败。
- [x] 一键验证：提供可执行命令覆盖后端语法、关键 pytest、前端脚本测试与 build。
- [x] 主链路证据：补充/运行主链路 smoke，并记录命令输出或浏览器截图路径。
- [x] 演示硬化：不新增产品功能，只保证当前 P0 demo 可以被稳定验收。

## Non-goals

- 不新增 Schema 字段或业务枚举。
- 不引入新 UI 框架/地图依赖/状态管理库。
- 不实现平台计费、战斗等级装备、访客社交网络等禁区。
- 不清理当前既有 27 个未提交改动，除非它们直接阻塞本任务。

## Validation plan

- `py -3 -m compileall -q backend/src`
- focused mainline pytest with isolated JSON storage
- `npm --prefix .\frontend test`
- `npm --prefix .\frontend run build`
- Playwright/browser smoke if the route can be served locally without extra credentials

## Evidence

- Mainline command log: `evidence/p0-mainline-validation-20260603-142003.log`
- Browser smoke report: `evidence/browser-smoke/report.md`
- Browser screenshots:
  - `evidence/browser-smoke/home-desktop-1440.png`
  - `evidence/browser-smoke/discover-desktop-1440.png`
  - `evidence/browser-smoke/discover-mobile-390.png`
  - `evidence/browser-smoke/create-desktop-1440.png`

## Result

- Added pytest collection isolation in `tests/conftest.py` and `backend/tests/conftest.py` so local `.env` database URLs cannot force MySQL during test collection.
- Added `backend/tests/test_release_validation_environment.py` to guard the historical import-time `fablemap_api.main` failure mode.
- Added `scripts/validate-p0-mainline.ps1` as the repeatable P0 command baseline.
- Added `scripts/validate-p0-demo-browser.ps1` plus `frontend/scripts/playwright-p0-mainline-demo-smoke.mjs` for local demo route screenshots.

## Validation run

- `py -3 -m compileall -q backend/src` — PASS
- `py -3 -m pytest backend/tests/test_release_validation_environment.py backend/tests/test_v1_mainline_golden_path_smoke.py -q --tb=short` — PASS, 3 passed
- `npm --prefix .\frontend test` — PASS
- `npm --prefix .\frontend run build` — PASS
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-p0-mainline.ps1` — PASS, latest log above
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-p0-demo-browser.ps1` — PASS, screenshots above

## Remaining risk

- Full `py -3 -m pytest -q --tb=short -x` now gets past collection/MySQL initialization and ran 87 tests before stopping on `tests/test_default_public_welfare_taverns.py::test_default_public_welfare_taverns_are_seeded_and_discoverable`.
- That remaining failure is legacy public-welfare LLM expectation drift: test expects visible `custom/kilo-auto/free`, while current code/config can expose current versioned/free behavior (`deepseek-v4-flash-free`) or rules fallback when no key is present. This is recorded as a separate compatibility cleanup, not hidden as a P0 mainline pass.
