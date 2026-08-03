# 实施计划

1. 改进 `CustomBackend` 的安全失败分类，禁止吞掉全部候选端点证据。
2. 新增无数据库、无用户文本的 StoryWorld provider 生产探针入口。
3. 在后端部署替换前运行配置预检和真实探针，并保留当前容器的安全错误摘要。
4. 本地用现有忽略环境验证成功路径，并用无效 endpoint/key 验证失败分类不泄密。
5. 推送 `main`，观察生产 workflow；已确认生产正确端点为 HTTP 500 而非网络错误，不安装代理，改为同步当前同名 Key。
6. 生产探针通过后验证公开健康与实际 Character 对话路径；更新部署文档和跨层/后端规范。
7. 运行 compileall、任务范围 diff、Trellis check，提交并推送最终修复。

## 验证命令

```powershell
py -3 -m compileall -q apps/api/src
py -3 -m py_compile deploy/server/configure_shared_services.py
git diff --check
```

生产验证通过 GitHub Actions 的受控 SSH 凭据执行，不连接数据库。

## 风险与停止点

- provider 探针是一次固定短文本外部调用，可能产生极小的模型用量。
- 若探针显示 Key 无效，不从日志或仓库传递 Key；另行使用受控 Secret/服务器配置通道更新。
- 若确认需要订阅代理，先获得用户提供的订阅 URL，再设计最小容器出口改动；本阶段不猜测安装。
