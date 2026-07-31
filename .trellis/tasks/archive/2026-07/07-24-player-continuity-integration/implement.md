# 跨设备恢复与会话失效执行清单

## 实现

- [x] 在 `session.ts` 提取访问状态缓存失效函数，供强制刷新、登出和 `401` 复用。
- [x] Character 故事页收到 `SESSION_EXPIRED_EVENT` 时先失效缓存，再进入 `expired`。
- [x] `run-loaded` 清理失败写入、pending exchange 和未确认草稿。
- [x] 写失败后冻结入口、选择和消息写操作，不再提示直接重试。
- [x] 在现有错误面提供只读“重新载入”，只调用访问状态与 `runs/current`。
- [x] 保持会话失效后的迟到响应无效，不增加 POST 自动重放。
- [x] 同步 `docs/WORLD_SCHEMA.md` 的连续性与失败恢复合同。
- [x] 更新父任务中已经完成的系统 LLM 检查项。

## 验证

```powershell
npm --prefix .\apps\web run typecheck
npm --prefix .\apps\web run build
```

另执行：

- 定向检查 reducer 的 `401`、迟到成功、写失败冻结和只读恢复状态；
- 搜索 StoryWorld 前端请求，确认没有 `player_id`、自动 POST retry 或旧 Space 适配；
- 核对登录回跳白名单仍只允许规范 Character 故事深链；
- `git diff --check`；
- 不连接数据库，不调用真实写 API。

## 验证结果

- `npm --prefix .\apps\web run typecheck`：通过。
- `npm --prefix .\apps\web run build`：通过。
- `npx -y react-doctor@latest . --verbose --diff`：`100/100`，无问题。
- 定向状态与跨层源码审计：14/14 通过；未连接数据库，未调用真实写 API。
- 项目未配置前端 lint 或 test 脚本，本任务未恢复测试体系。

## 风险与回滚点

- 只修改现有状态流和少量错误操作样式，不重排正常故事界面。
- 如果只读恢复失败，保持明确不可写状态，不用旧 `run` 假装可以继续。
- 不新增定时轮询，避免页面后台持续触发授权回查。
