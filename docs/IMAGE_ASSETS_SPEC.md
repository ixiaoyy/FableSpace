# 游戏美术资源规范

2026-09-11 状态：五件清新田园基础工具已上传不可变 CDN 对象并登记，普通 Godot 构建统一使用正式 PNG；旧工具像素定义、候选覆盖和专用美术命令已删除，见 [正式采用记录](assets/pastoral-tools-published-2026-09-11.md)。旧 Phaser/Vue 与 `?toolArt=preview` 入口已清理，下方 2026-09-06 样板描述仅保留历史来源。当前室内绘图源为 `apps/mirror-island/godot/tools/interior-atlases.json`；金属升级稿仍是后续外观方案，未作为基础工具发布。素材来源、许可证、不可变对象、署名与验收规则继续有效。

本规范覆盖当前 Web 像素游戏使用的 tileset、spritesheet、静态 UI 图像及以后单独批准的音频。核心目标是：正式二进制不进入 Git，代码只加载可追踪、不可变且允许当前用途的 CDN 对象。

## 美术质量与制作原则（2026-09-06）

- 用户已明确选择 A「清新田园」；后续工具、角色、建筑、室内和环境素材以该方向统一，B「柔和绘本」与 C「清透精绘」保留为未采用的探索稿。
- 用户明确不要求全部使用开源素材；现成素材达不到观感或功能要求时可以自行制作。合规现成素材与项目原创可以自由组合，不设成熟素材与定制素材的固定比例。
- 选择依据是实际游戏中的完成度与风格统一。像素密度、角色/物件比例、描边、配色、光照方向和细节程度需协调；同一作者或同一素材包不是质量保证，也不是采用的必要条件。
- 自制可使用像素绘制或 AI 辅助。按资产类型完成透明边、切片、瓦片接缝、四方向动画、脚底锚点与遮挡校正，回到地图和物品界面核对，不能用概念图代替可用的游戏资产。
- 工具与资源图标、室内地板/墙体/家具优先成组完善，避免新旧描边和材质密度继续混搭；先完成一处农场/小屋样板，再扩展同类场景。
- 代码绘制、生成图片和第三方来源均不豁免质量要求；类型或构建通过只证明技术可用，不代表美术完成。既有素材登记和历史截图是基线记录，不构成保留低质量素材的理由。
- 通用工程能力仍执行开源优先；美术自制不需要先穷尽开源候选。地图拓扑、碰撞与玩法边界不因素材来源策略变化而改变。

## 已选方向：A「清新田园」

用户在三版对比后明确选择 A。当前工作区已将主页、HUD、物品栏与对话界面改为暖白、薄荷与桃橙配色，并调整现有代码绘制的小屋、种子店和铁匠铺室内。五件工具图集、小屋外观和小屋室内三张 AI 辅助原创 PNG 已接入隔离 DEV 美术预览，尚未上传 CDN 或进入生产媒体目录；整张世界的素材仍未统一替换。

| 维度 | 制作要求 |
|---|---|
| 配色 | 明亮春绿与薄荷绿阴影、清透青蓝水色；建筑用暖白墙面、桃橙瓦顶与浅橡木，少量蓝色门窗及花朵点缀 |
| 像素语言 | 轮廓清楚、像素簇有组织，材质用少量明暗层次区分；控制黑边、草地噪点和零碎纹理，缩到实际游戏尺寸仍可读 |
| 比例与光照 | 轻快圆润的树冠、易辨识的角色与物件，统一左上方日间光照；脚底、家具和建筑的阴影方向一致 |
| 小屋与家具 | 外屋明亮整洁，室内采用浅木地板、奶油色墙面、蓝白床品与薄荷色柜体；家具成套设计，保留可辨识的通行空间 |
| 工具与界面 | 锄头、浇水壶、斧头、镐、镰刀先成套制作，木柄与金属材质统一；图标轮廓在 Hotbar、背包和手持动作中一致，界面配色跟随场景 |
| 场景细节 | 用少量有意安排的草簇、花、石块和作物生长差异表现生活感；避免复古羊皮纸、泛黄滤镜、旧木纹和密集重描边 |

