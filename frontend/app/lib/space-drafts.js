function text(value) {
  return String(value || '').trim()
}

function textList(value) {
  return text(value)
    .replaceAll('，', ',')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
}

export function createSpaceDraftRequest({
  lat = 0,
  lon = 0,
  address = '',
  placeType = 'space',
  styleTagsText = '',
  forbiddenText = '',
  tone = '',
} = {}) {
  return {
    lat: Number(lat || 0),
    lon: Number(lon || 0),
    address: text(address),
    place_type: text(placeType) || 'space',
    style_tags: textList(styleTagsText),
    forbidden: textList(forbiddenText),
    tone: text(tone),
  }
}

export function draftResponseToCreateForm(response) {
  const draft = response?.draft
  const character = draft?.character
  if (!draft || !character) {
    throw new Error('AI 空间草稿返回为空')
  }
  return {
    name: text(draft.name),
    description: text(draft.description),
    scene_prompt: text(draft.scene_prompt),
    character_name: text(character.name),
    character_description: text(character.description),
    first_mes: text(character.first_mes),
  }
}
