# 镜像岛 RPGJS 联机尖峰

这是一个与现有 `apps/web` 隔离的、可删除的技术尖峰，用来验证 RPGJS 是否能承载镜像岛的多人可见、NPC、物品栏、动态地块和存档接口。它不是生产入口，也不接认证、数据库或旧游戏存档。

This is a project template for [RPGJS](https://rpgjs.dev) apps. It lives at https://github.com/rpgjs/starter/tree/v5.

To create a new project based on this template using [degit](https://github.com/Rich-Harris/degit):

```bash
npx degit rpgjs/starter#5 rpg-app
cd rpg-app
```
## Get started

Install the dependencies...

```bash
cd rpg-app
npm install
npm run dev
```

首次启动会从项目不可变 CDN 下载并校验三项已登记 CC0 素材，生成文件保持 Git 忽略。

联机模式（Windows/macOS/Linux 通用）：

```bash
npm run dev:mmorpg
```

靠近地图下方的引导员并执行默认确认键，可获得一个“演示土豆”、触发一块服务端地图变化，并写入仅存活于当前进程的内存存档。按 `Esc` 打开 RPGJS 自带菜单查看物品栏。

尖峰采用每个浏览器标签页独立的临时连接 ID，并把相邻连接交替出生在引导员两侧，便于直接打开两个标签页验证联机同步；正式认证接入后由 Keycloak 的稳定用户身份与正常安全落点替代。

Navigate to [localhost:5173](http://localhost:5173). You should see your game running. Edit a file in `src`, save it, and reload the page to see your changes.


## Production

### Build with NodeJS

```bash
NODE_ENV=production npm run build
```

Verify that root and subpath production servers can load the sample Tiled map
and bundled UI theme:

```bash
npm run test:production
```

## Resources

[Documentation](https://v5.rpgjs.dev)

依赖采用、资产边界与安全例外见 [OPEN_SOURCE_ADOPTION.md](./OPEN_SOURCE_ADOPTION.md)。