本地参考为 `artifacts/visual-directions-2026-09-06/A-fresh-pastoral.png`，SHA-256 为 `26cba1531a4dc2ae8a504396f9505b4798cbb09980e1d57cfd79965f307f62c4`；真实生成提示词保存在同目录 `prompts.json` 的 A 项。该目录被 Git 忽略，参考图不是运行时资源，也不构成 CDN 发布记录。

示例图中的构图、角色大小与提示词里的像素尺寸只表达观感，不直接成为 Tilemap、碰撞或角色动画合同。正式制作按现有相机与地图尺度确定基础像素密度，单独处理透明边、切片、动作和锚点；不得将整张概念图裁切后直接宣称素材交付完成。

五件工具与同风格小屋内外样板目前可通过开发环境 `?toolArt=preview` 查看，来源、真实提示词、透明处理、室内两次编辑及文件哈希见 [本地样板记录](assets/fresh-pastoral-preview-2026-09-06.md)。普通界面的主题与现有室内代码美术改善不依赖这些 PNG。候选先完成实际尺寸、手持动作和小屋互动的视觉验收，再按发布合同上传不可变对象并登记 manifest。农场植被、地表过渡、作物与新候选之间的像素密度统一仍待续作，随后扩展小镇；沿用既有地图拓扑及玩法/存档边界。

## Storage and manifest

- 新游戏上游媒体基址为 `https://img.pingxingxian.space/game/media/v1`。前端默认把 `VITE_MEDIA_BASE_URL` 设为同源 `/game-media/v1`，由 Vite 或 Nginx 代理到该 HTTPS 基址，避免 Canvas/WebGL 依赖跨域响应头。
- 新游戏静态资源登记在 `deploy/cdn/game-media-manifest.json`。每项至少包含 `source`、`width`、`height`、`bytes`、`sha256`、`content_type`、`object_key` 和 `url`。
- 对象 key 一经发布不可覆盖。内容或处理方式变化时使用新的版本目录或文件名。
- 新增或替换的 PNG、JPG、WebP、GIF、AVIF、ICO、SVG、spritesheet、tileset 和音频二进制不进入 Git；现有文本型站点 favicon 不属于游戏素材，也不在首片清退范围。地图布局、frame/region 配置、来源记录和哈希可以作为文本提交。
- 旧 `deploy/cdn/media-manifest.json` 已从仓库清退；`fablespace/` 对象前缀已获用户永久删除授权，不得混入或被新游戏 manifest 引用。

推荐对象 key：

```text
assets/vendor/<package>/<source-version>/<purpose>.<ext>
assets/original/<asset-version>/<purpose>.<ext>
```

## Ninja Adventure（历史登记/开发占位）

- Pixel-Boy 官方 `Ninja Adventure - Asset Pack` 是早期已登记来源，正式来源为 `https://pixel-boy.itch.io/ninja-adventure-asset-pack`；当前角色创建和室外正式世界不再使用 Ninja/Samurai，相关对象只保留为已登记的历史/开发占位资源。
- 采用项必须来自官方 itch 包或作者官方 GitHub 仓库的固定提交；禁止引用浮动 `main`、镜像、二次打包和预览截图裁切。
- 授权记录为 CC0-1.0；第三方 CC0 素材不需要 prompt sidecar，但必须有文本来源记录。
- 来源记录至少保存作者、官方 URL、固定提交或归档日期、原始相对路径、原始/归档 SHA-256、裁切/合图/转码说明和最终对象映射。
- 不上传完整素材包；只发布当前切片实际加载的图集。

当前采用记录见 `docs/assets/ninja-adventure-2024-04-19.md`。

## VectoRaith Farming Sim Farm/Town v1

- VectoRaith Farming Sim v1.08 已作为 Farm v1 与 Town Gate A 正式美术底座；Cottage、Seed Shop 和 Blacksmith 已在工作区采用源码定义的原创像素室内，其余住宅仍是技术占位。
- 官方页面允许免费/商业项目使用与修改，并禁止素材包式原样再分发。用户于 2026-08-25 最新明确要求 Web runtime 直接使用完整官方 PNG，并批准浏览器公开下载这些完整 sheet；作者书面确认继续 pending。
- 原始 ZIP、截图和未采用目录只位于 Git ignored 本地目录。正式 CDN 只保存 6 张被运行时直接引用的官方 Original/16×16 PNG，不上传 ZIP 或创建素材浏览/下载入口。
- CDN 对象必须与官方归档内文件 bytes/SHA-256 完全一致，`transformation` 记录为 none；禁止收集 used tiles、重排 atlas、合并 entity sheet、重编码或放大。

