import { useEffect, useMemo, useState } from 'react'
import { getDefaultTavernService } from './services/tavernService'

function makeRuleId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `or_${crypto.randomUUID()}`
  }
  return `or_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeFlags(value = {}) {
  return {
    ignore_case: Boolean(value.ignore_case),
    multiline: Boolean(value.multiline),
    dotall: Boolean(value.dotall),
  }
}

function normalizeRule(rule = {}) {
  const id = String(rule.id || makeRuleId()).trim() || makeRuleId()
  const kind = ['regex', 'literal'].includes(rule.kind) ? rule.kind : 'regex'
  return {
    id,
    name: String(rule.name || id || '未命名规则').trim() || '未命名规则',
    description: String(rule.description || '').trim(),
    enabled: rule.enabled ?? true,
    kind,
    pattern: String(rule.pattern || ''),
    replacement: String(rule.replacement || ''),
    flags: normalizeFlags(rule.flags || {}),
    built_in: Boolean(rule.built_in),
  }
}

function normalizeRules(value) {
  return Array.isArray(value) ? value.map(normalizeRule) : []
}

function getRulePreview(rule) {
  const pattern = String(rule?.pattern || '').trim()
  if (!pattern) return '还没有填写匹配内容'
  return pattern.length > 76 ? `${pattern.slice(0, 76)}...` : pattern
}

function getRuleStatusLabel(rule) {
  if (!rule?.enabled) return '已暂停'
  return rule.kind === 'literal' ? '文本替换' : '正则'
}

export default function OutputRulesEditor({ tavern, ownerId, onClose, onRulesChanged }) {
  const tavernService = getDefaultTavernService()
  const fallbackRules = useMemo(() => normalizeRules(tavern?.output_rules || []), [tavern?.id])

  const [rules, setRules] = useState(fallbackRules)
  const [defaultRules, setDefaultRules] = useState([])
  const [selectedId, setSelectedId] = useState(fallbackRules[0]?.id || '')
  const [draft, setDraft] = useState(fallbackRules[0] || null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [testText, setTestText] = useState('作为AI语言模型，（OOC：说明）剧情总结：我不能替你决定，但柜台后的灯亮了。\n\n\n雨还在下。')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    let alive = true
    async function loadRules() {
      if (!tavern?.id) return
      setLoading(true)
      setError('')
      setStatus('')
      try {
        const payload = await tavernService.getOutputRules(tavern.id, ownerId)
        if (!alive) return
        const nextRules = normalizeRules(payload.rules || [])
        const nextDefaults = normalizeRules(payload.default_rules || [])
        setRules(nextRules)
        setDefaultRules(nextDefaults)
        setSelectedId(nextRules[0]?.id || '')
        setDraft(nextRules[0] || null)
        setDirty(false)
        setTestResult(null)
      } catch (err) {
        if (!alive) return
        const nextRules = normalizeRules(tavern?.output_rules || [])
        setRules(nextRules)
        setSelectedId(nextRules[0]?.id || '')
        setDraft(nextRules[0] || null)
        setError(`加载输出护栏失败：${err.message}`)
      } finally {
        if (alive) setLoading(false)
      }
    }
    loadRules()
    return () => { alive = false }
  }, [tavern?.id, ownerId])

  const enabledCount = rules.filter((rule) => rule.enabled).length
  const builtInCount = rules.filter((rule) => rule.built_in).length
  const customCount = Math.max(0, rules.length - builtInCount)

  function applyDraftToRules(options = {}) {
    if (!draft) return rules
    const normalizedDraft = normalizeRule(draft)
    const nextRules = rules.some((rule) => rule.id === normalizedDraft.id)
      ? rules.map((rule) => (rule.id === normalizedDraft.id ? normalizedDraft : rule))
      : [normalizedDraft, ...rules]
    setRules(nextRules)
    setDraft(normalizedDraft)
    setSelectedId(normalizedDraft.id)
    setDirty(true)
    if (!options.silent) setStatus('规则已暂存，记得保存输出护栏。')
    return nextRules
  }

  function handleSelectRule(rule) {
    setSelectedId(rule.id)
    setDraft(normalizeRule(rule))
    setStatus('')
    setError('')
  }

  function handleUpdateDraft(patch) {
    setDraft((prev) => normalizeRule({ ...(prev || {}), ...patch }))
    setStatus('')
  }

  function handleAddRule() {
    const nextRule = normalizeRule({
      id: makeRuleId(),
      name: '自定义输出规则',
      description: '用正则或文本替换修正模型输出。',
      enabled: true,
      kind: 'regex',
      pattern: '',
      replacement: '',
      flags: { ignore_case: false, multiline: true, dotall: false },
      built_in: false,
    })
    setRules((prev) => [nextRule, ...prev])
    setSelectedId(nextRule.id)
    setDraft(nextRule)
    setDirty(true)
    setStatus('已新增规则，填写匹配内容后保存。')
  }

  function handleDuplicateRule() {
    if (!draft) return
    const nextRule = normalizeRule({
      ...draft,
      id: makeRuleId(),
      name: `${draft.name || '规则'} 副本`,
      built_in: false,
    })
    setRules((prev) => [nextRule, ...prev])
    setSelectedId(nextRule.id)
    setDraft(nextRule)
    setDirty(true)
    setStatus('已复制规则。')
  }

  function handleDeleteRule(ruleId) {
    const target = rules.find((rule) => rule.id === ruleId)
    if (target?.built_in) {
      setError('内置规则不能删除，可以关闭或改写。')
      return
    }
    const nextRules = rules.filter((rule) => rule.id !== ruleId)
    setRules(nextRules)
    const nextSelected = nextRules[0] || null
    setSelectedId(nextSelected?.id || '')
    setDraft(nextSelected || null)
    setDirty(true)
    setStatus('规则已删除，保存后生效。')
  }

  function handleResetDefaults() {
    const nextRules = normalizeRules(defaultRules)
    setRules(nextRules)
    setSelectedId(nextRules[0]?.id || '')
    setDraft(nextRules[0] || null)
    setDirty(true)
    setStatus('已恢复内置默认规则，保存后生效。')
  }

  async function handleSave() {
    if (!tavern?.id) return
    const nextRules = applyDraftToRules({ silent: true })
    setSaving(true)
    setError('')
    setStatus('')
    try {
      const payload = await tavernService.saveOutputRules(tavern.id, nextRules.map(normalizeRule), ownerId)
      const savedRules = normalizeRules(payload.rules || payload.tavern?.output_rules || nextRules)
      setRules(savedRules)
      setSelectedId(savedRules[0]?.id || '')
      setDraft(savedRules.find((rule) => rule.id === selectedId) || savedRules[0] || null)
      setDirty(false)
      setStatus('输出护栏已保存，新的 AI 回复会自动套用这些规则。')
      if (payload.tavern && onRulesChanged) onRulesChanged(payload.tavern)
    } catch (err) {
      setError(`保存失败：${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!tavern?.id) return
    const nextRules = applyDraftToRules({ silent: true })
    setTesting(true)
    setError('')
    setTestResult(null)
    try {
      const payload = await tavernService.testOutputRules(tavern.id, { text: testText, rules: nextRules }, ownerId)
      setTestResult(payload)
    } catch (err) {
      setError(`预览失败：${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="modal-overlay output-rules-overlay" onClick={onClose}>
      <div className="modal-content panel output-rules-modal" onClick={(event) => event.stopPropagation()}>
        <header className="modal-header output-rules-header">
          <div>
            <p className="mini-label">输出修正 / 风格护栏</p>
            <h3>{tavern?.name || '酒馆'} 的输出护栏</h3>
            <p className="note muted">在 AI 回复保存前做确定性清理，用来减少出戏前缀、总结腔和格式噪音。</p>
          </div>
          <button className="close-btn" type="button" onClick={onClose}>&times;</button>
        </header>

        <div className="output-rules-summary">
          <span>规则 {rules.length}</span>
          <strong>启用 {enabledCount}</strong>
          <span>内置 {builtInCount}</span>
          <span>自定义 {customCount}</span>
          {dirty && <em>有未保存更改</em>}
        </div>

        <div className="output-rules-body">
          <aside className="output-rules-list">
            <div className="output-rules-list-header">
              <strong>规则列表</strong>
              <button className="secondary" type="button" onClick={handleAddRule}>+ 新建</button>
            </div>
            {loading ? (
              <div className="output-rules-empty">正在加载规则...</div>
            ) : rules.length === 0 ? (
              <div className="output-rules-empty">
                <p>还没有规则。</p>
                <button className="secondary" type="button" onClick={handleResetDefaults}>恢复默认</button>
              </div>
            ) : (
              <div className="output-rules-items">
                {rules.map((rule) => (
                  <button
                    key={rule.id}
                    type="button"
                    className={`output-rule-card ${rule.id === selectedId ? 'is-active' : ''} ${!rule.enabled ? 'is-disabled' : ''}`}
                    onClick={() => handleSelectRule(rule)}
                  >
                    <div>
                      <strong>{rule.name}</strong>
                      <small>{getRuleStatusLabel(rule)}{rule.built_in ? ' · 内置' : ''}</small>
                    </div>
                    <span>{getRulePreview(rule)}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>

          <section className="output-rules-editor-area">
            {!draft ? (
              <div className="output-rules-placeholder">
                <p>选择一条规则开始编辑，或新建自定义规则。</p>
              </div>
            ) : (
              <div className="output-rules-form">
                <div className="output-rules-form-grid">
                  <label className="form-group">
                    <span>规则名</span>
                    <input
                      value={draft.name}
                      onChange={(event) => handleUpdateDraft({ name: event.target.value })}
                      placeholder="例如：去除 AI 自称"
                    />
                  </label>
                  <label className="form-group">
                    <span>匹配模式</span>
                    <select
                      value={draft.kind}
                      onChange={(event) => handleUpdateDraft({ kind: event.target.value })}
                    >
                      <option value="regex">正则表达式</option>
                      <option value="literal">普通文本</option>
                    </select>
                  </label>
                </div>

                <label className="form-group">
                  <span>说明</span>
                  <input
                    value={draft.description}
                    onChange={(event) => handleUpdateDraft({ description: event.target.value })}
                    placeholder="写给未来自己的规则用途说明"
                  />
                </label>

                <label className="form-group">
                  <span>匹配内容</span>
                  <textarea
                    value={draft.pattern}
                    rows={4}
                    onChange={(event) => handleUpdateDraft({ pattern: event.target.value })}
                    placeholder={draft.kind === 'literal' ? '要替换的原文' : '^\\s*作为AI语言模型[，,:：]?'}
                  />
                </label>

                <label className="form-group">
                  <span>替换为</span>
                  <textarea
                    value={draft.replacement}
                    rows={3}
                    onChange={(event) => handleUpdateDraft({ replacement: event.target.value })}
                    placeholder="留空表示删除匹配文本"
                  />
                </label>

                <div className="output-rules-toggle-grid">
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(draft.enabled)}
                      onChange={(event) => handleUpdateDraft({ enabled: event.target.checked })}
                    />
                    <span>启用</span>
                    <small>关闭后规则保留但不生效</small>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(draft.flags?.ignore_case)}
                      onChange={(event) => handleUpdateDraft({ flags: { ...draft.flags, ignore_case: event.target.checked } })}
                    />
                    <span>忽略大小写</span>
                    <small>适合 OOC / AI 等英文前缀</small>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(draft.flags?.multiline)}
                      onChange={(event) => handleUpdateDraft({ flags: { ...draft.flags, multiline: event.target.checked } })}
                    />
                    <span>多行模式</span>
                    <small>允许 ^ 和 $ 匹配每一行</small>
                  </label>
                </div>

                <div className="output-rules-entry-actions">
                  <button type="button" className="secondary" onClick={() => applyDraftToRules()}>暂存当前规则</button>
                  <button type="button" className="secondary" onClick={handleDuplicateRule}>复制</button>
                  {!draft.built_in && (
                    <button type="button" className="btn-danger-ghost" onClick={() => handleDeleteRule(draft.id)}>删除</button>
                  )}
                </div>

                <section className="output-rules-tester">
                  <div className="output-rules-tester-header">
                    <div>
                      <strong>快速预览</strong>
                      <small>不会调用 AI，也不会保存；只测试当前规则链。</small>
                    </div>
                    <button type="button" className="secondary" onClick={handleTest} disabled={testing}>
                      {testing ? '测试中...' : '测试规则'}
                    </button>
                  </div>
                  <textarea
                    value={testText}
                    rows={5}
                    onChange={(event) => setTestText(event.target.value)}
                    placeholder="粘贴一段 AI 回复，预览清理结果"
                  />
                  {testResult && (
                    <div className="output-rules-test-result">
                      <div>
                        <strong>{testResult.changed ? '已修正' : '无变化'}</strong>
                        <span>命中 {testResult.applied?.length || 0} 条规则</span>
                      </div>
                      <pre>{testResult.text}</pre>
                      {testResult.applied?.length > 0 && (
                        <ul>
                          {testResult.applied.map((item) => (
                            <li key={`${item.id}-${item.count}`}>{item.name || item.id} × {item.count}</li>
                          ))}
                        </ul>
                      )}
                      {testResult.errors?.length > 0 && (
                        <div className="output-rules-error">
                          {testResult.errors.map((item) => `${item.name || item.id}: ${item.error}`).join('；')}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}
          </section>
        </div>

        {(error || status) && (
          <div className={error ? 'output-rules-error' : 'output-rules-status'}>
            {error || status}
          </div>
        )}

        <footer className="output-rules-footer">
          <p className="note muted">规则按列表顺序依次执行；正则错误会被跳过，不会中断访客聊天。</p>
          <div>
            <button className="secondary" type="button" onClick={handleResetDefaults} disabled={!defaultRules.length}>
              恢复默认
            </button>
            <button className="secondary" type="button" onClick={onClose}>关闭</button>
            <button className="primary" type="button" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存护栏'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
