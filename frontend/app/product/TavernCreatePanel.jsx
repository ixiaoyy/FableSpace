import { useMemo, useState } from 'react'
import { parseCharacterCard, extractCharacterCardFromPng, getTavernAccessLabel, getTavernAccessIcon } from './services/tavernService'
import { addCharacter, createTavern, testLlmConfig } from '../lib/taverns'
import LLMConfigForm, { DEFAULT_MODELS, DEFAULT_BASE_URLS, LLM_BACKENDS } from './LLMConfigForm'
import CharacterEditor, { createEmptyCharacterDraft } from './CharacterEditor'
import CharacterAvatar from './CharacterAvatar'
import CharacterLookSummary from './CharacterLookSummary'
import SystemCharacterPresetPicker from './SystemCharacterPresetPicker'
import { createCharacterPayloadFromPreset } from './systemCharacterPresets'
import { TAVERN_TEMPLATES } from './tavernTemplates'
import { getWizardReadiness } from './tavernCreateReadiness'

const CREATE_STEPS = [
  { id: 1, title: '地点', hint: '把空间钉在真实地图上', icon: '📍' },
  { id: 2, title: '空间', hint: '名称、氛围与入口规则', icon: '🏮' },
  { id: 3, title: '角色', hint: '导入或创建第一个 NPC', icon: '🎭' },
  { id: 4, title: 'AI', hint: '选择模型配方，可稍后再配', icon: '🤖' },
  { id: 5, title: '开门', hint: '检查摘要并创建', icon: '🚪' },
]

const TOTAL_STEPS = CREATE_STEPS.length
const LOCAL_NO_KEY_BACKENDS = ['ollama', 'local', 'localai']

function hasUsableLlmConfig(config = {}) {
  return Boolean(
    config.api_key
    || (LOCAL_NO_KEY_BACKENDS.includes(config.backend) && config.base_url)
  )
}

function getBackendLabel(backend) {
  return LLM_BACKENDS.find((item) => item.id === backend)?.label || backend || '未选择'
}

function formatCoordinate(value) {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed.toFixed(6) : '未填写'
}

function cloneTemplateCharacters(template) {
  const characters = template?.package?.characters
  if (!Array.isArray(characters)) return []
  return characters.map((character) => JSON.parse(JSON.stringify(character)))
}

/**
 * TavernCreatePanel — 3 分钟创建空间向导
 *
 * 用户可以在一个轻量流程内完成：
 * 1. 选择地图锚点
 * 2. 填写空间门牌与入口规则
 * 3. 导入 / 手动创建角色
 * 4. 选择 AI 配方并测试连接（可跳过）
 * 5. 检查摘要并开门营业
 *
 * @param {string} ownerId - 当前店主/访客身份 ID，用于后端 owner 权限校验
 */