采用记录见 `docs/assets/vectoraith-farming-sim-v1.08.md`。

## Eligible third-party assets

- 可新增成熟、现成且授权覆盖项目实际用途的第三方素材，不以开源为硬条件。默认许可范围：CC0-1.0、CC-BY-3.0/4.0、MIT、BSD-2-Clause、BSD-3-Clause、Apache-2.0；其它明确许可核对商用、所需修改以及 Web/CDN 实际分发范围，记录采用依据。
- “代码仓库开源”不等于其中图片自动开源；必须找到明确覆盖目标素材文件的官方许可证或作者声明。
- CC-BY 采用项必须保存作者、作品名、官方 URL、许可版本、修改说明，并同步到随产品发布的 `THIRD_PARTY_NOTICES` 或等价 Credits 页面；只写仓库内部文档不算完成用户侧署名。
- 禁止 NC、ND、来源不明、仅允许个人使用或未明确允许再分发的素材。CC-BY-SA、GPL/LGPL/AGPL 等强 copyleft 素材必须先提交传播/组合方式和分发义务评审，得到明确批准后才能采用。
- 候选必须来自作者官网、作者官方仓库或官方发行包；版本、tag、commit 或归档快照必须固定。禁止引用漂移分支、素材镜像、转载网盘、二次打包和搜索预览图。
- 评审同时核对像素尺寸、风格一致性、运行时体积、所需裁切/合图、升级与替换成本；优先只采用满足当前场景的最小子集。

## Project-original and generated art

- 项目原创是正式素材来源之一，适用于现成素材缺失、质量不足或风格不合适的情况；是否采用由成套实景效果决定。
- Phaser/Canvas/CSS 在运行时绘制的简单光影或 UI 图形属于代码生成的项目原创图形，不产生静态图片二进制；颜色、尺寸和用途应在代码或主题 token 中可审查。
- 人工绘制或 AI 生成并正式采用的静态图片仍须上传对象存储、登记新游戏 manifest，并记录制作或生成来源。
- AI 生成角色/精灵仍须保留 prompt sidecar；无法取得原 prompt 时使用 `reverse-engineered` 并明确说明。
- `.codex/generated_images`、临时目录、浏览器下载和聊天预览只算候选来源，不能被生产代码直接引用。

## Runtime loading

- 2026-09-07 当前角色采用 v3 真实 PNG 分层：头部、上装、下装独立组合，性别与衣服分开选择；九个整人预设不再作为创建入口，也不通过美术候选开关交付。用户已拒绝前两轮源码绘制角色，随后认可新的男女四向设计；v2 仅保留为被拒绝的历史，不得以其类型或构建通过宣称审美验收通过。
- v3 单帧为 48×64，每个部件的四向三帧图集为 144×256；脚底 `(24,60)`、世界缩放 0.5，手心参考 y43 对应相对脚底的世界偏移 `-8.5`。正常 `/` 的 Vue 创建/换装预览与 Phaser 共用同一组 PNG 部件和材质调色；`character-art.ts` 只负责裁切、组合与调色，不再用程序图元重画人体。
- 外观稳定字段属于 domain 与当前本地存档：性别、发型、上装、下装、肤色、发色及衣服配色；纹理、帧、调色板与像素坐标只属于 client。current v13 中已存在的整人外观 ID 在读取时映射为组合外观，保留同版本农场进度；不恢复旧 localStorage 或更早开发存档版本。
- 两张 432×1536 RGBA 源对象 `character-layers-v3.png`、`character-materials-v3.png` 已按不可变 `assets/original/islander/2026-09-07-v3/` 路径发布到 `game/media/v1` CDN，并登记 manifest；媒体配置与来源文本已进入 main `633f29e`。浏览器默认从同源 `/game-media/v1` 读取，来源、真实提示词与精确字节/哈希见 [v3 素材记录](assets/islander-raster-character-v3-2026-09-07.md)。应用代码的本地接入与生产部署分别记录，图片二进制不进入 Git。
- `App` 先等待两图共同加载、尺寸及 Canvas 可读性核验通过，再初始化本地入口；单图请求超时为 15 秒。失败进入明确错误页并提供“刷新重试”，不使用半套图层、不显示空白人物，也不静默回退到已被拒绝的 v2。
- 头部采用各向站立帧，接触帧轻微下沉；已排除女性马尾右向错向源帧。侧面当前仍是接触/站立循环，完整交替肢体动作尚待精修，新版本须重新发布不可变对象；批准静态方向不等于全部动画验收通过。

