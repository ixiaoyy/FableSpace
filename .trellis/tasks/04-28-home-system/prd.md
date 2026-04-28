# Home System - 个人主页系统

## 目的

每个用户都可以拥有自己的 Home（个人主页），可以被其他用户拜访，实现"个人主页 + 地点探索"的混合体验。

## 核心概念

- **Home vs Place**：Place 是公开场所，Home 是私人空间
- **Home 主人**：每个用户可以成为 Home 主人
- **Home 成员**：Home 主人可以添加角色/家庭成员
- **Home 拜访**：其他用户可以拜访公开的 Home

## Home 数据模型

```python
@dataclass
class Home:
    id: str
    owner_id: str
    name: str  # Home 名称，如"小明的小窝"
    description: str
    avatar: Optional[str]  # Home 头像
    cover_image: Optional[str]  # 封面图
    theme: str  # 'cozy', 'modern', 'vintage', 'fantasy'

    # 访问设置
    visit_settings: VisitSettings

    # Home 成员
    characters: list[Character]

    # Home 状态
    status: str  # 'open', 'closed', 'hidden'

    created_at: datetime
    updated_at: datetime

@dataclass
class VisitSettings:
    public: bool  # 是否公开
    approval_required: bool  # 是否需要审批
    friends_only: bool  # 仅好友可访
    max_daily_visitors: int  # 每日最大访客数

@dataclass
class HomeVisit:
    id: str
    home_id: str
    visitor_id: str
    visited_at: datetime
    stay_duration: int  # 秒
    left_message: Optional[str]  # 访客留言
```

## Home 成员（非生物处理）

用户特别说明：Home 成员可以是石头、物件等非生物。

```python
@dataclass
class HomeCharacter:
    id: str
    home_id: str
    name: str
    description: str
    avatar: Optional[str]
    is_speaking: bool  # 是否能说话，非生物默认 False
    is_living: bool  # 是否是生物

    # 非生物时
    nonliving_note: Optional[str]  # 备注，如"一块有故事的石头"
```

**非生物交互规则**：
- 非生物默认 `is_speaking = False`
- 访客尝试对话时返回：`...`（沉默反馈）
- 不强制将非生物人格化

## 功能模块

### 1. Home 管理
- 创建/编辑 Home
- 设置访问权限
- 管理 Home 成员

### 2. Home 发现
- 公开 Home 列表
- Home 搜索
- Home 推荐

### 3. Home 拜访
- 拜访流程
- 访客留言
- 拜访记录

## 实现步骤

1. [ ] 定义 Home 数据模型
2. [ ] 创建 Home API 端点
3. [ ] Home 管理页面
4. [ ] Home 发现页面
5. [ ] Home 拜访流程
6. [ ] 访客留言功能

## MVP 范围

- Home 基本 CRUD
- Home 角色列表
- 公开 Home 发现页面
- 拜访流程（进入 → 角色展示 → 对话）
- 访客留言

## 验收标准

- [ ] 用户可以创建自己的 Home
- [ ] 可以添加 Home 成员
- [ ] Home 可以设置为公开/私有
- [ ] 其他用户可以发现公开 Home
- [ ] 可以进入公开 Home 并与成员对话
