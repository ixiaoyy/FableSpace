# Implementation Plan

## 数据流

`default_public_welfare_taverns()` → `TavernStore` 读兜底 → `TavernService.list_taverns` / `get_tavern` → `WebService.list_taverns_payload` → `frontend/app/lib/homepage-taverns.ts` → 首页指标与 featured cards。

## 步骤

1. RED：在 `tests/test_default_public_welfare_taverns.py` 增加损坏 store 读取兜底测试；在 `frontend/scripts/homepage-dynamic-entry-test.mjs` 增加首页 hero 字号 contract。
2. GREEN：在 `TavernStore` 增加只读公益 seed fallback 数据源；仅 `list_taverns`、`list_all_taverns`、`get_tavern`、`get_llm_config` 读路径启用，构造和普通写路径不启用。
3. GREEN：收小 `frontend/app/routes/home.tsx` hero 标题 Tailwind classes。
4. 验证：compileall、focused pytest、frontend script、typecheck/build/test、Playwright 桌面 + 窄屏截图。
5. 记录：更新 `check.jsonl` / `task.json` 状态。

## 风险与控制

- 风险：读兜底被写路径误用后覆盖损坏文件。控制：只给明确读方法传 `include_seed_fallback=True`，构造 seed 和写方法仍读取真实文件。
- 风险：首页显示恢复但用户误以为原持久化文件已修复。控制：最终汇报说明内置公益 seed 仍在，当前 runtime 文件损坏且未被覆盖。
- 风险：字体收小影响移动端。控制：保留响应式分级并做窄屏 Playwright 截图。
