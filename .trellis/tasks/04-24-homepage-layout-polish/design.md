# 首页设计稿执行说明

## Design Source
2026-04-24 使用 image2 生成一版高保真首页方向图，并复制到本任务目录：`homepage-image2-design.png`。核心方向如下：

- 浏览器窗口式外框，顶部有 FM logo、导航、搜索框、登录/注册或开店入口。
- Hero 左侧为大标题与 CTA；右侧为酒馆内景 + NPC 主人 banner。
- Hero 下方是 4 项横向数据指标条。
- 中段是 3 张带图片封面的精选酒馆卡。
- 下段是两个模块：AI NPC 对话、记忆/回访。
- 底部价值条强调店主主权、隐私安全、真实连接。

## Implementation Rule
设计图只作为视觉参考；最终页面必须保持真实 React/Tailwind DOM，不允许回退为整页截图贴片。

## Implementation Mapping
- `frontend/app/routes/home.tsx` 已按设计稿落地为浏览器窗口外框、导航搜索、hero、指标条、热门酒馆卡、NPC 对话模块、记忆模块、底部价值条。
- 设计图只作为视觉方向，页面主体仍是真实 DOM + 模块图片。

## Review / Test
- `npm --prefix .\frontend run typecheck` passed.
- `npm --prefix .\frontend run build` passed.
- `npm --prefix .\frontend test` passed.
- `curl.exe --noproxy * -sS -D - http://127.0.0.1:8950/ -o NUL` returned 200 OK.
- Browser plugin/node_repl surface was not available in this session, so no in-app visual screenshot was captured after implementation.

## Web Page Adjustment (2026-04-24)
用户反馈上一版更像 H5/活动页。本轮把实现调整为更常规的桌面 Web 产品首页：

- 去掉内嵌浏览器窗口外框和整页样机感。
- 使用 sticky 顶部导航、全宽页面背景、标准 1200px 内容容器。
- Hero 采用左文案右产品预览面板，而不是单个宣传海报。
- 指标、热门酒馆、AI 对话、记忆、价值条拆成独立网页 section。

验证：
- `npm --prefix .\frontend run typecheck` passed.
- `npm --prefix .\frontend run build` passed.
- `curl.exe --noproxy * -sS -D - http://127.0.0.1:8950/ -o NUL` returned 200 OK.
- `git diff --check -- frontend/app/routes/home.tsx .trellis/tasks/04-24-homepage-layout-polish` passed.

## Flat Web Adjustment (2026-04-24)
用户反馈整体可以更扁平、图片模块更大。本轮调整：

- 内容最大宽度从 1200px 放大到 1320px。
- Hero 栅格改为更偏向右侧视觉预览，右侧主图最小高度提升到 520/600px。
- 降低阴影、圆角和多层卡片嵌套，卡片从 `rounded-3xl` 收敛到更扁平的 `rounded-2xl`。
- 热门酒馆卡片封面高度提升到 256/288px。
- AI NPC 与记忆图片区块显著放大，减少 H5/海报感。

验证：
- `npm --prefix .\frontend run typecheck` passed.
- `npm --prefix .\frontend run build` passed.
- `curl.exe --noproxy * -sS -D - http://127.0.0.1:8950/ -o NUL` returned 200 OK.
- `git diff --check -- frontend/app/routes/home.tsx .trellis/tasks/04-24-homepage-layout-polish` passed.

## High Resolution Image Replacement (2026-04-24)
用户反馈页面图片像素偏低。本轮使用 image 能力重新生成并替换首页模块图片：

- `hero-banner.png`：1672×941，约 1.73 MB。
- `tavern-night.png`：1672×941，约 2.09 MB。
- `tavern-neon.png`：1672×941，约 2.61 MB。
- `tavern-street.png`：1672×941，约 2.25 MB。
- `npc-dialogue.png`：1672×941，约 1.77 MB。
- `memory-module.png`：1672×941，约 2.43 MB。

这些图片替换了早先从参考图裁切得到的低清模块图，仍位于 `frontend/app/assets/homepage-reference/modules/`。原始 image 生成文件保留在 Codex generated_images 目录，未删除。

验证：
- `npm --prefix .\frontend run typecheck` passed.
- `npm --prefix .\frontend run build` passed.
- `curl.exe --noproxy * -sS -D - http://127.0.0.1:8950/ -o NUL` returned 200 OK.
- `git diff --check -- frontend/app/assets/homepage-reference/modules .trellis/tasks/04-24-homepage-layout-polish frontend/app/routes/home.tsx` passed.

## Hero Card Image Recomposition (2026-04-24)
用户指出 hero 主图是横版图放进高卡片容器，导致 `object-cover` 裁切严重。本轮重新生成并替换 `hero-banner.png`：

- 新图尺寸：1003×1568，约 2.11 MB。
- 构图改为竖向 / 高卡片友好，人物主体位于中间安全区，不贴右边缘。
- 保留左侧和底部暗部空间，用于页面上的状态徽标与对话浮层。
- 原始生成文件仍保留在 Codex generated_images 目录，未删除。

验证：
- `npm --prefix .\frontend run typecheck` passed.
- `npm --prefix .\frontend run build` passed.
- `curl.exe --noproxy * -sS -D - http://127.0.0.1:8950/ -o NUL` returned 200 OK.
- `git diff --check -- frontend/app/assets/homepage-reference/modules/hero-banner.png .trellis/tasks/04-24-homepage-layout-polish frontend/app/routes/home.tsx` passed.