- 春季美术精修的小屋木作和缺失小图标由客户端固定像素配方在 Canvas/SVG 中绘制，属于运行时原创图形；不增加静态媒体对象。具体来源、GARDENS 坐标校正和 Tiled 缓存说明见 [采用记录](assets/spring-art-polish-2026-09-03.md)。
- 种子店与铁匠铺复用小屋配方，并扩充为 256×256 的 `shop-interiors` 运行时图集；Tiled 缓存不进入发布资源。详情见 [第二批采用记录](assets/shop-interiors-polish-2026-09-03.md)。
- 地表采矿与镰刀扩展中，基础镐直接使用已登记 GARDENS 原图 `(6,1)`；石料、基础镰刀和植物纤维使用 `item-pixel-art.ts` 的原创 16×16 配方，世界杂草由 Phaser 源码图元绘制；不新增静态媒体、CDN 对象或 prompt sidecar。

- 资源 URL 由 `deploy/cdn/game-media-manifest.json` 和 `apps/mirror-island/scripts/prepare-media.mjs` 集中管理；场景不得散落硬编码 CDN 地址。
- 玩家正式外观由原创分层系统拥有；VectoRaith NPC 图集继续用于现有 NPC，旧九个玩家外观 ID 仅保留为 current v13 兼容映射，不再用于创建整人候选。
- Phaser 加载前，上游资源必须可通过 HTTPS 读取。默认同源代理必须能完整回读对象；只有改为浏览器跨域直连时，才额外要求 CDN 返回 Canvas/WebGL 所需的 CORS 头。
- 使用像素素材时开启 nearest-neighbor/pixelArt；不得通过模糊缩放掩盖尺寸不匹配。
- 资源加载失败必须进入可重试状态，不得显示空白 canvas 或静默换成来源不明的占位图。

## Publication and verification

1. 在仓库外取得官方文件或制作候选资源。
2. 核对来源、授权、实际字节、尺寸、MIME 与 SHA-256。
3. 选择新游戏不可变对象 key；若远端已有同 key，必须先证明哈希相同，禁止覆盖不同内容。
4. 上传时设置正确 `Content-Type` 与 `Cache-Control: public,max-age=31536000,immutable`。
5. 更新 `game-media-manifest.json` 和来源记录，运行时基址只映射 manifest 对应对象。
   需要署名时同时更新随产品交付的 `THIRD_PARTY_NOTICES`/Credits，并验证生产 URL 可访问。
6. 从 CDN 重新读取并核对 SHA-256 与缓存头；使用同源代理时再从代理路径回读，使用跨域直连时核对 CORS。
7. 确认 Git 跟踪游戏图片/音频二进制为零，再运行前端 build。

对象存储发布不需要数据库，也不得借发布资源连接数据库。游戏 PNG 只通过 `publish-game-media` 的精确 allowlist 发布；事件 payload 的对象 key、官方固定来源、MIME、bytes 与 SHA-256 必须全部匹配，最终仍须满足上述不可变、哈希和 CDN 回读合同。

## Delivery checklist

- [ ] 资源来自官方或可证明的原创来源，授权允许当前用途。
- [ ] 第三方许可覆盖实际用途，需要单独批准的许可已有评审与批准；原创素材有可追溯的制作来源和版本。
- [ ] 署名义务已随产品交付，不只存在于仓库内部文档。
- [ ] 新游戏资源位于 `game/media/v1`，未复用旧 FableSpace 对象 key。
- [ ] manifest 的 URL、bytes、MIME 和 SHA-256 与 CDN 实际内容一致。
- [ ] 来源记录覆盖原始路径、固定版本和任何处理步骤。
- [ ] Phaser 场景只通过已登记和构建前核验的资源加载采用项。
- [ ] Git 跟踪游戏图片/音频二进制为零。
- [ ] 前端 typecheck、build 与浏览器资源加载验收使用本轮新鲜结果。
