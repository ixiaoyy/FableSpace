# 系统故事内容模型执行计划

## 1. 实施前保护

- [x] 核对 `git status`，确认 `apps/api/src/fablespace_api/core/default_spaces.py`、首页草稿、临时资产和日志均为任务外遗留。
- [x] 只允许修改：
  - `apps/api/src/fablespace_api/domain/story_world.py`
  - `docs/WORLD_SCHEMA.md`
  - 当前 Trellis 任务目录
- [x] 禁止修改 API、application、infrastructure、前端、旧 Space / Gameplay 和现有种子。

## 2. 实现不可变领域类型

- [x] 添加 `PublicationStatus`、`CanonCategory` 和全部 frozen/slots dataclass。
- [x] 所有集合使用 tuple；不暴露 mutable default、list、dict 或任意 payload。
- [x] 只使用 Python 标准库，不修改 requirements。

## 3. 实现统一校验与只读注册表

- [x] 添加 `StoryContentValidationError(code, path, message)`。
- [x] 校验必需文本、枚举、关系范围和标记集合。
- [x] 校验 Registry 级 StoryWorld / Character / PlayerRole 唯一 ID。
- [x] 校验世界内章节、节点、选择、结局、正史和关系阶段 ID。
- [x] 校验 PlayerRole / Character / RelationshipEffect / 节点 / 结局引用。
- [x] 校验入口、可达性、终局和死路。
- [x] 校验固定史实来源与 published 待核验限制。
- [x] 用 tuple + MappingProxyType 实现 `get / require / all / published`，不提供写方法。

## 4. 添加定向构造验证

- [x] 在任务目录新增 `verify_story_content_model.py`。
- [x] 构造历史与原创两个非生产最小样例，验证查询顺序与 published 过滤。
- [x] 覆盖错误 Character 引用、重复 ID、缺失 PlayerRole、非法发布状态。
- [x] 覆盖节点 / 结局错误、不可达节点、死路和 published 待核验内容。
- [x] 每个失败场景断言稳定错误 code；至少关键引用场景断言 path。
- [x] 输出 `story-content-model-contract-ok`。

## 5. 同步 Schema

- [x] 把 `docs/WORLD_SCHEMA.md` 的章节 / 选择 / 结局 / 正史 / 关系规则占位描述替换为实际字段和作用域。
- [x] 记录 Registry 是唯一校验边界，禁止消费者直接构造未校验 dict。
- [x] 不改产品宣传、平台边界或其他权威文档。

## 6. 最小真实验证

```powershell
py -3 -m compileall -q apps/api/src

$env:PYTHONPATH = (Resolve-Path '.\apps\api\src')
py -3 .\.trellis\tasks\07-23-story-content-model\verify_story_content_model.py

git diff --check
```

- [x] `compileall` 通过。
- [x] 定向脚本输出稳定成功标记。
- [x] `rg` 证明新模块不含 `Space`、owner、坐标、SillyTavern、password、Gameplay 或旧 import。
- [x] 对照 `docs/WORLD_SCHEMA.md` 做对抗式自审并记录 Verdict。

## 7. 提交与回滚点

- [ ] 提交前只暂存本计划允许文件；任务外脏文件保持未暂存。
- [ ] 若模型范围超出已确认合同，回到 planning 收紧字段，不用兼容字段掩盖。
- [ ] 若校验逻辑误拒两个最小样例，修正模型或样例合同；不得放宽为静默归一。
- [ ] 本任务没有数据库或 API 迁移；单个工作提交即可完整回滚。

## 8. 验证记录

验证日期：2026-07-23。

- `py -3 -m compileall -q apps/api/src`：PASS。
- 设置 `PYTHONPATH=apps/api/src` 后运行 `verify_story_content_model.py`：PASS，输出 `story-content-model-contract-ok`。
- `py -3 .trellis/scripts/task.py validate .trellis/tasks/07-23-story-content-model`：PASS；Codex inline 模式未使用 `implement.jsonl` / `check.jsonl`。
- `git diff --check`：PASS；仅有 Windows 工作区既有 LF/CRLF 提示。
- 新领域模块旧合同 / 旧依赖扫描：PASS，无 Space、owner、坐标、SillyTavern、password、Gameplay、core 或 infrastructure 引用。

对抗式自审 Verdict：**PASS**。

- 类型与 Schema：实际 dataclass 字段、枚举、ID 作用域、只读 Registry API 与 `docs/WORLD_SCHEMA.md` 一致。
- 失败边界：定向脚本证明错误 Character、跨 Registry 重复 Character / PlayerRole、世界内重复节点、缺失 PlayerRole、非法发布状态、错误节点 / 结局引用、不可达节点、死路、带选择终局、未引用结局、固定史实来源不足和 published 待核验内容均被拒绝。
- 不可变性：输入 iterable 在构造时复制，领域对象和 Registry 均冻结，嵌套集合要求 tuple，内部索引使用 MappingProxyType。
- 任务范围：未修改 API、application、infrastructure、前端、旧 Gameplay 或 `default_spaces.py`。
- Spec 判断：可执行合同已进入权威 `docs/WORLD_SCHEMA.md` 和任务级验证脚本；本任务不在 `.trellis/spec/` 复制一份易漂移的平行 Schema。历史指南的旧 Space / NPC 术语同步仍应由独立规范任务处理。
