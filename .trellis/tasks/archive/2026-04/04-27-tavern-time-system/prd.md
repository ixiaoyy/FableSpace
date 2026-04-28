# 酒馆时间系统

## Goal

为 FableMap 酒馆平台实现基于地理位置的时间系统：自动推断时区、精确到分钟的营业时间管理、NPC 状态与对话随时间动态变化，打烊时呈现"熄灯"氛围但不隐藏酒馆。

## What I already know

* Tavern 模型当前有 `lat`、`lon`、`address`，没有时区和营业时间字段。
* `docs/WORLD_SCHEMA.md` 定义了核心数据模型（v0.5）。
* 用户决策：打烊时酒馆可搜到但显示"熄灯"效果，精确到分钟考虑季节变化，心情由 AI 综合判断随机生成。

## Product Decisions (from user)

| 决策点 | 选择 |
|-------|------|
| 打烊时酒馆可见性 | 始终可搜到，显示"熄灯"氛围 |
| 时间粒度 | 精确到分钟，考虑夏令时 |
| 心情生成方式 | AI 综合判断，不预设心情池 |
| 营业状态影响 | NPC 说"不营业"但不驱逐访客 |

## Requirements

### Core Feature (MVP)

1. **时区推断与管理**
   - 基于 `lat/lon` 自动推断 IANA 时区（如 `Asia/Shanghai`）
   - 推断方案：优先使用 `timezonefinder` 库（轻量，无额外 API 调用）
   - 允许店主手动覆盖时区（处理行政区划边界情况）
   - 使用 `zoneinfo` (Python 3.9+) 处理 DST
   - 不依赖：Nominatim 查询（避免额外延迟）

2. **营业时间配置**
   - 支持 `always_open` 模式（默认，保持向后兼容）
   - 支持 `scheduled` 模式（MVP 简化版）：
     - **MVP**：单一时段配置（`open_at` / `close_at`），应用于所有适用天数
     - 按星期几启用/禁用（`enabled_days: number[]`，0=周一, 6=周日）
     - 支持跨午夜（`close_at` > `open_at` 表示次日凌晨打烊）
     - HH:MM 格式，精确到分钟
   - **进阶**（Phase 2）：多时段配置、节假日覆盖（`*-05-01` 格式）
   - 精确到分钟计算"当前是否营业"

3. **时间感知 LLM Prompt**
   - 构建 `time_context`：当地日期时间、星期、季节、营业状态
   - 注入 LLM prompt 作为上下文背景
   - 打烊时追加特殊指令：NPC 以礼貌方式说明不营业

4. **前端展示**
   - 酒馆卡片/详情显示营业状态（营业中 / 已打烊）
   - 非营业时视觉"熄灯"效果：
     - 整体降低明度（CSS `filter: brightness(0.7)`）
     - 叠加半透明黑色遮罩
     - 图标/装饰暗淡处理
   - 显示酒馆当地时间（"22:47" 格式）
   - 打烊时酒馆仍可对话，但 NPC 回复带有"不在营业"氛围
   - **访客时差**：MVP 简单处理，只显示酒馆本地时间（不显示"你那边是X点"）

5. **API 响应**
   - 酒馆列表/详情 API 返回 `is_open` 和 `local_time_display`
   - 减少前端重复计算

### Extensions (Phase 2)

5. **NPC 作息偏好**
   - `sleep_preference` 字段：`early_bird` | `night_owl` | `irregular` | `never_sleep`
   - 影响 AI 在不同时段的活跃度和对话风格

6. **特殊时段活动**
   - NPC 可配置定时活动（如 `"19:00-21:00 讲故事时间"`）
   - 活动时段进入时 NPC 可能主动开场

7. **时段问候语**
   - 店主可配置各时段（深夜/清晨/上午/下午/晚间）的自定义问候语
   - 不配置时由 AI 自主生成

8. **节假日覆盖**
   - 支持指定日期或相对日期（如 `*-05-01`）的特殊营业时间
   - 需要解析器处理通配符日期匹配

### Extensions (Phase 3)

