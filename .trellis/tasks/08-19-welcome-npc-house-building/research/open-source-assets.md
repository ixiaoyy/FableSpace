# 开源素材候选评审

## 采用目标

本任务需要 16×16 顶视角河流/桥、朝南住宅、室内墙地板和短暂施工效果，并与当前 Ninja 角色保持一致。正式采用项必须来自官方固定来源、允许商用与再分发、进入不可变 CDN/manifest，Git 不跟踪图片二进制。

## 候选 A：Ninja Adventure - Asset Pack

- 作者：Pixel-Boy、AAA
- 官方页面：https://pixel-boy.itch.io/ninja-adventure-asset-pack
- 官方仓库：https://github.com/pixel-boy/NinjaAdventure
- 固定来源：`6ac78232d5aedcc85ce5f27d060ea92366f7c24a`
- 许可证：CC0-1.0；官方页面明确允许商业使用且无需署名。
- 尺寸/覆盖：16×16；当前已登记 floor、village、interior-floor、wall、男女角色，覆盖本任务全部视觉需求。
- 集成成本：低；六个不可变对象、bytes/SHA/MIME 和来源记录均已存在，只需把尚未准备的三个 tileset 加入校验下载与 Tiled 配置。
- 退出成本：低；房屋/地形 GID 集中在 TSX/布局合同，未来可换包而不改 House schema。

## 候选 B：Kenney Tiny Farm 1.0

- 作者：Kenney
- 官方页面：https://kenney.nl/assets/tiny-farm
- 官方许可说明：https://kenney.nl/support
- 固定版本：1.0
- 许可证：CC0；官方页面/支持页明确允许商业使用和再分发，不要求署名。
- 尺寸/覆盖：16×16、130 个文件，农场、作物、围栏、谷仓与自然地形风格完整。
- 集成成本：中；需要取得官方发行包、选取实际子集、上传不可变对象并新建来源/manifest/GID 记录。
- 风格影响：比 Ninja Adventure 更明亮、可爱、传统农场化；若选用，建议住宅/河流/桥/室内整体切换，避免局部混搭。

## 候选 C：Kenney Tiny Town 1.1

- 作者：Kenney
- 官方页面：https://kenney.nl/assets/tiny-town
- 官方许可说明：https://kenney.nl/support
- 固定版本：1.1（官方页面标记 `Fixed small issue`）
- 许可证：CC0；官方支持页明确允许商业使用和再分发，不要求署名。
- 尺寸/覆盖：16×16、130 个文件，适合城镇/overworld。
- 集成成本：中；需要取得官方发行包、选取实际子集、上传不可变对象并新建来源/manifest/GID 记录。
- 风格影响：更偏城镇/RPG，房屋选择多于农场元素；若选用，可与 Tiny Farm 同系列组合，但必须登记两个官方包。

## 排除候选

- Sprout Lands 免费版：官方页面明确只允许非商业项目；不符合 allowlist。
- Mystic Woods 免费版：官方页面明确只允许非商业项目；不符合 allowlist。
- Jofra Mini Farm：页面同时声称 CC0 和禁止单文件再分发，条款矛盾且作者标记停用；不采用。

## 最终决定

用户选择 A：Ninja Adventure。复用已登记固定提交子集，不新增 CDN 对象；允许开源新来源的通用规则保持有效。
