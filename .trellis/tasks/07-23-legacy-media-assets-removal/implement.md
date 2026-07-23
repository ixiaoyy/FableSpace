# Execution Plan

- [x] 读取媒体、部署与旧内容清理约束，盘点现有清单及 sidecar。
- [x] 锁定第一批 25 个精确对象与 25 个对应 sidecar。
- [x] 排除清单、sidecar、任务记录和构建产物后，完成全仓精确引用扫描。
- [x] 验证本地 S3/CDN 配置指向清单的同一不可变命名空间。
- [x] 对 25 个远端对象执行签名 HEAD，确认全部存在且大小匹配。
- [x] 生成 `retired-media.json`，保存删除前的完整清单记录与证据。
- [x] 对台账中的 25 个精确 key 执行远端 DELETE，并逐项确认 404。
- [x] 删除 25 个 prompt sidecar，更新媒体清单与统计。
- [x] 运行远端、清单、残留引用、Git 图片数、diff 和前端构建验证。
- [ ] 提交、归档本任务并记录 journal。

## Exact first-batch totals

| Item | Before | Removed | After |
|---|---:|---:|---:|
| Manifest entries | 358 | 25 | 333 |
| Manifest bytes | 148522769 | 9514852 | 139007917 |
| `migrate` entries | 358 | 25 | 333 |
| Prompt sidecars | 49 in `npc-style-cast` | 25 | 24 |

## Stop conditions

- 候选出现活动引用；
- 清单记录或 sidecar 不是一一对应；
- CDN base 与 S3 prefix 映射不一致；
- 远端 HEAD 大小与清单不一致；
- DELETE 后对象仍可通过签名 HEAD 读取。

命中任一条件时，只停止有问题的精确对象，不扩大或改用目录级删除。

## Verification evidence

- `retire_media.py verify`：333 个保留条目、139007917 字节、25 个远端对象不存在、25 个已退役 sidecar 不存在、24 个受保护 sidecar 仍在。
- 精确活动引用扫描：0 个匹配。
- `public-welfare`：140 个清单条目、28 个 sidecar，未变。
- Git 跟踪图片二进制：0。
- `npm --prefix .\apps\web run build`：通过。
- `react-doctor`：报告既有 `SpaceChatRoom.jsx` 动态 HTML 警告后，其
  oxlint 插件发生栈溢出并退出，未得到分数；该文件不在本批改动范围。
