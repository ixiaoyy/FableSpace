import { useEffect, useMemo, useState } from 'react'
import CharacterLookSummary from './CharacterLookSummary'
import { GENDER_OPTIONS, genderLabel, normalizeGender } from '../lib/gender.js'
import {
  CHARACTER_LOOK_PRESETS,
  normalizeCharacterAppearance,
  removeCharacterLookFromWardrobe,
  withActiveCharacterLook,
} from './characterLooks'
import {
  NPC_PERSONALITY_TEMPLATE_CATEGORIES,
  applyNpcPersonalityTemplateToDraft,
  filterNpcPersonalityTemplates,
} from './personalityTemplates'
import {
  analyzeCharacterPromptRisk,
  formatPromptRiskBlockMessage,
} from './characterPromptRiskLinter.js'
import {
  DEFAULT_PROMPT_STYLE_DIALS,
  PROMPT_STYLE_DIAL_GROUPS,
  applyPromptStyleDialsToDraft,
  buildPromptLayerPreview,
  compilePromptStyleDialLines,
  normalizePromptStyleDials,
} from './promptStyleDials.js'
import { buildDigitalHumanIdentityPack } from '../lib/digital-human-studio.js'
import {
  CURATED_HOBBIES,
  CURATED_HOBBIES_BY_CATEGORY,
  HOBBY_CATEGORIES,
  getHobbyCategory,
  getHobbyIcon
} from '../lib/character-hobbies.js'


const SPRITE_FIELDS = [
  ['neutral', '中性'],
  ['joy', '喜悦'],
  ['anger', '愤怒'],
  ['annoyance', '烦躁'],
  ['sadness', '悲伤'],
  ['surprise', '惊讶'],
  ['fear', '恐惧'],
  ['disgust', '厌恶'],
  ['confusion', '困惑'],
  ['curiosity', '好奇'],
  ['admiration', '赞赏'],
  ['amusement', '愉快'],
  ['approval', '认可'],
  ['caring', '关心'],
  ['desire', '渴望'],
  ['disappointment', '失望'],
  ['disapproval', '反对'],
  ['embarrassment', '尴尬'],
  ['excitement', '兴奋'],
  ['gratitude', '感谢'],
  ['grief', '悲痛'],
  ['love', '喜爱'],
  ['nervousness', '紧张'],
  ['optimism', '乐观'],
  ['pride', '骄傲'],
  ['realization', '恍然'],
  ['relief', '释然'],
  ['remorse', '懊悔'],
]

function toText(value) {
  return typeof value === 'string' ? value : ''
}

function listToLines(value) {
  return Array.isArray(value) ? value.filter(Boolean).join('\n') : toText(value)
}

function listToTags(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(', ') : toText(value)
}

function cleanSpriteMap(sprites) {
  if (!sprites || typeof sprites !== 'object') return {}
  return Object.fromEntries(
    Object.entries(sprites)
      .map(([key, value]) => [String(key).trim(), String(value || '').trim()])
      .filter(([key, value]) => key && value),
  )
}

