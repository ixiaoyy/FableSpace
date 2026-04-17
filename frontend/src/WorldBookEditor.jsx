import { useEffect, useMemo, useState } from 'react'
import { getDefaultTavernService } from './services/tavernService'

function makeWorldInfoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `wi_${crypto.randomUUID()}`
  }
  return `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return splitKeywords(value)
  }
  return []
}

function splitKeywords(value) {
  return Array.from(new Set(
    String(value || '')
      .split(/[\n,，;；]+/)
      .map((item) => item.trim())
      .filter(Boolean),
  ))
}

function joinKeywords(value) {
  return normalizeArray(value).join('\n')
}

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.max(min, Math.min(max, numeric))
}

function normalizeEntry(entry = {}, tavernId = '') {
  const order = entry.order ?? entry.insertion_order ?? 100
  return {
    id: entry.id || makeWorldInfoId(),
    tavern_id: entry.tavern_id || tavernId,
    keys: normalizeArray(entry.keys),
    keys_secondary: normalizeArray(entry.keys_secondary),
    content: String(entry.content || ''),
    selective: entry.selective ?? true,
    constant: Boolean(entry.constant),
    depth: clampNumber(entry.depth, 4, 0, 30),
    order: clampNumber(order, 100, -9999, 9999),
    probability: clampNumber(entry.probability, 100, 0, 100),
    disable: Boolean(entry.disable),
  }
}

function entryToDraft(entry) {
  const normalized = normalizeEntry(entry)
  return {
    ...normalized,
    keys_text: joinKeywords(normalized.keys),
    keys_secondary_text: joinKeywords(normalized.keys_secondary),
  }
}

function draftToEntry(draft, tavernId = '') {
  const normalized = normalizeEntry(draft, tavernId)
  return {
    ...normalized,
    keys: splitKeywords(draft.keys_text),
    keys_secondary: splitKeywords(draft.keys_secondary_text),
    content: String(draft.content || '').trim(),
  }
}

function sanitizeEntryForSave(entry, tavernId = '') {
  const normalized = normalizeEntry(entry, tavernId)
  return {
    id: normalized.id,
    tavern_id: tavernId || normalized.tavern_id,
    keys: normalized.keys,
    keys_secondary: normalized.keys_secondary,
    content: normalized.content,
    selective: Boolean(normalized.selective),
    constant: Boolean(normalized.constant),
    depth: normalized.depth,
    order: normalized.order,
    insertion_order: normalized.order,
    probability: normalized.probability,
    disable: Boolean(normalized.disable),
  }
}

function getEntryTitle(entry) {
  if (entry.constant && !entry.keys?.length) return '常驻设定'
  return entry.keys?.[0] || entry.keys_secondary?.[0] || '未命名条目'
}

function getEntryPreview(entry) {
  const content = String(entry.content || '').trim()
  if (!content) return '还没有填写内容'
  return content.length > 72 ? `${content.slice(0, 72)}...` : content
}

function validateEntry(entry) {
  if (!entry.content.trim()) {
    return '请填写世界书内容'
  }
  if (!entry.constant && entry.keys.length === 0) {
    return '关键词触发条目至少需要 1 个主关键词；或开启“常驻条目”。'
  }
  return ''
}

function getTestStatusLabel(entry) {
  const labels = {
    matched: '命中',
    matched_with_probability: `概率 ${entry.probability}%`,
    probability_zero: '概率为 0',
    disabled: '已暂停',
    not_matched: '未触发',
  }
  return labels[entry.status] || '未触发'
}

/**
 * WorldBookEditor — 酒馆世界书编辑器
 *
 * 将 Tavern.world_info 从 JSON 数据变成店主可直接编辑的 UI。
 */
export default function WorldBookEditor({ tavern, ownerId, onClose, onWorldInfoChanged }) {
  const tavernService = getDefaultTavernService()
  const initialEntries = useMemo(
    () => (tavern?.world_info || []).map((entry) => normalizeEntry(entry, tavern?.id)),
    [tavern?.id],
  )

  const [entries, setEntries] = useState(initialEntries)
  const [selectedId, setSelectedId] = useState(initialEntries[0]?.id || '')
  const [draft, setDraft] = useState(initialEntries[0] ? entryToDraft(initialEntries[0]) : null)
  const [dirty, setDirty] = useState(false)
  const [draftTouched, setDraftTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState('')
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    const next = (tavern?.world_info || []).map((entry) => normalizeEntry(entry, tavern?.id))
    setEntries(next)
    setSelectedId(next[0]?.id || '')
    setDraft(next[0] ? entryToDraft(next[0]) : null)
    setDirty(false)
    setDraftTouched(false)
    setError('')
    setStatus('')
    setTestMessage('')
    setTesting(false)
    setTestError('')
    setTestResult(null)
  }, [tavern?.id])

  const selectedEntry = entries.find((entry) => entry.id === selectedId) || null
  const enabledCount = entries.filter((entry) => !entry.disable).length
  const constantCount = entries.filter((entry) => entry.constant && !entry.disable).length

  function applyDraftToEntries(options = {}) {
    if (!draft) return { ok: true, nextEntries: entries, savedEntry: null }
    const nextEntry = draftToEntry(draft, tavern?.id)
    const validation = validateEntry(nextEntry)
    if (validation && !options.allowInvalid) {
      setError(validation)
      return { ok: false, nextEntries: entries, savedEntry: nextEntry }
    }

    const nextEntries = entries.some((entry) => entry.id === nextEntry.id)
      ? entries.map((entry) => (entry.id === nextEntry.id ? nextEntry : entry))
      : [nextEntry, ...entries]
    setEntries(nextEntries)
    setSelectedId(nextEntry.id)
    setDraft(entryToDraft(nextEntry))
    setDraftTouched(false)
    setDirty(true)
    setError('')
    if (!options.silent) setStatus('条目已更新，记得保存世界书。')
    return { ok: true, nextEntries, savedEntry: nextEntry }
  }

  function handleSelectEntry(entry) {
    setSelectedId(entry.id)
    setDraft(entryToDraft(entry))
    setDraftTouched(false)
    setError('')
    setStatus('')
  }

  function handleAddEntry() {
    const nextEntry = normalizeEntry({
      id: makeWorldInfoId(),
      tavern_id: tavern?.id,
      keys: [],
      keys_secondary: [],
      content: '',
      selective: true,
      constant: false,
      depth: 4,
      order: entries.length ? Math.max(...entries.map((entry) => Number(entry.order || 0))) + 10 : 100,
      probability: 100,
      disable: false,
    }, tavern?.id)
    setEntries((prev) => [nextEntry, ...prev])
    setSelectedId(nextEntry.id)
    setDraft(entryToDraft(nextEntry))
    setDraftTouched(true)
    setDirty(true)
    setError('')
    setStatus('已新建空条目，填写内容后保存世界书。')
  }

  function handleUpdateDraft(patch) {
    setDraft((prev) => ({ ...prev, ...patch }))
    setDraftTouched(true)
    setStatus('')
  }

  function handleSaveDraft() {
    applyDraftToEntries()
  }

  function handleDuplicateEntry() {
    if (!draft) return
    const source = draftToEntry(draft, tavern?.id)
    const nextEntry = normalizeEntry({
      ...source,
      id: makeWorldInfoId(),
      order: Number(source.order || 100) + 1,
      disable: false,
    }, tavern?.id)
    const nextEntries = [nextEntry, ...entries]
    setEntries(nextEntries)
    setSelectedId(nextEntry.id)
    setDraft(entryToDraft(nextEntry))
    setDraftTouched(true)
    setDirty(true)
    setError('')
    setStatus('已复制条目，请检查关键词后保存。')
  }

  function handleDeleteEntry(entryId) {
    const nextEntries = entries.filter((entry) => entry.id !== entryId)
    setEntries(nextEntries)
    const nextSelected = nextEntries[0] || null
    setSelectedId(nextSelected?.id || '')
    setDraft(nextSelected ? entryToDraft(nextSelected) : null)
    setDraftTouched(false)
    setDirty(true)
    setError('')
    setStatus('条目已移除，保存世界书后生效。')
  }

  function getEntriesWithCurrentDraft() {
    if (!draftTouched || !draft) return entries
    const nextEntry = draftToEntry(draft, tavern?.id)
    return entries.some((entry) => entry.id === nextEntry.id)
      ? entries.map((entry) => (entry.id === nextEntry.id ? nextEntry : entry))
      : [nextEntry, ...entries]
  }

  async function handleTestWorldInfo() {
    const message = testMessage.trim()
    if (!message) {
      setTestError('请输入一段测试消息')
      return
    }
    setTesting(true)
    setTestError('')
    setTestResult(null)
    try {
      const worldInfo = getEntriesWithCurrentDraft().map((entry) => sanitizeEntryForSave(entry, tavern?.id))
      const result = await tavernService.testWorldInfo(
        tavern.id,
        { message, world_info: worldInfo, include_tavern_context: false },
        ownerId,
      )
      setTestResult(result)
    } catch (err) {
      setTestError(`测试失败：${err.message}`)
    } finally {
      setTesting(false)
    }
  }

  async function handlePersist() {
    let nextEntries = entries
    if (draftTouched) {
      const applied = applyDraftToEntries({ silent: true })
      if (!applied.ok) return
      nextEntries = applied.nextEntries
    }

    const invalidEntry = nextEntries
      .map((entry) => sanitizeEntryForSave(entry, tavern?.id))
      .find((entry) => validateEntry(entry))
    if (invalidEntry) {
      setError(`${getEntryTitle(invalidEntry)}：${validateEntry(invalidEntry)}`)
      return
    }

    setSaving(true)
    setError('')
    setStatus('')
    try {
      const payload = nextEntries.map((entry) => sanitizeEntryForSave(entry, tavern?.id))
      const savedTavern = await tavernService.saveWorldInfo(tavern.id, payload, ownerId)
      const savedEntries = (savedTavern?.world_info || payload).map((entry) => normalizeEntry(entry, tavern?.id))
      setEntries(savedEntries)
      const nextSelected = savedEntries.find((entry) => entry.id === selectedId) || savedEntries[0] || null
      setSelectedId(nextSelected?.id || '')
      setDraft(nextSelected ? entryToDraft(nextSelected) : null)
      setDraftTouched(false)
      setDirty(false)
      setStatus('世界书已保存。')
      if (onWorldInfoChanged) {
        onWorldInfoChanged({
          ...tavern,
          ...savedTavern,
          world_info: savedEntries,
        })
      }
    } catch (err) {
      setError(`保存失败：${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay world-book-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-content panel world-book-modal">
        <header className="modal-header world-book-header">
          <div>
            <p className="mini-label">世界书</p>
            <h3>{tavern?.name || '当前酒馆'} 的背景资料</h3>
            <p className="note muted">
              把地点、传闻、规则和隐藏设定写成条目，AI 会按关键词或常驻规则读取。
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </header>

        <div className="world-book-summary">
          <span>{entries.length} 条设定</span>
          <span>{enabledCount} 条启用</span>
          <span>{constantCount} 条常驻</span>
          {dirty || draftTouched ? <strong>有未保存更改</strong> : <span>已同步</span>}
        </div>

        <div className="world-book-body">
          <aside className="world-book-list">
            <div className="world-book-list-header">
              <span className="mini-label">条目列表</span>
              <button type="button" className="primary btn-sm" onClick={handleAddEntry}>
                + 新增条目
              </button>
            </div>

            {entries.length === 0 ? (
              <div className="world-book-empty">
                <p>还没有世界书条目。</p>
                <p>可以先添加一个“常驻设定”，让 AI 每轮都知道酒馆背景。</p>
              </div>
            ) : (
              <ul className="world-book-items">
                {entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={`world-book-entry-card ${entry.id === selectedId ? 'is-active' : ''} ${entry.disable ? 'is-disabled' : ''}`}
                      onClick={() => handleSelectEntry(entry)}
                    >
                      <strong>{getEntryTitle(entry)}</strong>
                      <span>{getEntryPreview(entry)}</span>
                      <div className="world-book-badges">
                        <small>{entry.constant ? '常驻' : '关键词'}</small>
                        {entry.disable ? <small>暂停</small> : null}
                        <small>顺序 {entry.order}</small>
                        <small>深度 {entry.depth}</small>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <main className="world-book-editor-area">
            {!draft ? (
              <div className="world-book-editor-placeholder">
                <p>选择左侧条目，或新建一条世界书设定。</p>
              </div>
            ) : (
              <div className="world-book-form">
                <div className="world-book-form-grid">
                  <label className="form-group">
                    <span>主关键词</span>
                    <textarea
                      value={draft.keys_text}
                      onChange={(event) => handleUpdateDraft({ keys_text: event.target.value })}
                      rows={3}
                      placeholder={'例如：毕业照\n档案柜\n旧校舍'}
                    />
                    <small>玩家或 AI 最近上下文出现这些词时，会触发该条目。</small>
                  </label>

                  <label className="form-group">
                    <span>次级关键词</span>
                    <textarea
                      value={draft.keys_secondary_text}
                      onChange={(event) => handleUpdateDraft({ keys_secondary_text: event.target.value })}
                      rows={3}
                      placeholder="可选；用于更精确地二次匹配"
                    />
                    <small>适合给同名词加条件，降低误触发。</small>
                  </label>
                </div>

                <label className="form-group">
                  <span>世界书内容</span>
                  <textarea
                    value={draft.content}
                    onChange={(event) => handleUpdateDraft({ content: event.target.value })}
                    rows={8}
                    placeholder="写给 AI 读取的设定，例如地点历史、人物关系、隐藏规则、物品用途等。"
                  />
                </label>

                <div className="world-book-number-grid">
                  <label className="form-group">
                    <span>注入顺序</span>
                    <input
                      type="number"
                      value={draft.order}
                      onChange={(event) => handleUpdateDraft({ order: event.target.value })}
                    />
                    <small>数字越小越靠前。</small>
                  </label>
                  <label className="form-group">
                    <span>扫描深度</span>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={draft.depth}
                      onChange={(event) => handleUpdateDraft({ depth: event.target.value })}
                    />
                    <small>向前扫描多少轮上下文。</small>
                  </label>
                  <label className="form-group">
                    <span>触发概率</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={draft.probability}
                      onChange={(event) => handleUpdateDraft({ probability: event.target.value })}
                    />
                    <small>100 表示每次命中都注入。</small>
                  </label>
                </div>

                <div className="world-book-toggle-grid">
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(draft.constant)}
                      onChange={(event) => handleUpdateDraft({ constant: event.target.checked })}
                    />
                    <span>常驻条目</span>
                    <small>每轮都让 AI 读取，适合核心设定。</small>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(draft.selective)}
                      onChange={(event) => handleUpdateDraft({ selective: event.target.checked })}
                    />
                    <span>需要关键词触发</span>
                    <small>关闭后由注入逻辑按普通条目处理。</small>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(draft.disable)}
                      onChange={(event) => handleUpdateDraft({ disable: event.target.checked })}
                    />
                    <span>暂停启用</span>
                    <small>保留条目，但暂时不让 AI 读取。</small>
                  </label>
                </div>

                {error ? <div className="world-book-error">{error}</div> : null}
                {status ? <div className="world-book-status">{status}</div> : null}

                <div className="world-book-entry-actions">
                  <button type="button" className="secondary" onClick={handleSaveDraft}>
                    保存条目
                  </button>
                  <button type="button" className="secondary" onClick={handleDuplicateEntry}>
                    复制条目
                  </button>
                  {selectedEntry ? (
                    <button type="button" className="btn-danger-ghost" onClick={() => handleDeleteEntry(selectedEntry.id)}>
                      删除条目
                    </button>
                  ) : null}
                </div>

                <section className="world-book-tester">
                  <div className="world-book-tester-header">
                    <div>
                      <span className="mini-label">命中测试</span>
                      <strong>这句话会触发哪些世界书？</strong>
                    </div>
                    <small>只测试关键词，不调用 AI，也不会保存。</small>
                  </div>
                  <textarea
                    value={testMessage}
                    onChange={(event) => setTestMessage(event.target.value)}
                    rows={3}
                    placeholder="例如：刘大爷，我想看毕业照。"
                  />
                  <div className="world-book-tester-actions">
                    <button type="button" className="secondary" onClick={handleTestWorldInfo} disabled={testing}>
                      {testing ? '测试中...' : '测试命中'}
                    </button>
                    {testResult ? (
                      <span>{testResult.matched_count} / {testResult.entry_count} 条命中</span>
                    ) : null}
                  </div>
                  {testError ? <div className="world-book-error">{testError}</div> : null}
                  {testResult ? (
                    <div className="world-book-test-results">
                      {testResult.entries?.length ? (
                        testResult.entries.map((entry) => {
                          const hitWords = [...(entry.matched_keys || []), ...(entry.matched_secondary_keys || [])]
                          return (
                            <article key={entry.id} className={`world-book-test-row ${entry.matched ? 'is-hit' : ''}`}>
                              <div>
                                <strong>{entry.matched ? '✓' : '○'} {entry.title}</strong>
                                <span>{getTestStatusLabel(entry)}</span>
                              </div>
                              <p>
                                {hitWords.length
                                  ? `命中词：${hitWords.join('、')}`
                                  : entry.constant
                                    ? '常驻条目，无需关键词'
                                    : '本句未包含触发词'}
                              </p>
                              <small>顺序 {entry.order} · 深度 {entry.depth}</small>
                            </article>
                          )
                        })
                      ) : (
                        <div className="world-book-empty is-compact">当前没有可测试的世界书条目。</div>
                      )}
                    </div>
                  ) : null}
                </section>
              </div>
            )}
          </main>
        </div>

        <footer className="world-book-footer">
          <p className="note muted">保存后会写入酒馆数据，导入角色卡带来的世界书也可以继续编辑。</p>
          <div className="modal-actions">
            <button type="button" className="secondary" onClick={onClose}>关闭</button>
            <button type="button" className="primary" onClick={handlePersist} disabled={saving}>
              {saving ? '保存中...' : '保存世界书'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
