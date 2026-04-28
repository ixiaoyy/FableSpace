# Guest Message Board - 访客留言板

## 目的

允许访客在酒馆留下公开留言，酒馆主人可以回复留言，增加访客与主人之间的互动。

## 核心功能

### 1. 访客留言
- 访客可以留下公开留言
- 留言支持简短文本
- 显示留言时间
- 匿名或昵称可选

### 2. 主人回复
- 酒馆主人可以回复留言
- 回复后通知原留言访客
- 主人可以删除不当留言

### 3. 留言展示
- 在酒馆详情页展示最新留言
- 留言列表分页
- 置顶重要留言

## 数据模型

```python
@dataclass
class TavernMessage:
    id: str
    tavern_id: str
    visitor_id: str
    visitor_nickname: str
    content: str
    created_at: datetime
    is_pinned: bool
    parent_id: Optional[str]  # 用于回复
```

## 实现步骤

1. [ ] 创建后端 API：
   - `POST /api/taverns/{id}/messages` - 创建留言
   - `GET /api/taverns/{id}/messages` - 获取留言列表
   - `DELETE /api/taverns/{id}/messages/{mid}` - 删除留言
   - `POST /api/taverns/{id}/messages/{mid}/reply` - 回复留言
2. [ ] 前端留言组件
3. [ ] 留言列表展示
4. [ ] 主人回复功能

## 验收标准

- [ ] 访客可以留公开言
- [ ] 主人可以回复留言
- [ ] 留言列表正确显示
- [ ] 留言有字数限制