function splitLines(value) {
  return toText(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function splitTags(value) {
  return toText(value)
    .split(/[,，\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeTalkativeness(value) {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed)) return 0.5
  return Math.max(0, Math.min(1, parsed))
}

function normalizeCharacterDraft(character = {}) {
  const sprites = cleanSpriteMap(character.sprites)
  return {
    id: character.id || '',
    tavern_id: character.tavern_id || '',
    name: toText(character.name),
    description: toText(character.description),
    personality: toText(character.personality),
    scenario: toText(character.scenario),
    gender: normalizeGender(character.gender),
    system_prompt: toText(character.system_prompt),
    first_mes: toText(character.first_mes),
    mes_example: toText(character.mes_example),
    alternate_greetings_text: listToLines(character.alternate_greetings),
    tags_text: listToTags(character.tags),
    avatar: toText(character.avatar),
    appearance: normalizeCharacterAppearance(character),
    talkativeness: normalizeTalkativeness(character.talkativeness),
    hobbies: Array.isArray(character.hobbies) ? character.hobbies : [],
    current_tavern_id: character.current_tavern_id || character.tavern_id || '',
    home_tavern_id: character.home_tavern_id || character.tavern_id || '',
    traits: Array.isArray(character.traits) ? character.traits : [],
    simulation_state: {
      energy: 100,
      hunger: 100,
      thirst: 100,
      social: 100,
      entertainment: 100,
      ...(character.simulation_state || {})
    },
    sprites,
  }
}

export function createEmptyCharacterDraft() {
  return normalizeCharacterDraft({
    name: '',
    description: '',
    personality: '',
    scenario: '',
    gender: 'unspecified',
    system_prompt: '',
    first_mes: '',
    mes_example: '',
    alternate_greetings: [],
    tags: [],
    avatar: '',
    sprites: {},
  })
}

export function normalizeCharacterPayload(draft) {
  const payload = {
    name: draft.name.trim(),
    description: draft.description.trim(),
    personality: draft.personality.trim(),
    scenario: draft.scenario.trim(),
    gender: normalizeGender(draft.gender),
    system_prompt: draft.system_prompt.trim(),
    first_mes: draft.first_mes.trim(),
    mes_example: draft.mes_example.trim(),
    alternate_greetings: splitLines(draft.alternate_greetings_text),
    tags: splitTags(draft.tags_text),
    avatar: draft.avatar.trim(),
    appearance: normalizeCharacterAppearance(draft),
    talkativeness: normalizeTalkativeness(draft.talkativeness),
    hobbies: Array.isArray(draft.hobbies) ? draft.hobbies : [],
    current_tavern_id: draft.current_tavern_id,
    home_tavern_id: draft.home_tavern_id,
    traits: Array.isArray(draft.traits) ? draft.traits : [],
    simulation_state: draft.simulation_state,
    sprites: cleanSpriteMap(draft.sprites),
  }

  if (draft.id) payload.id = draft.id
  if (draft.tavern_id) payload.tavern_id = draft.tavern_id
  return payload
}

export default function CharacterEditor({
  value,
  onSave,
  onCancel,
  title = '角色卡编辑',
  submitLabel = '保存角色',
  cancelLabel = '取消',
  disabled = false,
}) {
  const [draft, setDraft] = useState(() => normalizeCharacterDraft(value))
  const [error, setError] = useState('')
  const [activeTemplateCategory, setActiveTemplateCategory] = useState('推荐')
  const [templateQuery, setTemplateQuery] = useState('')
  const [styleDials, setStyleDials] = useState(() => normalizePromptStyleDials(DEFAULT_PROMPT_STYLE_DIALS))
  const [digitalHumanCopyStatus, setDigitalHumanCopyStatus] = useState('')

  useEffect(() => {
    setDraft(normalizeCharacterDraft(value))
    setError('')
    setStyleDials(normalizePromptStyleDials(DEFAULT_PROMPT_STYLE_DIALS))
    setDigitalHumanCopyStatus('')
  }, [value])

  const configuredSpriteCount = useMemo(() => Object.keys(cleanSpriteMap(draft.sprites)).length, [draft.sprites])
  const templateCategories = useMemo(
    () => ['推荐', '全部', ...NPC_PERSONALITY_TEMPLATE_CATEGORIES],
    [],
  )
  const filteredPersonalityTemplates = useMemo(() => filterNpcPersonalityTemplates({
    category: activeTemplateCategory,
    query: templateQuery,
    draft,
    limit: 4,
  }), [activeTemplateCategory, draft, templateQuery])
  const promptRiskReport = useMemo(() => analyzeCharacterPromptRisk(draft), [draft])
  const styleDialLines = useMemo(() => compilePromptStyleDialLines(styleDials), [styleDials])
  const promptLayerPreview = useMemo(() => buildPromptLayerPreview(draft, styleDials), [draft, styleDials])
  const digitalHumanPack = useMemo(() => buildDigitalHumanIdentityPack(draft), [draft])
  const completion = useMemo(() => {
    const checks = [
      { label: '名称', done: Boolean(draft.name.trim()) },
      { label: '描述', done: Boolean(draft.description.trim()) },
      { label: '性格', done: Boolean(draft.personality.trim()) },
      { label: '场景', done: Boolean(draft.scenario.trim()) },
      { label: '开场白', done: Boolean(draft.first_mes.trim()) },
      { label: '边界指令', done: Boolean(draft.system_prompt.trim()) },
    ]
    const done = checks.filter((item) => item.done).length
    return {
      done,
      total: checks.length,
      missing: checks.filter((item) => !item.done).map((item) => item.label),
    }
  }, [draft])
  const preview = useMemo(() => {
    const tags = splitTags(draft.tags_text).slice(0, 5)
    const tone = draft.personality.trim().split(/[。；;\n]/).find(Boolean) || '还没有性格设定，建议先套用一个 NPC 性格模版。'
    const boundary = draft.system_prompt.trim().split(/[。；;\n]/).find(Boolean) || '还没有边界指令，角色可能更容易跑题。'
    return {
      name: draft.name.trim() || '未命名 NPC',
      firstMes: draft.first_mes.trim() || '（保存前建议补一句角色第一次见到访客时会说的话。）',
      tone,
      boundary,
      tags,
      hobbies: draft.hobbies || [],
      gender: normalizeGender(draft.gender),
      talkativenessPercent: Math.round(normalizeTalkativeness(draft.talkativeness) * 100),
    }
  }, [draft])

  function updateField(key, nextValue) {
    setDraft((prev) => ({ ...prev, [key]: nextValue }))
  }

  function updateSprite(expression, nextValue) {
    setDraft((prev) => ({
      ...prev,
      sprites: {
        ...prev.sprites,
        [expression]: nextValue,
      },
    }))
  }

  function updateAppearance(nextAppearance) {
    setDraft((prev) => ({
      ...prev,
      appearance: normalizeCharacterAppearance(nextAppearance),
    }))
  }

  function updateActiveLook(presetId) {
    setDraft((prev) => {
      const appearance = normalizeCharacterAppearance(prev)
      if (!presetId) {
        return {
          ...prev,
          appearance: {
            active_preset_id: '',
            wardrobe_ids: [],
            note: appearance.note,
          },
        }
      }
      return {
        ...prev,
        appearance: withActiveCharacterLook(prev, presetId),
      }
    })
  }

  function toggleWardrobeLook(presetId) {
    setDraft((prev) => {
      const appearance = normalizeCharacterAppearance(prev)
      const hasPreset = appearance.wardrobe_ids.includes(presetId)
      if (hasPreset) {
        return {
          ...prev,
          appearance: removeCharacterLookFromWardrobe(prev, presetId),
        }
      }
      const wardrobeIds = [...appearance.wardrobe_ids, presetId].slice(0, 6)
      const activePresetId = appearance.active_preset_id || presetId
      return {
        ...prev,
        appearance: normalizeCharacterAppearance({
          ...appearance,
          active_preset_id: activePresetId,
          wardrobe_ids: wardrobeIds,
        }),
      }
    })
  }

  function updateAppearanceNote(note) {
    const appearance = normalizeCharacterAppearance(draft)
    updateAppearance({ ...appearance, note })
  }

  function applyPersonalityTemplate(template, mode = 'fill') {
    setDraft((prev) => applyNpcPersonalityTemplateToDraft(prev, template, { mode }))
    setError('')
  }

  function updateStyleDial(groupId, optionId) {
    setStyleDials((prev) => normalizePromptStyleDials({ ...prev, [groupId]: optionId }))
  }

  function handleApplyStyleDials() {
    setDraft((prev) => applyPromptStyleDialsToDraft(prev, styleDials))
    setError('')
  }

  async function handleCopyDigitalHumanPrompt() {
    setDigitalHumanCopyStatus('')
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        setDigitalHumanCopyStatus('当前浏览器不支持自动复制，请手动选中文本复制。')
        return
      }
      await navigator.clipboard.writeText(digitalHumanPack.videoPrompt)
      setDigitalHumanCopyStatus('已复制视频 / 短剧出镜 prompt。')
    } catch {
      setDigitalHumanCopyStatus('复制失败，请手动选中文本复制。')
    }
  }

  function handleSave() {
    const payload = normalizeCharacterPayload(draft)
    if (!payload.name) {
      setError('请填写角色名称')
      return
    }
    const saveRiskReport = analyzeCharacterPromptRisk(payload)
    if (!saveRiskReport.canSave) {
      setError(formatPromptRiskBlockMessage(saveRiskReport))
      return
    }
    setError('')
    onSave(payload)
  }

  const appearance = normalizeCharacterAppearance(draft)

  return (
    <div className="character-editor">
      {title ? <h4>{title}</h4> : null}

      <div className="character-editor-guidance">
        <div>
          <span className="mini-label">角色完成度</span>
          <strong>{completion.done}/{completion.total}</strong>
          <p>
            {completion.missing.length
              ? `建议补齐：${completion.missing.slice(0, 3).join('、')}${completion.missing.length > 3 ? '…' : ''}`
              : '关键字段已齐，可以直接保存或继续精修外观。'}
          </p>
        </div>
        <div className="character-editor-guidance__chips" aria-label="角色关键字段状态">
          {['性格', '场景', '开场白', '边界指令'].map((label) => {
            const fieldMap = {
              性格: draft.personality,
              场景: draft.scenario,
              开场白: draft.first_mes,
              边界指令: draft.system_prompt,
            }
            return (
              <span key={label} className={fieldMap[label]?.trim() ? 'is-done' : ''}>
                {fieldMap[label]?.trim() ? '✓' : '·'} {label}
              </span>
            )
          })}
          <span className={promptRiskReport.canSave ? 'is-done' : 'is-blocked'}>
            {promptRiskReport.canSave ? '✓' : '!'} Prompt 风险
          </span>
        </div>
      </div>

      <details
        className="character-personality-templates"
        open={!draft.personality.trim() && !draft.system_prompt.trim()}
      >
        <summary>
          <span>NPC 性格模版</span>
          <small>
            {activeTemplateCategory === '推荐'
              ? '已根据角色名称、标签、描述和场景推荐；也可搜索或切换分类。'
              : '先选口吻、边界和开场，再按你的空间继续改。'}
          </small>
        </summary>

        <label className="character-personality-template-search">
          <span>搜索模版</span>
          <input
            type="search"
            value={templateQuery}
            onChange={(event) => setTemplateQuery(event.target.value)}
            disabled={disabled}
            placeholder="搜树洞、档案、社区、、线索..."
          />
        </label>

        <div className="character-personality-template-filters" aria-label="NPC 性格模版分类">
          {templateCategories.map((category) => (
            <button
              key={category}
              type="button"
              className={activeTemplateCategory === category ? 'is-active' : ''}
              onClick={() => setActiveTemplateCategory(category)}
              disabled={disabled}
            >
              {category}
            </button>
          ))}
        </div>

        {filteredPersonalityTemplates.length > 0 ? (
          <div className="character-personality-template-grid">
            {filteredPersonalityTemplates.map((template) => (
              <article key={template.id} className="character-personality-template-card">
                <header>
                  <span className="character-personality-template-card__badge">{template.badge}</span>
                  <div>
                    <strong>{template.name}</strong>
                    <small>{template.category}</small>
                  </div>
                </header>
                <p>{template.summary}</p>
                <em>适合：{template.bestFor}</em>
                <footer>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => applyPersonalityTemplate(template, 'fill')}
                    disabled={disabled}
                    title="只填当前为空的字段，并合并标签与备用开场白"
                  >
                    补空字段
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => applyPersonalityTemplate(template, 'overwrite')}
                    disabled={disabled}
                    title="用此模版覆盖性格、场景、指令、开场白和示例对话"
                  >
                    覆盖应用
                  </button>
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="character-personality-template-empty">
            没有匹配的模版。换个关键词，或切回“推荐”。
          </div>
        )}
      </details>

      <details className="character-prompt-composer">
        <summary>
          <span>Prompt Composer / Style Dials</span>
          <small>
            预览角色卡、世界书、访客状态和风格拨盘如何进入 Prompt；应用后只写入当前草稿的角色指令，保存仍需店主确认。
          </small>
        </summary>

        <div className="character-prompt-composer__notice">
          <strong>Owner-only preview</strong>
          <p>
            这里不会调用 AI、不会保存、不会展示 API Key 或其他访客私密记忆。风格拨盘只生成安全提示片段，帮助店主少粘贴社区大段 preset。
          </p>
        </div>

        <div className="character-style-dials" aria-label="角色风格拨盘">
          {PROMPT_STYLE_DIAL_GROUPS.map((group) => (
            <section key={group.id} className="character-style-dial-group">
              <div>
                <strong>{group.label}</strong>
                <small>{group.helper}</small>
              </div>
              <div className="character-style-dial-options">
                {group.options.map((option) => {
                  const active = styleDials[group.id] === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={active ? 'is-active' : ''}
                      aria-pressed={active}
                      onClick={() => updateStyleDial(group.id, option.id)}
                      disabled={disabled}
                    >
                      <span>{option.label}</span>
                      <small>{option.detail}</small>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <section className="character-style-dial-compiled" aria-label="风格拨盘编译结果">
          <div className="character-editor-section-heading">
            <span>将写入角色指令的安全片段</span>
            <small>不会覆盖店主已有指令；再次应用会替换旧的 FableMap 风格拨盘片段。</small>
          </div>
          <ul>
            {styleDialLines.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <button type="button" className="secondary" onClick={handleApplyStyleDials} disabled={disabled}>
            应用到角色指令
          </button>
        </section>

        <section className="character-prompt-layer-preview" aria-label="Prompt Layer Preview">
          <div className="character-editor-section-heading">
            <span>Prompt Layer Preview</span>
            <small>展示层次顺序和来源，不是最终 hidden prompt，也不包含 secret。</small>
          </div>
          <div className="character-prompt-layer-grid">
            {promptLayerPreview.map((layer, index) => (
              <article key={layer.id} className="character-prompt-layer-card">
                <div>
                  <b>{index + 1}</b>
                  <span>{layer.label}</span>
                </div>
                <small>{layer.helper}</small>
                <pre>{layer.body}</pre>
              </article>
            ))}
          </div>
        </section>
      </details>

      <section className="character-digital-human-pack" aria-label="可迁移数字人档案">
        <div className="character-digital-human-pack__header">
          <div>
            <span className="mini-label">Portable identity package</span>
            <strong>数字人档案 / 视频短剧出镜 Prompt</strong>
            <p>
              这不是保存动作，也不会调用视频或语音工具；它把当前角色草稿编译成可复制到 FableMap、SillyTavern、视频脚本或短剧工具的人设说明。
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={handleCopyDigitalHumanPrompt}
            disabled={disabled}
          >
            复制出镜 Prompt
          </button>
        </div>
        <div className="character-digital-human-pack__grid">
          <article>
            <span>一句话定位</span>
            <p>{digitalHumanPack.oneLine}</p>
          </article>
          <article>
            <span>外观 / 服化道</span>
            <p>{digitalHumanPack.visualStyle}</p>
          </article>
          <article>
            <span>口吻 / 节奏</span>
            <p>{digitalHumanPack.voiceStyle}</p>
          </article>
          <article>
            <span>禁忌与授权</span>
            <p>{digitalHumanPack.boundary}</p>
          </article>
        </div>
        <label className="character-editor-full">
          <span>视频 / 短剧出镜 prompt（可复制到外部工具）</span>
          <textarea
            readOnly
            value={digitalHumanPack.videoPrompt}
            rows={10}
            className="character-digital-human-pack__prompt"
          />
        </label>
        <div className="character-digital-human-pack__adapters">
          <span>FableMap / SillyTavern 适配：使用下方角色卡字段保存</span>
          <span>视频 / 短剧适配：复制出镜 prompt 到外部脚本或生成工具</span>
          <span>安全边界：不直接生成真人影像、语音克隆或未授权肖像</span>
        </div>
        {digitalHumanCopyStatus ? (
          <p className="character-digital-human-pack__status">{digitalHumanCopyStatus}</p>
        ) : null}
      </section>

      <section className="character-preview-card" aria-label="NPC 对话预览">
        <div className="character-preview-card__header">
          <div>
            <span className="mini-label">访客第一印象预览</span>
            <strong>{preview.name}</strong>
          </div>
          <span>{preview.talkativenessPercent}% 发言积极度</span>
        </div>
        <blockquote>{preview.firstMes}</blockquote>
        <div className="character-preview-card__meta">
          <p><b>性别：</b>{genderLabel(preview.gender)}</p>
          <p><b>口吻：</b>{preview.tone}</p>
          <p><b>边界：</b>{preview.boundary}</p>
        </div>
        {preview.tags.length ? (
          <div className="character-preview-card__tags">
            {preview.tags.map((tag) => <small key={tag}>{tag}</small>)}
          </div>
        ) : null}
        {preview.hobbies.length ? (
          <div className="character-preview-card__hobbies" aria-label="兴趣爱好">
            {preview.hobbies.map((hobby) => {
              const category = getHobbyCategory(hobby)
              return (
                <span key={hobby} className={`hobby-tag hobby-tag--${category.id}`}>
                  {getHobbyIcon(hobby)} {hobby}
                </span>
              )
            })}
          </div>
        ) : null}

      </section>

      <section
        className={[
          'character-prompt-risk',
          `character-prompt-risk--${promptRiskReport.highestLevel}`,
          promptRiskReport.canSave ? '' : 'character-prompt-risk--blocked',
        ].filter(Boolean).join(' ')}
        aria-label="角色 Prompt 风险检查"
      >
        <div className="character-prompt-risk__header">
          <div>
            <span className="mini-label">Prompt 风险检查</span>
            <strong>
              {promptRiskReport.summary.blocked
                ? '保存前需要清理阻断项'
                : promptRiskReport.summary.warning
                  ? '发现需店主复核的提示'
                  : '未发现阻断风险'}
            </strong>
          </div>
          <div className="character-prompt-risk__counts" aria-label="风险分级统计">
            <span className={promptRiskReport.summary.blocked ? 'is-blocked' : ''}>
              阻断 {promptRiskReport.summary.blocked}
            </span>
            <span className={promptRiskReport.summary.warning ? 'is-warning' : ''}>
              提醒 {promptRiskReport.summary.warning}
            </span>
            <span>
              信息 {promptRiskReport.summary.info}
            </span>
          </div>
        </div>
        {promptRiskReport.items.length ? (
          <ul className="character-prompt-risk__list">
            {promptRiskReport.items.slice(0, 8).map((item) => (
              <li key={item.id} className={`is-${item.level}`}>
                <b>{item.level === 'blocked' ? '阻断' : item.level === 'warning' ? '提醒' : '信息'}</b>
                <span>{item.field_label} · {item.label}</span>
                <p>{item.message}</p>
                <small>{item.suggestion}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="character-prompt-risk__empty">
            仍需店主自行确认角色设定；本检查只覆盖越权、PII、思维链、访客主权和真人照片化等常见风险。
          </p>
        )}
      </section>

      <div className="character-editor-grid">
        <label>
          <span>角色名称 *</span>
          <input
            value={draft.name}
            onChange={(event) => updateField('name', event.target.value)}
            disabled={disabled}
            placeholder="例如：刘大爷"
          />
        </label>
        <label>
          <span>标签</span>
          <input
            value={draft.tags_text}
            onChange={(event) => updateField('tags_text', event.target.value)}
            disabled={disabled}
            placeholder="守门人, 老友, 神秘"
          />
        </label>
        <div className="character-editor-full character-hobby-editor">
          <div className="character-editor-section-heading">
            <span>兴趣与爱好</span>
            <small>这些标签将注入 AI 系统提示词，影响角色的知识面和比喻风格。</small>
          </div>
          <div className="character-hobby-chips">
            {draft.hobbies.map((hobby) => {
              const category = getHobbyCategory(hobby)
              return (
                <span key={hobby} className={`hobby-chip hobby-chip--${category.id}`}>
                  {getHobbyIcon(hobby)} {hobby}
                  <button
                    type="button"
                    onClick={() => updateField('hobbies', draft.hobbies.filter((h) => h !== hobby))}
                    disabled={disabled}
                    title="移除"
                  >
                    &times;
                  </button>
                </span>
              )
            })}
            <input
              type="text"
              placeholder="输入兴趣并回车..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const val = e.target.value.trim()
                  if (!draft.hobbies.includes(val)) {
                    updateField('hobbies', [...draft.hobbies, val])
                  }
                  e.target.value = ''
                  e.preventDefault()
                }
              }}
              disabled={disabled}
            />
          </div>
          <div className="character-hobby-suggestions">
            {Object.values(HOBBY_CATEGORIES).map((category) => {
              const categoryHobbies = CURATED_HOBBIES_BY_CATEGORY[category.id].filter(
                (h) => !draft.hobbies.includes(h)
              )
              if (categoryHobbies.length === 0) return null
              return (
                <div key={category.id} className="character-hobby-group">
                  <small className="hobby-group-label">
                    {category.icon} {category.label}
                  </small>
                  <div className="hobby-group-items">
                    {categoryHobbies.map((hobby) => (
                      <button
                        key={hobby}
                        type="button"
                        className={`hobby-suggestion hobby-suggestion--${category.id}`}
                        onClick={() => updateField('hobbies', [...draft.hobbies, hobby])}
                        disabled={disabled}
                      >
                        {getHobbyIcon(hobby)} {hobby}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <label>
          <span>性别</span>
          <select
            value={draft.gender}
            onChange={(event) => updateField('gender', normalizeGender(event.target.value))}
            disabled={disabled}
          >
            {GENDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        <span>发言积极度</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={draft.talkativeness}
          onChange={(event) => updateField('talkativeness', normalizeTalkativeness(event.target.value))}
          disabled={disabled}
        />
        <small>{Math.round(normalizeTalkativeness(draft.talkativeness) * 100)}% · 数值越高，群聊里越容易主动接话。</small>
      </label>

      <div className="character-editor-full character-simulation-editor">
        <div className="character-editor-section-heading">
          <span>NPC 仿真引擎设置 (Mirror World)</span>
          <small>控制 NPC 的生理需求初始值与行为动机。</small>
        </div>

        <div className="simulation-traits-editor">
          <span className="mini-label">性格特质 (Traits)</span>
          <div className="trait-chips">
            {[
              { id: 'workaholic', label: '工作狂', hint: '偏好留在原地，能量消耗慢' },
              { id: 'socialite', label: '社交达人', hint: '社交需求快，公共空间回升快' },
              { id: 'glutton', label: '吃货', hint: '饿得快，吃得也快' },
              { id: 'loner', label: '孤僻', hint: '社交需求消耗极慢' },
              { id: 'curious', label: '好奇', hint: '容易被娱乐类空间吸引' },
            ].map((trait) => {
              const active = draft.traits.includes(trait.id)
              return (
                <button
                  key={trait.id}
                  type="button"
                  className={`trait-chip ${active ? 'is-active' : ''}`}
                  onClick={() => {
                    const nextTraits = active 
                      ? draft.traits.filter(t => t !== trait.id)
                      : [...draft.traits, trait.id]
                    updateField('traits', nextTraits)
                  }}
                  title={trait.hint}
                  disabled={disabled}
                >
                  {trait.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="simulation-stats-grid">
          {[
            { id: 'energy', label: '当前能量', icon: '⚡' },
            { id: 'hunger', label: '当前饱腹', icon: '🍔' },
            { id: 'thirst', label: '当前渴觉', icon: '💧' },
            { id: 'social', label: '当前社交', icon: '💬' },
            { id: 'entertainment', label: '当前娱乐', icon: '🎮' },
          ].map((stat) => (
            <label key={stat.id} className="simulation-stat-field">
              <span className="stat-label">{stat.icon} {stat.label}</span>
              <div className="stat-input-group">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draft.simulation_state[stat.id] || 0}
                  onChange={(e) => {
                    const nextState = { ...draft.simulation_state, [stat.id]: Number(e.target.value) }
                    updateField('simulation_state', nextState)
                  }}
                  disabled={disabled}
                />
                <span className="stat-value">{Math.round(draft.simulation_state[stat.id] || 0)}%</span>
              </div>
            </label>
          ))}
        </div>

        <div className="simulation-mobility-fields">
          <label>
            <span>初始出生点 (Home Tavern ID)</span>
            <input
              value={draft.home_tavern_id}
              onChange={(e) => updateField('home_tavern_id', e.target.value)}
              disabled={disabled}
              placeholder="留空则默认为当前空间"
            />
          </label>
          <label>
            <span>当前所在地 (Current Tavern ID)</span>
            <input
              value={draft.current_tavern_id}
              onChange={(e) => updateField('current_tavern_id', e.target.value)}
              disabled={disabled}
              placeholder="跨空间流动中的当前位置"
            />
          </label>
        </div>
      </div>

      <label className="character-editor-full">
        <span>角色描述</span>
        <textarea
          value={draft.description}
          onChange={(event) => updateField('description', event.target.value)}
          disabled={disabled}
          rows={3}
          placeholder="外貌、身份、和访客第一眼会注意到的事"
        />
      </label>

      <div className="character-editor-grid">
        <label>
          <span>性格设定</span>
          <textarea
            value={draft.personality}
            onChange={(event) => updateField('personality', event.target.value)}
            disabled={disabled}
            rows={4}
            placeholder="说话方式、习惯、边界感"
          />
        </label>
        <label>
          <span>角色场景</span>
          <textarea
            value={draft.scenario}
            onChange={(event) => updateField('scenario', event.target.value)}
            disabled={disabled}
            rows={4}
            placeholder="角色所处的位置、当前状态和隐含目标"
          />
        </label>
      </div>

      <label className="character-editor-full">
        <span>角色指令（高级）</span>
        <textarea
          value={draft.system_prompt}
          onChange={(event) => updateField('system_prompt', event.target.value)}
          disabled={disabled}
          rows={3}
          placeholder="约束角色扮演、回复边界和语气；新手可先留空"
        />
      </label>

      <div className="character-editor-grid">
        <label>
          <span>开场白</span>
          <textarea
            value={draft.first_mes}
            onChange={(event) => updateField('first_mes', event.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="角色第一次对访客说的话"
          />
        </label>
        <label>
          <span>示例对话</span>
          <textarea
            value={draft.mes_example}
            onChange={(event) => updateField('mes_example', event.target.value)}
            disabled={disabled}
            rows={3}
            placeholder="<START>\n{{user}}: ...\n{{char}}: ..."
          />
        </label>
      </div>

      <label className="character-editor-full">
        <span>备用开场白</span>
        <textarea
          value={draft.alternate_greetings_text}
          onChange={(event) => updateField('alternate_greetings_text', event.target.value)}
          disabled={disabled}
          rows={3}
          placeholder="每行一条"
        />
      </label>

      <label className="character-editor-full">
        <span>默认头像 URL</span>
        <input
          value={draft.avatar}
          onChange={(event) => updateField('avatar', event.target.value)}
          disabled={disabled}
          placeholder="https://example.com/avatar.png"
        />
      </label>

      <section className="character-editor-appearance">
        <div className="character-editor-section-heading">
          <span>外观预设</span>
          <small>选择角色在聊天头像和列表里的默认形象，可保留最多 6 套衣橱方案。</small>
        </div>

        <div className="character-editor-grid">
          <label>
            <span>当前形象</span>
            <select
              value={appearance.active_preset_id}
              onChange={(event) => updateActiveLook(event.target.value)}
              disabled={disabled}
            >
              <option value="">默认形象</option>
              {CHARACTER_LOOK_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.category} / {preset.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>外观备注</span>
            <input
              value={appearance.note}
              onChange={(event) => updateAppearanceNote(event.target.value)}
              disabled={disabled}
              maxLength={200}
              placeholder="例如：夜班版、校庆版、雨天版"
            />
          </label>
        </div>

        <CharacterLookSummary
          character={{ ...draft, appearance }}
          showDefault
          showSummary
          className="character-editor-look-summary"
        />

        <div className="character-look-options" aria-label="角色衣橱">
          {CHARACTER_LOOK_PRESETS.map((preset) => {
            const selected = appearance.wardrobe_ids.includes(preset.id)
            const active = appearance.active_preset_id === preset.id
            return (
              <button
                key={preset.id}
                type="button"
                className={[
                  'character-look-option',
                  selected ? 'is-selected' : '',
                  active ? 'is-active' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => toggleWardrobeLook(preset.id)}
                disabled={disabled}
                title={preset.summary}
              >
                <span className="character-look-option__badge">{preset.badge || preset.name[0]}</span>
                <span>
                  <strong>{preset.name}</strong>
                  <small>{preset.category}</small>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <details className="character-editor-sprites">
        <summary>表情立绘 ({configuredSpriteCount} 已配置)</summary>
        <div className="character-sprite-grid">
          {SPRITE_FIELDS.map(([expression, label]) => (
            <label key={expression}>
              <span>{label}</span>
              <input
                value={draft.sprites?.[expression] || ''}
                onChange={(event) => updateSprite(expression, event.target.value)}
                disabled={disabled}
                placeholder={`${expression}.png`}
              />
            </label>
          ))}
        </div>
      </details>

      {error ? <div className="character-editor-error">{error}</div> : null}

      <div className="character-editor-actions">
        {onCancel ? (
          <button type="button" className="secondary" onClick={onCancel} disabled={disabled}>
            {cancelLabel}
          </button>
        ) : null}
        <button type="button" className="primary" onClick={handleSave} disabled={disabled}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
