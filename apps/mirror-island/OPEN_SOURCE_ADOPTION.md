# 开源采用记录

| 能力 | 固定版本/提交 | 许可证 | 采用边界 |
|---|---|---|---|
| RPGJS | `5.0.0-beta.32` / `7c7db1b...` | MIT | map room、同步、NPC/Event、Items/Inventory、save/auth hooks |
| Keycloak Server | `26.7.1` + 固定多架构 digest | Apache-2.0 | 独立账号、Remember Me、OIDC broker、会话 |
| `keycloak-js` | `26.2.4` | Apache-2.0 | browser Authorization Code + PKCE、内存 token 刷新 |
| `oidc-provider` | `9.11.1` | MIT | 把现有 ParallelLines ticket 窄适配为 OpenID Certified OIDC provider |
| Prisma/@prisma/client/@prisma/adapter-pg | `7.9.1` | Apache-2.0 | PostgreSQL schema、migration、transaction/OCC、生成 client |
| `pg` | `8.23.0` | MIT | Prisma 7 PostgreSQL driver adapter |
| `jose` | `6.2.9` | MIT | Keycloak JWT/JWKS 验证和 OIDC 签名键生成 |
| `simplex-noise` | `4.0.3` | MIT | 固定 seed 基础地形 |
| Ninja Adventure | 固定提交 `6ac78232...` | CC0-1.0 | 只使用 manifest 已登记角色/地形子集 |

## 安全与退出

- `@rpgjs/vite@5.0.0-beta.32` 间接依赖有未修复的 `image-size@2.0.2` DoS 公告。它只在隔离构建阶段读取受信本地素材；游戏 Node runtime 镜像不包含 `image-size` 或 `@rpgjs/vite`。
- Prisma CLI 的 `deepmerge-ts@7.1.5` 存在递归图合并栈耗尽公告。CLI 只位于一次性 migration 镜像，只读仓库内受信 `prisma.config.ts`/模式，不处理用户对象图；不用不兼容的强制降级伪修复。
- `oidc-provider` 不保存长期身份；只有单进程、有 TTL 的交互/code/grant 适配。进程重启只使正在进行的论坛登录重试，已建立的身份和会话归 Keycloak 持久化。
- OIDC ID Token 使用生产配置首次生成并后续复用的 P-256/ES256 私钥；Keycloak 通过稳定 JWKS 验签，`mirror-game` 重启不轮换签名身份。
- 底层替换必须保持同一 Keycloak subject、RPGJS SaveStorageStrategy 和九表数据合同；不通过恢复旧 React/Phaser/FastAPI 系统退出。