export default function TavernCreatePanel({
  initialLat = 0,
  initialLon = 0,
  ownerId = '',
  onCreated,
  onCancel,
}) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    lat: initialLat,
    lon: initialLon,
    access: 'public',
    password: '',
    characters: [],
    scene_prompt: '',
    special_type: '',
  })
  const [llmFormData, setLlmFormData] = useState({
    backend: 'openai',
    model: DEFAULT_MODELS.openai,
    api_key: '',
    base_url: DEFAULT_BASE_URLS.openai || '',
    temperature: 0.8,
    max_tokens: 4096,
    top_p: 0.95,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [editingCharacterIndex, setEditingCharacterIndex] = useState(null)

  const currentStep = CREATE_STEPS.find((item) => item.id === step) || CREATE_STEPS[0]
  const hasLlmConfig = hasUsableLlmConfig(llmFormData)
  const readiness = useMemo(
    () => getWizardReadiness(form, hasLlmConfig),
    [form, hasLlmConfig],
  )

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function validateStep(stepToValidate) {
    setError('')

    if (stepToValidate === 1) {
      const lat = Number.parseFloat(form.lat)
      const lon = Number.parseFloat(form.lon)
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        setError('请填写有效的地图坐标')
        return false
      }
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        setError('坐标范围不正确：纬度应在 -90 到 90，经度应在 -180 到 180')
        return false
      }
    }

    if (stepToValidate === 2) {
      if (!form.name.trim()) {
        setError('请填写空间名称')
        return false
      }
      if (form.access === 'password' && !form.password.trim()) {
        setError('请设置访问密码，或改为公开 / 私人空间')
        return false
      }
    }

    return true
  }

  function goToStep(targetStep) {
    if (targetStep === step) return
    if (targetStep < step) {
      setError('')
      setStep(targetStep)
      return
    }
    for (let next = step; next < targetStep; next += 1) {
      if (!validateStep(next)) return
    }
    setError('')
    setStep(targetStep)
  }

  function goNext() {
    if (!validateStep(step)) return
    setError('')
    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1))
  }

  function goPrevious() {
    setError('')
    setStep((prev) => Math.max(1, prev - 1))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateStep(1)) {
      setStep(1)
      return
    }
    if (!validateStep(2)) {
      setStep(2)
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        lat: Number.parseFloat(form.lat),
        lon: Number.parseFloat(form.lon),
        access: form.access,
        password: form.access === 'password' ? form.password.trim() : '',
        scene_prompt: form.scene_prompt,
        special_type: form.special_type,
        owner_id: ownerId || undefined,
      }

      // 添加 AI 配置（远端通常需要 API Key；Ollama/本地兼容后端可只填 API 地址）
      // 如果没有可用 LLM 配置，使用 public_welfare 标记；系统/公益空间可由后端版本化 OpenCode 配置补齐
      if (hasLlmConfig) {
        payload.llm_config = {
          backend: llmFormData.backend,
          model: llmFormData.model,
          api_key: llmFormData.api_key,
          base_url: llmFormData.base_url,
          temperature: Number.parseFloat(llmFormData.temperature),
          max_tokens: Number.parseInt(llmFormData.max_tokens, 10),
          top_p: Number.parseFloat(llmFormData.top_p),
        }
      } else {
        // 兜底：没有配置 LLM 时使用 public_welfare，普通用户仍走后端规则降级，不继承系统密钥
        payload.llm_config = { backend: 'public_welfare', model: 'deepseek-v4-flash-free' }
      }

      const tavern = await createTavern(payload, ownerId)

      const addedCharacters = []
      for (const char of form.characters) {
        const addedCharacter = await addCharacter(tavern.id, char, ownerId)
        addedCharacters.push(addedCharacter)
      }

      if (onCreated) {
        onCreated({ ...tavern, characters: addedCharacters })
      }
    } catch (err) {
      setError(`创建失败：${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleImportCard(e) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      let charData
      if (file.name.endsWith('.json')) {
        const text = await file.text()
        const cardData = JSON.parse(text)
        charData = parseCharacterCard(cardData)
      } else {
        charData = await extractCharacterCardFromPng(file)
      }

      setForm((prev) => ({
        ...prev,
        characters: [...prev.characters, charData],
      }))
      setError('')
    } catch (err) {
      setError(`导入角色卡失败：${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  function removeCharacter(index) {
    setForm((prev) => ({
      ...prev,
      characters: prev.characters.filter((_, i) => i !== index),
    }))
    setEditingCharacterIndex((current) => {
      if (current === index) return null
      if (current > index) return current - 1
      return current
    })
  }

  function updateCharacter(index, characterData) {
    setForm((prev) => ({
      ...prev,
      characters: prev.characters.map((character, currentIndex) => (
        currentIndex === index ? { ...character, ...characterData } : character
      )),
    }))
    setEditingCharacterIndex(null)
  }

  function addPresetCharacter(preset) {
    setForm((prev) => ({
      ...prev,
      characters: [...prev.characters, createCharacterPayloadFromPreset(preset)],
    }))
    setError('')
  }

  function applyQuickTemplate(template, mode = 'fill') {
    const overwrite = mode === 'overwrite'
    const templateTavern = template?.package?.tavern || {}
    const templateCharacters = cloneTemplateCharacters(template)
    setForm((prev) => ({
      ...prev,
      name: overwrite || !prev.name.trim() ? (templateTavern.name || template.title || prev.name) : prev.name,
      description: overwrite || !prev.description.trim()
        ? (templateTavern.description || template.summary || prev.description)
        : prev.description,
      scene_prompt: overwrite || !prev.scene_prompt.trim()
        ? (templateTavern.scene_prompt || prev.scene_prompt)
        : prev.scene_prompt,
      characters: overwrite || prev.characters.length === 0 ? templateCharacters : prev.characters,
    }))
    setError('')
  }

  async function handleTestDirect(config) {
    return testLlmConfig(config)
  }

  const accessLabel = `${getTavernAccessIcon(form.access)} ${getTavernAccessLabel(form.access)}`
  const aiStatus = hasLlmConfig
    ? `${getBackendLabel(llmFormData.backend)} · ${llmFormData.model || '未填写模型'}`
    : '稍后配置 AI（创建后会显示为未配置 / 歇业）'

  return (
    <div className="tavern-create-panel">
      <div className="tavern-create-header">
        <div>
          <h3>3 分钟开一间空间</h3>
          <p className="tavern-create-intro">
            按顺序完成地点、空间、角色、AI 和开门检查；复杂参数之后还能在店主后台慢慢调。
          </p>
        </div>
        <div className="tavern-create-steps" aria-label="创建空间步骤">
          {CREATE_STEPS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`step-btn ${step === item.id ? 'active' : ''}`}
              onClick={() => goToStep(item.id)}
              aria-current={step === item.id ? 'step' : undefined}
            >
              <span className="step-index">{item.icon} Step {item.id}</span>
              <span className="step-title">{item.title}</span>
              <span className="step-hint">{item.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="tavern-create-step-heading">
          <span>{currentStep.icon}</span>
          <div>
            <h4>{currentStep.title}</h4>
            <p>{currentStep.hint}</p>
          </div>
        </div>

        {/* Step 1: 地点 */}
        {step === 1 && (
          <div className="tavern-create-step">
            <div className="location-anchor-card">
              <strong>真实地点是 FableMap 和普通文游最大的差异。</strong>
              <p>
                空间会挂在这个坐标附近，访客从地图发现它。当前已带入你选中的地图点，
                也可以手动微调。
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>纬度 *</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.lat}
                  onChange={(e) => updateField('lat', e.target.value)}
                  placeholder="例如：31.230416"
                />
              </div>
              <div className="form-group">
                <label>经度 *</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.lon}
                  onChange={(e) => updateField('lon', e.target.value)}
                  placeholder="例如：121.473701"
                />
              </div>
            </div>

            <p className="form-hint">
              小提示：之后可以从地图上重新选择位置；这里先保证空间有一个明确入口。
            </p>
          </div>
        )}

        {/* Step 2: 空间 */}
        {step === 2 && (
          <div className="tavern-create-step">
            <div className="quick-template-strip">
              <div className="quick-template-strip__header">
                <div>
                  <span className="mini-label">体验加速</span>
                  <strong>从一个可聊的空间模版起步</strong>
                  <p>会自动补齐空间氛围，并在角色为空时带入第一个 NPC；之后仍可逐项修改。</p>
                </div>
              </div>
              <div className="quick-template-strip__grid">
                {TAVERN_TEMPLATES.slice(0, 5).map((template) => (
                  <article key={template.id} className="quick-template-card">
                    <strong>{template.title}</strong>
                    <p>{template.summary}</p>
                    <small>{template.tags.slice(0, 3).join(' · ')}</small>
                    <footer>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => applyQuickTemplate(template, 'fill')}
                      >
                        补空字段
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => applyQuickTemplate(template, 'overwrite')}
                      >
                        覆盖套用
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>空间名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="例如：第三中学传达室"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>一句话简介</label>
              <p className="form-hint" data-first-minute-authoring-guide="legacy-create-panel">
                先回答“为什么在这里”：这个坐标、街角或地址给访客什么独有线索，避免变成贴了 GPS 标签的普通聊天室。
              </p>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="让访客在进入前知道这里为什么必须开在这个真实坐标..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="form-group">
              <label>场景氛围</label>
              <textarea
                value={form.scene_prompt}
                onChange={(e) => updateField('scene_prompt', e.target.value)}
                placeholder="给 AI 的场景描述：游客第一分钟看见什么、问什么、被谁接待..."
                rows={3}
              />
              <p className="form-hint">不用写复杂指令，只要描述空间、气味、声音、第一眼能看到的东西，以及推荐访客先问的线索。</p>
            </div>

            <div className="form-group">
              <label>特殊功能 (可选)</label>
              <div className="access-options">
                {[
                  { id: '', label: '无特殊类型', icon: '⚪' },
                  { id: 'cultivation', label: '修行空间', icon: '🧘' },
                  { id: 'divination', label: '占卜空间', icon: '🔮' },
                ].map((st) => (
                  <label key={st.id} className={`access-option ${form.special_type === st.id ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="special_type"
                      value={st.id}
                      checked={form.special_type === st.id}
                      onChange={(e) => updateField('special_type', e.target.value)}
                    />
                    <span>{st.icon} {st.label}</span>
                  </label>
                ))}
              </div>
              <p className="form-hint">占卜或修行空间会启用特定的玩法模块与回访逻辑。</p>
            </div>

            <div className="form-group">
              <label>入口规则</label>
              <div className="access-options">
                {['public', 'password', 'private'].map((acc) => (
                  <label key={acc} className={`access-option ${form.access === acc ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="access"
                      value={acc}
                      checked={form.access === acc}
                      onChange={(e) => updateField('access', e.target.value)}
                    />
                    <span>{getTavernAccessIcon(acc)} {getTavernAccessLabel(acc)}</span>
                  </label>
                ))}
              </div>
            </div>

            {form.access === 'password' && (
              <div className="form-group">
                <label>访问密码 *</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="设置访客进入密码"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 3: 角色 */}
        {step === 3 && (
          <div className="tavern-create-step">
            <div className="form-note">
              <p>角色是空间的“店员”。可以先导入一张 SillyTavern 角色卡，也可以手动创建。</p>
              <p>这一步不强制；没有角色时，空间仍可创建，但对话体验会更像普通旁白。</p>
            </div>

            <div className="form-group">
              <label>导入角色卡</label>
              <p className="form-hint">
                支持 SillyTavern Character Card 格式（JSON 或 PNG）。
              </p>
              <input
                type="file"
                accept=".json,.png"
                onChange={handleImportCard}
              />
            </div>

            <SystemCharacterPresetPicker
              title="也可以直接用系统预设角色"
              description="先把一批常用角色原型放进来：都市夜谈、校园旧事、江湖人情、近未来和温柔治愈都能直接起步。"
              actionLabel="加入角色"
              disabled={editingCharacterIndex != null}
              onPick={addPresetCharacter}
            />

            {form.characters.length > 0 ? (
              <div className="character-list">
                <label>已添加角色 ({form.characters.length})</label>
                {form.characters.map((char, index) => (
                  <div key={index} className="character-item">
                    <CharacterAvatar character={char} size="small" />
                    <div className="character-info">
                      <strong>{char.name || `未命名角色 ${index + 1}`}</strong>
                      <span className="muted">{char.description?.slice(0, 80) || '暂无描述'}</span>
                      <CharacterLookSummary character={char} compact />
                    </div>
                    <div className="character-item-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setEditingCharacterIndex(index)}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        className="btn-remove"
                        onClick={() => removeCharacter(index)}
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="wizard-warning">
                还没有角色。建议至少添加 1 个 NPC，让访客进入后有明确对话对象。
              </div>
            )}

            {editingCharacterIndex != null && form.characters[editingCharacterIndex] ? (
              <div className="character-editor-shell">
                <CharacterEditor
                  value={form.characters[editingCharacterIndex]}
                  title={`编辑角色：${form.characters[editingCharacterIndex].name || '未命名角色'}`}
                  submitLabel="保存到创建表单"
                  onSave={(characterData) => updateCharacter(editingCharacterIndex, characterData)}
                  onCancel={() => setEditingCharacterIndex(null)}
                />
              </div>
            ) : null}

            <details className="manual-add">
              <summary>手动创建一个 NPC</summary>
              <ManualCharacterAdder
                onAdd={(charData) => {
                  setForm((prev) => ({
                    ...prev,
                    characters: [...prev.characters, charData],
                  }))
                }}
              />
            </details>
          </div>
        )}

        {/* Step 4: AI */}
        {step === 4 && (
          <div className="tavern-create-step">
            <div className="form-note">
              <p>选择一张 AI 配方卡，再补 API Key / API 地址即可。密钥只保存在你的服务端，不会展示给访客。</p>
              <p>也可以直接跳过：空间会先创建为未配置状态，之后在“我的空间 / AI”里补上。</p>
            </div>

            <LLMConfigForm
              value={llmFormData}
              onChange={(cfg) => setLlmFormData(cfg)}
              compact={false}
              tavernId={null}
              testDirect={handleTestDirect}
            />
          </div>
        )}

        {/* Step 5: 开门 */}
        {step === 5 && (
          <div className="tavern-create-step">
            <div className={`wizard-readiness-panel ${readiness.percent >= 80 ? 'is-ready' : ''}`}>
              <div className="wizard-readiness-panel__header">
                <div>
                  <span className="mini-label">开门检查</span>
                  <strong>{readiness.percent}% 准备度</strong>
                  <p>
                    {readiness.missingRequired.length
                      ? `还有必填项未完成：${readiness.missingRequired.map((item) => item.label).join('、')}`
                      : readiness.percent >= 80
                        ? '已经适合开门；剩下的高级设置可以创建后继续调。'
                        : '可以开门，但建议先补齐简介、场景或 NPC 开场白来提升第一轮体验。'}
                  </p>
                </div>
                <span>{readiness.doneCount}/{readiness.total}</span>
              </div>
              <div className="wizard-readiness-list">
                {readiness.checks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.done ? 'is-done' : ''}
                    onClick={() => goToStep(item.step)}
                  >
                    <span>{item.done ? '✓' : item.optional ? '○' : '·'}</span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="wizard-summary">
              <div className="wizard-summary-card">
                <span className="summary-kicker">地图锚点</span>
                <strong>{formatCoordinate(form.lat)}, {formatCoordinate(form.lon)}</strong>
                <p>访客会从这个真实坐标附近发现空间。</p>
              </div>
              <div className="wizard-summary-card">
                <span className="summary-kicker">空间门牌</span>
                <strong>{form.name.trim() || '还没有名称'}</strong>
                <p>{form.description.trim() || '暂无简介'} · {accessLabel}</p>
              </div>
              <div className="wizard-summary-card">
                <span className="summary-kicker">角色</span>
                <strong>{form.characters.length} 个 NPC</strong>
                <p>
                  {form.characters.length > 0
                    ? form.characters.map((char) => char.name || '未命名角色').join('、')
                    : '可以先开门，之后再导入角色卡。'}
                </p>
              </div>
              <div className="wizard-summary-card">
                <span className="summary-kicker">AI 状态</span>
                <strong>{hasLlmConfig ? '已准备配置' : '稍后配置'}</strong>
                <p>{aiStatus}</p>
              </div>
            </div>

            {!hasLlmConfig && (
              <div className="wizard-warning">
                你还没有配置 AI。空间会被创建出来，但访客聊天前需要店主补齐 AI 配置。
              </div>
            )}

            <div className="location-anchor-card">
              <strong>准备好了就开门。</strong>
              <p>创建完成后，你可以继续在店主后台补世界书、记忆策略、输出修正和高级角色指令。</p>
            </div>
          </div>
        )}

        {error && <div className="form-error">{error}</div>}

        <div className="tavern-create-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            取消
          </button>
          {step > 1 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={goPrevious}
              disabled={submitting}
            >
              上一步
            </button>
          )}
          {step < TOTAL_STEPS && (
            <button
              type="button"
              className="btn-primary"
              onClick={goNext}
              disabled={submitting}
            >
              下一步
            </button>
          )}
          {step === TOTAL_STEPS && (
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? '创建中...' : '开门营业'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

/**
 * 手动添加角色的简单表单
 */
function ManualCharacterAdder({ onAdd }) {
  const [draftSeed, setDraftSeed] = useState(() => createEmptyCharacterDraft())

  return (
    <div className="manual-char-form">
      <CharacterEditor
        value={draftSeed}
        title="新角色"
        submitLabel="添加角色"
        onSave={(charData) => {
          onAdd(charData)
          setDraftSeed(createEmptyCharacterDraft())
        }}
      />
    </div>
  )
}
