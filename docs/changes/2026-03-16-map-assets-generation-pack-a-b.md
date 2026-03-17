# 2026-03-16 map assets generation pack a b

## 背景

[`M2`](docs/AI_SHARED_TASKLIST.md:53) 已进入 `in_progress`，当前仓库已具备：

- 生成脚本 [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py)
- API 版说明 [`docs/MAP_ASSETS_GENERATION_GUIDE.md`](docs/MAP_ASSETS_GENERATION_GUIDE.md)
- 本地 GPU 版说明 [`docs/LOCAL_GPU_MAP_ASSETS_GUIDE.md`](docs/LOCAL_GPU_MAP_ASSETS_GUIDE.md)
- 目标输出目录 [`fablemap/demo_assets/new_map_assets/`](fablemap/demo_assets/new_map_assets/)

同时，仓库内已存在 Pack A / Pack B 的目录结构与同名资源文件，但本轮检查发现若生成失败，[`save_image()`](scripts/generate_map_assets.py:145) 会写入文本占位内容到 `.png` 文件路径，导致输出目录“看起来完整”，但实际可能并非可用图片资源。

## 本次确认到的现状

已检查 [`fablemap/demo_assets/new_map_assets/`](fablemap/demo_assets/new_map_assets/) 当前结构：

- `pack_a/scene_01.png`
- `pack_a/icons/*.png`
- `pack_a/tiles/*.png`
- `pack_b/scene_01.png`
- `pack_b/icons/*.png`
- `pack_b/tiles/*.png`

目录结构与命名约定已基本对齐 [`docs/MAP_ASSETS_PLAN.md`](docs/MAP_ASSETS_PLAN.md) 的预期。

但抽样检查文件大小时发现：

- [`pack_a/scene_01.png`](fablemap/demo_assets/new_map_assets/pack_a/scene_01.png) 仅 `28` bytes
- [`pack_a/icons/quest.png`](fablemap/demo_assets/new_map_assets/pack_a/icons/quest.png) 仅 `25` bytes
- [`pack_b/scene_01.png`](fablemap/demo_assets/new_map_assets/pack_b/scene_01.png) 仅 `28` bytes
- [`pack_b/icons/quest.png`](fablemap/demo_assets/new_map_assets/pack_b/icons/quest.png) 仅 `25` bytes

这与真实 PNG 资源体量明显不符，说明当前目录中的至少一部分“资源”实际上是失败生成后的占位文件，而不是可交付图片。

## 本次变更

新增：

- [`docs/claims/2026-03-16-map-assets-generation-pack-a-b.md`](docs/claims/2026-03-16-map-assets-generation-pack-a-b.md)
- [`docs/changes/2026-03-16-map-assets-generation-pack-a-b.md`](docs/changes/2026-03-16-map-assets-generation-pack-a-b.md)

同步：

- [`docs/AI_SHARED_TASKLIST.md`](docs/AI_SHARED_TASKLIST.md) 中 [`M2`](docs/AI_SHARED_TASKLIST.md:53) 已调整为 `in_progress`
- [`docs/CURRENT_TASKS.md`](docs/CURRENT_TASKS.md) 中已补入 `Map Assets 资源生成与落盘（M2）`

## 当前判断

[`scripts/generate_map_assets.py`](scripts/generate_map_assets.py) 需要进入下一步最小流程增强，重点不是扩展 prompt，而是先修正“失败输出也伪装成 `.png` 资源”的问题。

优先级建议如下：

1. 调整 [`save_image()`](scripts/generate_map_assets.py:145) 的失败处理逻辑，避免继续写入伪 PNG 占位文件
2. 为脚本增加更明确的失败标记或生成报告，区分“目录存在”与“真实图片已生成”
3. 在文档中同步说明已有目录不等于资源已验收完成
4. 之后再执行正式的 API / 本地 GPU 出图与落盘

## 明确没有改什么

- 本次还没有修改 [`scripts/generate_map_assets.py`](scripts/generate_map_assets.py) 的实现逻辑
- 还没有重新生成真实图片资源
- 还没有推进 [`M3`](docs/AI_SHARED_TASKLIST.md:54) 的验收映射与前端接入
- 还没有修改 [`frontend/src/WorldMap.jsx`](frontend/src/WorldMap.jsx)

## 验证方式

- 检查 [`fablemap/demo_assets/new_map_assets/`](fablemap/demo_assets/new_map_assets/) 目录结构是否与主线文档一致
- 抽样检查资源文件体量，识别无效占位输出
- 对照 [`save_image()`](scripts/generate_map_assets.py:145) 的失败分支，确认占位文件来源
- 后续修改脚本后，再以“可被图片工具正常读取”为真实生成成功标准

## 结果

`M2` 已从“有脚本、有目录”进一步收束为“已识别当前生成链路中的伪成功问题”。下一步应优先修正脚本失败输出语义，再进行正式的资源生成与落盘。
