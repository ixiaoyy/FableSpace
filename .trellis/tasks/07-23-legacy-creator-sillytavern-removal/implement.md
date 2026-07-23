# Execution Plan

- [x] 读取权威产品、平台、Schema 和禁止事项文档。
- [x] 盘点前端 creator 路由、导航、CTA、旧 URL 别名和依赖闭包。
- [x] 盘点 FastAPI 专用 creator 路由与混合路由中的写端点。
- [x] 删除前端创建、店主、管理、提示词和公开 creator 入口。
- [x] 清除发现、任务、通知、shell 与旧路由中的 creator CTA/重定向。
- [x] 将活动路由收口为 `/`、`/characters`、`/stories/:spaceRef`，删除中文和旧 URL 别名。
- [x] 删除地图/territory UI、地图 SDK 配置、坐标筛选与只被旧入口消费的前端文件。
- [x] 删除只被 creator 入口消费的前端文件，并保留仍有玩家消费者的通用函数。
- [x] 删除专用 owner/package/config API 与混合路由 creator 写端点。
- [x] 删除失去调用方的 contracts、services、policies、stores、解析器和私有配置。
- [x] 移除 SillyTavern、角色卡、owner LLM 与 Token 残留引用。
- [x] 运行前后端验证、实际路由审计与脏工作区暂存快照审计。
- [ ] 提交、归档并记录 journal。

## Verification evidence

- `py -3 -m compileall -q apps/api/src`：通过。
- `npm --prefix .\apps\web run typecheck`：通过。
- `npm --prefix .\apps\web run build`：通过，生产 bundle 的旧能力关键词命中为 0。
- React Router：仅 3 个路由文件；中文路由字面量为 0；29/29 个活动模块可达。
- FastAPI：18 个玩家/系统路由；creator、owner、地图和旧玩法路由为 0。
- 静态路由门禁：`/`、`/characters`、`/stories/demo` 返回 200；中文、
  creator、owner、Tavern、地图和 discover 旧地址均返回 404。
- 媒体：清单条目为 0；333/333 个退役对象远端确认不存在，
  合计 139,007,917 字节；旧对象 key、URL 与源路径在审计记录外引用为 0。
- 暂存范围：497 个目标文件；并行文件、日志和临时目录误暂存为 0；
  暂存索引中的 73 个 Python 文件语法检查通过，`git diff --cached --check`
  通过。
- 对抗式自审 Verdict：**PASS**。依据为实际前后端路由清单、生产 bundle
  扫描、静态 404 门禁、远端逐对象复核和暂存白名单，而非只检查源码文件名。

## Known parallel-work boundary

- `apps/api/src/fablespace_api/core/default_spaces.py`
- `apps/web/app/components/home-story-bookshelf.tsx`
- `apps/web/app/components/home-story-bookshelf.css`
- `.tmp-home-bookshelf-data/`
- `.tmp-home-story-assets/`

这些路径不进入本任务暂存。核验时未跟踪 Home 书架只引用首页、角色与故事
ASCII 路径，且未被当前活动入口导入；本任务不整文件接管或提交它。