9. **季节主题**
   - `time_context_template` 支持 `{{season}}` 等变量
   - 店主可自定义季节性氛围描述

10. **访客时差对比**
    - 显示"你那边是 X 点，这里是 Y 点"
    - 需要获取访客本地时区（可从浏览器或用户设置获取）

## Data Model

```typescript
// Tavern 新增字段
interface Tavern {
  // ...现有字段
  
  timezone?: string;              // IANA 时区: "Asia/Shanghai"，不填则从 lat/lon 推断
  operating_hours: OperatingHours;
  time_context_template?: string; // 可选，店主自定义时间提示词
}

type OperatingHours =
  | { mode: 'always_open' }
  | {
      mode: 'scheduled';
      open_at: string;         // "09:00"
      close_at: string;        // "22:00" 或 "26:00" 表示次日凌晨
      enabled_days: number[];  // 0=周一, 6=周日，如 [0,1,2,3,4] 表示工作日
    };
  // Phase 2 扩展：
  // | {
  //     mode: 'scheduled_advanced';
  //     default: DaySchedule[];
  //     overrides: DayOverride[];
  //   };

// TavernCharacter 新增字段
interface TavernCharacter {
  // ...现有字段
  
  sleep_preference?: 'early_bird' | 'night_owl' | 'irregular' | 'never_sleep';
  special_activities?: {
    time_range: { start: string; end: string };
    activity: string;
    enabled: boolean;
  }[];
  greeting_by_time?: {
    night?: string;
    early_morning?: string;
    morning?: string;
    afternoon?: string;
    evening?: string;
  };
}
```

## Time Context 示例

```python
# 构建的时间上下文
@dataclass
class TimeContext:
    utc_now: datetime
    local_time: datetime          # 转换后的当地时间
    timezone: str                 # "Asia/Shanghai"
    time_display: str             # "晚上10:47"
    day_of_week: str              # "周一" / "周二" ...
    is_open: bool
    season: str                  # "春季" / "夏季" ...
    template_vars: dict           # 可用于模板替换

# 注入 LLM 的 prompt 片段
"""
当前时间: 2026-04-27 22:47 (Asia/Shanghai)
本地时刻: 晚上10点47分，周一，春季
营业状态: 营业中
"""
```

## Technical Notes

* 类型：fullstack schema + backend logic + frontend UI。
* 允许修改范围：
  - `backend/src/fablemap_api/core/tavern.py`
  - `backend/src/fablemap_api/contracts/taverns.py`
  - `backend/src/fablemap_api/infrastructure/models.py`
  - `backend/src/fablemap_api/core/prompt_builder.py`
  - `frontend/app/routes/tavern.tsx`
  - `frontend/app/components/` (酒馆状态展示)
  - `docs/WORLD_SCHEMA.md`
  - 相关测试
* 不改范围：SillyTavern 导入导出核心逻辑（时区/营业时间字段可选扩展）
* 新增依赖：`timezonefinder`（用于 lat/lon → IANA 时区推断）

## Acceptance Criteria

* [ ] Tavern 可配置时区（手动或从 lat/lon 推断）
* [ ] Tavern 可配置精确到分钟的营业时间（支持跨午夜、星期几启用）
* [ ] 酒馆始终可被搜到，打烊时显示"熄灯"视觉状态
* [ ] LLM prompt 注入正确的时间上下文
* [ ] 打烊时 NPC 以礼貌方式说明不营业，但不驱逐访客
* [ ] 前端正确显示酒馆当地时间与营业状态
* [ ] API 返回 `is_open` 和 `local_time_display`
* [ ] 现有测试通过（`pytest -q`）

## Out of Scope

* NPC 作息偏好（Phase 2）
* 特殊时段活动（Phase 2）
* 时段问候语配置（Phase 2）
* 节假日覆盖（Phase 2）
* 季节主题（Phase 3）
* 访客时差对比（Phase 3）

## Dependencies

* 任务完成后需更新 `docs/WORLD_SCHEMA.md` 添加新字段
* 可选：任务完成后更新 `docs/FABLEMAP_TAVERN_PLATFORM.md` 描述时间系统特性

