# 水仙与韭葱本地像素素材

制作者：Codex；日期：2026-09-10；版本：local-v1。两张图均为本轮直接编写的 16×16 像素矩阵，没有复制原作图像、读取第三方图片像素或调用图像生成服务。真实任务上下文见 [prompt 记录](spring-forage-local-2026-09-10.prompt.md)。

权威源位于 `apps/mirror-island/godot/data/media.json` 的 `items.daffodil` / `items.leek`，由现有 `FarmAssets.icon()` 在内存生成 RGBA 纹理；没有新增 PNG、远端对象或 CDN key。水仙采用黄色花冠、浅色花心与绿色茎叶；韭葱采用深浅绿叶、暖白茎和浅褐根部。两者沿用当前清新田园色系，仅作为本地功能素材，正式美术质量仍需真人验收。

| 项目 | 尺寸 | 源定义格式 / MIME | 源定义字节 | SHA-256 |
|---|---|---|---:|---|
| daffodil | 16×16 | 原生 pixels JSON / application/json | 406 | `f878a2466280520d1d1626ffa1fa590424d3a351385ee9f4563d7961b72ca3b4` |
| leek | 16×16 | 原生 pixels JSON / application/json | 406 | `4125eff922dd17a3bbd7aca4a3d213c79d2dd2008d3e4ae02ee0f551a687adb5` |

哈希针对单个 `items` 定义，递归按键排序后使用无多余空格的 UTF-8 JSON 计算，不是 PNG 哈希。Web 隐藏浏览器实际检查了快捷栏、背包详情和食用按钮：水仙显示 30g / `食用`，韭葱显示 60g / `食用 +40 体力`。临时新档物品已恢复，最终导出不含诊断起始物品；没有完成真机或最终美术验收。
