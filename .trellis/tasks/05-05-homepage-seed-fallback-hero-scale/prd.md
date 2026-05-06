# PRD: 首页公益 seed 兜底与 hero 字号修正

## 背景 / 问题

首页当前通过 `/api/v1/taverns` 获取真实 Tavern 列表来驱动指标和「正在发光的区域」。本地运行时 `.fablemap-api/taverns/taverns.json` 已损坏为非法 JSON，`TavernStore._load_taverns()` 捕获 `JSONDecodeError` 后返回空字典，导致首页指标全部显示 0，公益酒馆卡片消失。左侧 hero 标题在桌面下使用 `lg:text-[4rem]`，视觉过大。

## 目标

1. 当 `taverns.json` 损坏时，读列表 / 读单个酒馆仍能只读展示内置公益默认酒馆，让首页不退化为全 0 / 空列表。
2. 保护损坏的持久化文件：构造 store 和读兜底不能覆盖或“修复”原文件。
3. 首页 hero 左侧主标题收小，保持桌面和窄屏可读。
4. 增加回归测试，确保损坏 store 场景不再让公益 seed 从读取链路消失。

## 范围

### 允许修改

- `backend/src/fablemap_api/core/tavern.py`
- `tests/test_default_public_welfare_taverns.py`
- `frontend/app/routes/home.tsx`
- `frontend/scripts/homepage-dynamic-entry-test.mjs`
- 当前 Trellis 任务目录下的说明 / 验收记录

### 不修改

- 不改 `docs/WORLD_SCHEMA.md` 的字段和枚举。
- 不新增依赖。
- 不删除、移动、重命名既有文档。
- 不把公益 seed 变成平台自动生成内容；仍只读取已有 owner-authored / 代码内置默认公益内容。
- 不在读兜底时覆盖 `.fablemap-api/taverns/taverns.json`。

## 验收标准

- 损坏 `taverns.json` 时，`WebService.list_taverns_payload(query="公益")` 能返回内置公益酒馆，且原损坏文件内容不变。
- 损坏 `taverns.json` 时，`WebService.get_tavern_payload("pw_lantern_helpdesk")` 能读到对应公益酒馆。
- 设置 `FABLEMAP_SEED_DEFAULT_TAVERNS=0` 时不启用该兜底。
- 首页主标题不再使用 `lg:text-[4rem]` 这类过大的桌面字号。
- 运行后端 focused pytest、frontend script/typecheck/build/test；视觉变更完成 Playwright 桌面 + 窄屏截图自验收。

## 根因记录

`D:\work\ai-\.fablemap-api\taverns\taverns.json` 当前为非法 JSON：文件前部先闭合了一个只含 `_visitors` 的对象，随后又追加了 Tavern 字段片段。Python `json.loads` 报 `Extra data`，现有 `_load_taverns()` 返回 `{}`，因此 API 列表为空。公益酒馆 seed 代码仍在 `backend/src/fablemap_api/core/default_taverns.py`，没有被删除。

## Follow-up: discover empty / API 500

After homepage fallback work, local runtime data changed from invalid JSON into valid JSON with one partial top-level public-welfare seed record (`pw_third_shelf_observatory`) containing only private runtime buckets such as `_memory_atoms`. `/api/v1/taverns` tried to run `Tavern.from_dict` on that partial object and raised `KeyError: 'id'`, so the Discover route caught an API failure and rendered empty state.

Additional acceptance:

- A valid JSON store with a partial public-welfare seed record must still list/get the canonical seed data for read paths.
- Private runtime buckets on the partial record must not be discarded by the read fallback.
- `/discover` must show public-welfare cards and non-zero result count with the current local runtime file.
