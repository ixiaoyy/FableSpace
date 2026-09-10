# 春季种子与野种植株本地像素素材

制作者：Codex；日期：2026-09-10；版本：local-v1。春季种子图标和三阶段野种植株均由本轮直接编写像素矩阵，没有复制原作图像、读取第三方图片像素或调用图像生成服务。真实任务上下文见 [prompt 记录](spring-seeds-local-2026-09-10.prompt.md)。

权威源位于 `apps/mirror-island/godot/data/media.json` 的 `items.spring-seeds` 与 `crops.spring-forage`。现有 `FarmAssets.icon()` / `crop_texture()` 在内存生成 RGBA 纹理，没有新增 PNG、远端对象或 CDN key。种子袋使用暖白纸袋、棕色封边和四色种子标记；植株使用当前作物共用调色板，以 3 天 / 4 天分隔两段生长并提供成熟帧。

| 项目 | 尺寸 | 源定义格式 / MIME | 源定义字节 | SHA-256 |
|---|---|---|---:|---|
| spring-seeds | 16×16 | 原生 pixels JSON / application/json | 462 | `2f6e1128decfdabdff8a8f2cc2deb5a75a565ca58a56ca5b62bad9e19e49c9c8` |
| spring-forage | 3 帧 × 16×24 | 原生 pixels JSON / application/json | 1404 | `9ca4b812edb007bae2d12f58d54aa813729be2804a8d56c643e6f77ba5a6511b` |

哈希针对单个定义，递归按键排序后使用无多余空格的 UTF-8 JSON 计算，不是 PNG 哈希。逐日无窗口检查覆盖三阶段、漏浇不变化和第七次有效生长成熟。隐藏 Web 隔离新档实际检查了制作行、四种材料、种子袋图标、制作后数量 10 与背包 35g 详情。临时经验、配方和材料已恢复，最终导出不含诊断状态；真人种植观感和最终美术仍待验收。
