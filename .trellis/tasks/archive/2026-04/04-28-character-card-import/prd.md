# SillyTavern Character Card Import

## 目的

实现 SillyTavern 角色卡导入功能，支持 JSON 和 PNG 两种格式的导入。

## SillyTavern 角色卡格式

### JSON 格式 (Character Card V2)

```json
{
  "spec": "ch泡r-card-format-v2",
  "data": {
    "name": "Character Name",
    "description": "Character description",
    "personality": "Personality traits",
    "scenario": "Scenario/setting",
    "system_prompt": "System prompt for AI",
    "first_mes": "First message",
    "mes_example": "Example conversation",
    "avatar": "base64 or URL",
    "sprites": {
      "neutral": "url",
      "happy": "url",
      "angry": "url"
    },
    "tags": ["tag1", "tag2"],
    "talkativeness": 0.5
  }
}
```

### PNG 格式 (tEXt chunk)

PNG 文件可以在 tEXt chunk 中嵌入 JSON 数据：
- Chunk key: `ch_card` 或 `sd_characteristics`
- 值: Base64 编码的 JSON

## 实现方案

### 后端解析器

```python
# backend/src/fablemap_api/core/char_card_parser.py
def parse_character_card(content: bytes | str) -> TavernCharacter:
    """Parse character card from JSON or PNG format."""
    if isinstance(content, bytes):
        # Try PNG tEXt chunk first
        char_data = extract_from_png(content)
        if char_data:
            return parse_json_card(char_data)

    # Fallback to JSON parsing
    return parse_json_card(content)

def extract_from_png(png_bytes: bytes) -> dict | None:
    """Extract character data from PNG tEXt chunk."""
    # Use pypng or PIL to read tEXt chunks
    pass
```

### 字段映射

| SillyTavern Field | FableMap Field |
|-------------------|----------------|
| data.name | name |
| data.description | description |
| data.personality | personality |
| data.scenario | scenario |
| data.system_prompt | system_prompt |
| data.first_mes | first_mes |
| data.mes_example | mes_example |
| data.avatar | avatar |
| data.sprites | sprites |
| data.tags | tags |
| data.talkativeness | talkativeness |

### 前端上传 UI

```jsx
// CharacterEditor.jsx
function CharacterImportButton() {
  const handleFileUpload = async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const character = await api.post('/api/import/character-card', formData)
    setCharacter(character)
  }

  return (
    <input
      type="file"
      accept=".json,.png"
      onChange={(e) => handleFileUpload(e.target.files[0])}
    />
  )
}
```

## 实现步骤

1. [ ] 创建 `char_card_parser.py`
2. [ ] 实现 JSON 解析
3. [ ] 实现 PNG tEXt chunk 提取
4. [ ] 实现字段映射
5. [ ] 添加 API 端点 `/api/import/character-card`
6. [ ] 前端上传 UI
7. [ ] 错误处理（格式错误、版本不支持）
8. [ ] 单元测试

## 验收标准

- [ ] JSON 格式正确解析
- [ ] PNG tEXt chunk 正确提取
- [ ] 字段完整映射
- [ ] 错误信息友好
- [ ] 单元测试覆盖
