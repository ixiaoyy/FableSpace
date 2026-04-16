import { useState } from 'react'
import { getDefaultTavernService, parseCharacterCard, extractCharacterCardFromPng, getTavernAccessLabel, getTavernAccessIcon } from './services/tavernService'

/**
 * TavernCreatePanel — 创建酒馆的面板
 *
 * 用户可以：
 * 1. 填写酒馆基本信息（名称、描述、位置）
 * 2. 设置访问权限（公开/密码/私人）
 * 3. 配置 LLM（可选，暂时跳过）
 * 4. 导入 SillyTavern 角色卡
 */
export default function TavernCreatePanel({
  initialLat = 0,
  initialLon = 0,
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
    // LLM 配置
    llm_backend: 'openai',
    llm_model: 'gpt-4o-mini',
    llm_api_key: '',
    llm_base_url: '',
    temperature: 0.8,
    // 角色
    characters: [],
    scene_prompt: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1) // 1: 基本信息, 2: LLM配置, 3: 角色导入

  const tavernService = getDefaultTavernService()

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('请填写酒馆名称')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        lat: parseFloat(form.lat),
        lon: parseFloat(form.lon),
        access: form.access,
        password: form.access === 'password' ? form.password : '',
        scene_prompt: form.scene_prompt,
      }

      // 添加 LLM 配置（如果用户填写了）
      if (form.llm_api_key) {
        payload.llm_config = {
          backend: form.llm_backend,
          model: form.llm_model,
          api_key: form.llm_api_key,
          base_url: form.llm_base_url,
          temperature: parseFloat(form.temperature),
        }
      }

      const tavern = await tavernService.createTavern(payload)

      // 添加角色
      for (const char of form.characters) {
        await tavernService.addCharacter(tavern.id, char)
      }

      if (onCreated) {
        onCreated(tavern)
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
      // 尝试解析为 JSON
      if (file.name.endsWith('.json')) {
        const text = await file.text()
        const cardData = JSON.parse(text)
        const charData = parseCharacterCard(cardData)
        setForm((prev) => ({
          ...prev,
          characters: [...prev.characters, charData],
        }))
        return
      }

      // 尝试从 PNG 提取
      const charData = await extractCharacterCardFromPng(file)
      setForm((prev) => ({
        ...prev,
        characters: [...prev.characters, charData],
      }))
    } catch (err) {
      setError(`导入角色卡失败：${err.message}`)
    }

    e.target.value = ''
  }

  function removeCharacter(index) {
    setForm((prev) => ({
      ...prev,
      characters: prev.characters.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="tavern-create-panel">
      <div className="tavern-create-header">
        <h3>创建酒馆</h3>
        <div className="tavern-create-steps">
          <button
            type="button"
            className={`step-btn ${step === 1 ? 'active' : ''}`}
            onClick={() => setStep(1)}
          >
            1. 基本信息
          </button>
          <button
            type="button"
            className={`step-btn ${step === 2 ? 'active' : ''}`}
            onClick={() => setStep(2)}
          >
            2. AI 配置
          </button>
          <button
            type="button"
            className={`step-btn ${step === 3 ? 'active' : ''}`}
            onClick={() => setStep(3)}
          >
            3. 角色
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Step 1: 基本信息 */}
        {step === 1 && (
          <div className="tavern-create-step">
            <div className="form-group">
              <label>酒馆名称 *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="例如：第三中学传达室"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>场景描述</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="描述这个酒馆的氛围和故事..."
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="form-group">
              <label>场景氛围提示词</label>
              <textarea
                value={form.scene_prompt}
                onChange={(e) => updateField('scene_prompt', e.target.value)}
                placeholder="给 AI 的场景描述，例如：这是一个古朴的传达室，老式电话、搪瓷茶缸、堆积的报纸..."
                rows={2}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>纬度</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.lat}
                  onChange={(e) => updateField('lat', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>经度</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.lon}
                  onChange={(e) => updateField('lon', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>访问权限</label>
              <div className="access-options">
                {['public', 'password', 'private'].map((acc) => (
                  <label key={acc} className="access-option">
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
                <label>密码</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="设置访问密码"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 2: LLM 配置 */}
        {step === 2 && (
          <div className="tavern-create-step">
            <div className="form-note">
              <p>配置 AI 后端，让你的酒馆 NPC 可以和访客聊天。</p>
              <p>可以跳过此步骤，之后在编辑页面配置。</p>
            </div>

            <div className="form-group">
              <label>AI 后端</label>
              <select
                value={form.llm_backend}
                onChange={(e) => updateField('llm_backend', e.target.value)}
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Claude (Anthropic)</option>
                <option value="ollama">Ollama (本地)</option>
                <option value="openrouter">OpenRouter</option>
              </select>
            </div>

            <div className="form-group">
              <label>模型</label>
              <input
                type="text"
                value={form.llm_model}
                onChange={(e) => updateField('llm_model', e.target.value)}
                placeholder={
                  form.llm_backend === 'openai' ? 'gpt-4o-mini' :
                  form.llm_backend === 'anthropic' ? 'claude-3-haiku-20240307' :
                  form.llm_backend === 'ollama' ? 'llama3' :
                  'google/gemini-pro'
                }
              />
            </div>

            <div className="form-group">
              <label>API Key</label>
              <input
                type="password"
                value={form.llm_api_key}
                onChange={(e) => updateField('llm_api_key', e.target.value)}
                placeholder="sk-..."
              />
            </div>

            <div className="form-group">
              <label>自定义 API 地址（可选）</label>
              <input
                type="text"
                value={form.llm_base_url}
                onChange={(e) => updateField('llm_base_url', e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <div className="form-group">
              <label>温度参数: {form.temperature}</label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                value={form.temperature}
                onChange={(e) => updateField('temperature', e.target.value)}
              />
              <span className="range-label">
                {form.temperature < 0.5 ? '精确' : form.temperature < 1.0 ? '平衡' : '创意'}
              </span>
            </div>
          </div>
        )}

        {/* Step 3: 角色导入 */}
        {step === 3 && (
          <div className="tavern-create-step">
            <div className="form-group">
              <label>导入角色</label>
              <p className="form-hint">
                支持 SillyTavern Character Card 格式（JSON 或 PNG）
              </p>
              <input
                type="file"
                accept=".json,.png"
                onChange={handleImportCard}
              />
            </div>

            {form.characters.length > 0 && (
              <div className="character-list">
                <label>已添加角色 ({form.characters.length})</label>
                {form.characters.map((char, index) => (
                  <div key={index} className="character-item">
                    <div className="character-info">
                      <strong>{char.name}</strong>
                      <span className="muted">{char.description?.slice(0, 50)}...</span>
                    </div>
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeCharacter(index)}
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 手动添加角色 */}
            <details className="manual-add">
              <summary>手动添加角色</summary>
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

        {error && <div className="form-error">{error}</div>}

        <div className="tavern-create-actions">
          {step > 1 && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setStep(step - 1)}
            >
              上一步
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => setStep(step + 1)}
            >
              下一步
            </button>
          )}
          {step === 3 && (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={onCancel}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={submitting}
              >
                {submitting ? '创建中...' : '创建酒馆'}
              </button>
            </>
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
  const [form, setForm] = useState({
    name: '',
    description: '',
    personality: '',
    scenario: '',
    system_prompt: '',
    first_mes: '',
  })

  function handleAdd() {
    if (!form.name.trim()) return
    onAdd({ ...form, tags: [] })
    setForm({ name: '', description: '', personality: '', scenario: '', system_prompt: '', first_mes: '' })
  }

  return (
    <div className="manual-char-form">
      <div className="form-group">
        <label>角色名称</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="例如：刘大爷"
        />
      </div>
      <div className="form-group">
        <label>角色描述</label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="角色的外观和身份"
        />
      </div>
      <div className="form-group">
        <label>性格设定</label>
        <input
          type="text"
          value={form.personality}
          onChange={(e) => setForm((f) => ({ ...f, personality: e.target.value }))}
          placeholder="例如：热情、健谈、有些唠叨"
        />
      </div>
      <div className="form-group">
        <label>开场白</label>
        <input
          type="text"
          value={form.first_mes}
          onChange={(e) => setForm((f) => ({ ...f, first_mes: e.target.value }))}
          placeholder="角色说的第一句话"
        />
      </div>
      <button type="button" className="btn-small" onClick={handleAdd}>
        添加角色
      </button>
    </div>
  )
}
