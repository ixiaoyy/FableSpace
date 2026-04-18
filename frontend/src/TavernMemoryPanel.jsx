import { useEffect, useState } from 'react'

const DIMENSION_LABELS = {
  fact: '事实',
  emotion: '情感',
  event: '事件',
  preference: '偏好',
  promise: '承诺',
}

const DIMENSION_COLORS = {
  fact: '#4a9eff',
  emotion: '#ff6b9d',
  event: '#ffd166',
  preference: '#06d6a0',
  promise: '#c77dff',
}

const HORIZON_LABELS = { short: '短期', mid: '中期', long: '长期' }

const DEFAULT_EXPRESSION = 'neutral'

function getRelationshipStageLabel(stage) {
  const labels = {
    stranger: '初访者',
    acquaintance: '熟面孔',
    regular: '常客',
    confidant: '熟客盟友',
  }
  return labels[stage] || stage || '未建立'
}

function formatMemoryTime(value) {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getVisitorMemoryPayload(entryState, fallbackVisitCount = 0) {
  const visitorState = entryState?.visitor_state || entryState || {}
  const relationship = visitorState.relationship || entryState?.relationship || {}
  return {
    visitCount: Number(visitorState.visit_count ?? entryState?.visit_count ?? fallbackVisitCount ?? 0),
    stage: relationship.stage || visitorState.relationship_stage || '',
    strength: Number(relationship.strength ?? visitorState.relationship_strength ?? 0),
    firstVisit: visitorState.first_visit || entryState?.first_visit || '',
    lastVisit: visitorState.last_visit || entryState?.last_visit || '',
  }
}

/**
 * Memory atom card — single row in the memory list.
 */
function MemoryCard({ memory, onPin, onDelete, onMarkWrong }) {
  const dim = memory.dimension || 'fact'
  const color = DIMENSION_COLORS[dim] || DIMENSION_COLORS.fact
  const flaggedWrong = Boolean(memory.metadata?.flagged_wrong)

  return (
    <div className={`memory-card ${memory.pinned ? 'pinned' : ''} ${flaggedWrong ? 'flagged' : ''}`}>
      <div className="memory-card-header">
        <span
          className="memory-badge"
          style={{ background: color + '22', color }}
          title={DIMENSION_LABELS[dim] || dim}
        >
          {DIMENSION_LABELS[dim] || dim}
        </span>
        <span className="memory-horizon-tag">{HORIZON_LABELS[memory.horizon] || memory.horizon}</span>
        {memory.pinned && (
          <span className="memory-pinned-icon" title="已固定">📌</span>
        )}
        {flaggedWrong && (
          <span className="memory-wrong-tag" title="已标错">标错</span>
        )}
      </div>
      <p className="memory-card-content">{memory.content}</p>
      {memory.subject && (
        <p className="memory-card-subject">关于：{memory.subject}</p>
      )}
      <div className="memory-card-footer">
        <span className="memory-card-time">
          {formatMemoryTime(memory.updated_at || memory.created_at)}
        </span>
        <div className="memory-card-actions">
          <button
            className="btn-memory-action"
            onClick={() => onPin(memory.id, !memory.pinned)}
            title={memory.pinned ? '取消固定' : '固定记忆'}
          >
            {memory.pinned ? '📌' : '📍'}
          </button>
          <button
            className="btn-memory-action"
            onClick={() => onMarkWrong(memory.id, !flaggedWrong, memory.metadata || {})}
            title={flaggedWrong ? '恢复记忆' : '标记为错误'}
          >
            {flaggedWrong ? '恢复' : '标错'}
          </button>
          <button
            className="btn-memory-action btn-memory-delete"
            onClick={() => {
              if (window.confirm('确定删除这条记忆？')) onDelete(memory.id)
            }}
            title="删除记忆"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Manual memory editor — inline form to add a new memory atom.
 */
function MemoryEditor({ onSave, onCancel }) {
  const [content, setContent] = useState('')
  const [dimension, setDimension] = useState('fact')
  const [horizon, setHorizon] = useState('short')

  function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    onSave({ content: content.trim(), dimension, horizon })
    setContent('')
    setDimension('fact')
    setHorizon('short')
  }

  return (
    <form className="memory-editor" onSubmit={handleSubmit}>
      <textarea
        className="memory-editor-textarea"
        value={content}
        onInput={(e) => setContent(e.currentTarget.value)}
        placeholder="写下一段你想记住的事情…"
        rows={3}
        autoFocus
      />
      <div className="memory-editor-row">
        <select
          className="memory-editor-select"
          value={dimension}
          onChange={(e) => setDimension(e.currentTarget.value)}
        >
          {Object.entries(DIMENSION_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <select
          className="memory-editor-select"
          value={horizon}
          onChange={(e) => setHorizon(e.currentTarget.value)}
        >
          {Object.entries(HORIZON_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>
      <div className="memory-editor-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>取消</button>
        <button type="submit" className="btn-primary" disabled={!content.trim()}>保存</button>
      </div>
    </form>
  )
}

/**
 * Toast notification for newly created memories.
 */
function MemoryToast({ count, onDismiss }) {
  useEffect(() => {
    if (count <= 0) return
    const timer = setTimeout(onDismiss, 3500)
    return () => clearTimeout(timer)
  }, [count, onDismiss])

  if (count <= 0) return null

  return (
    <div className="memory-toast" role="status" aria-live="polite">
      <span>🧠 记忆已保存（{count}条新记忆）</span>
      <button className="memory-toast-close" onClick={onDismiss}>×</button>
    </div>
  )
}

/**
 * Structured memory panel — fetches and displays MemoryAtom entries
 * for the current visitor in the tavern context.
 *
 * Props:
 *   entryState      — visitor state / chat entry state
 *   messages        — current chat messages
 *   selectedChar    — active character object
 *   visitorNickname — display name
 *   roomName        — tavern name
 *   tavernId        — tavern ID
 *   tavernService   — tavern service instance (optional)
 *   visitorId       — current visitor / user ID for private memory access
 *   createdMemories — array of newly created MemoryAtom dicts from last chat response
 *   onClose         — called to close the panel
 */
export default function TavernMemoryPanel({
  entryState,
  messages,
  selectedChar,
  visitorNickname,
  roomName,
  tavernId,
  tavernService,
  visitorId = '',
  createdMemories = [],
  onClose,
}) {
  const memory = getVisitorMemoryPayload(entryState)
  const strengthPercent = Math.max(0, Math.min(100, Math.round(memory.strength * 100)))

  const [atoms, setAtoms] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filterDim, setFilterDim] = useState('all')
  const [showEditor, setShowEditor] = useState(false)
  const [toastCount, setToastCount] = useState(0)

  // Show toast when new memories arrive from a chat response
  useEffect(() => {
    if (createdMemories && createdMemories.length > 0) {
      setToastCount(createdMemories.length)
    }
  }, [createdMemories])

  // Fetch memories on mount and whenever tavernId changes
  useEffect(() => {
    if (!tavernId || !tavernService) return
    setLoading(true)
    setError('')
    tavernService.listMemories(tavernId, { visitor_id: visitorId, limit: 100 }, visitorId)
      .then((data) => {
        setAtoms(Array.isArray(data.memories) ? data.memories : [])
        setLoading(false)
      })
      .catch((err) => {
        setError('加载记忆失败：' + (err.message || String(err)))
        setLoading(false)
      })
  }, [tavernId, visitorId])

  function refetch() {
    if (!tavernId || !tavernService) return
    setLoading(true)
    tavernService.listMemories(tavernId, { visitor_id: visitorId, limit: 100 }, visitorId)
      .then((data) => {
        setAtoms(Array.isArray(data.memories) ? data.memories : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  function handlePin(memoryId, pinned) {
    if (!tavernId || !tavernService) return
    tavernService.togglePinMemory(tavernId, memoryId, pinned, visitorId)
      .then(() => {
        setAtoms((prev) =>
          prev.map((m) => (m.id === memoryId ? { ...m, pinned } : m))
        )
      })
      .catch((err) => {
        alert('固定记忆失败：' + (err.message || String(err)))
      })
  }

  function handleDelete(memoryId) {
    if (!tavernId || !tavernService) return
    tavernService.deleteMemoryAtom(tavernId, memoryId, visitorId)
      .then(() => {
        setAtoms((prev) => prev.filter((m) => m.id !== memoryId))
      })
      .catch((err) => {
        alert('删除记忆失败：' + (err.message || String(err)))
      })
  }

  function handleMarkWrong(memoryId, flagged, metadata) {
    if (!tavernId || !tavernService) return
    tavernService.markMemoryWrong(tavernId, memoryId, metadata, flagged, visitorId)
      .then((result) => {
        const updated = result.memory_atom
        setAtoms((prev) =>
          prev.map((m) => (m.id === memoryId ? (updated || { ...m, metadata: { ...(m.metadata || {}), flagged_wrong: flagged } }) : m))
        )
      })
      .catch((err) => {
        alert('标记记忆失败：' + (err.message || String(err)))
      })
  }

  function handleSave(newAtom) {
    if (!tavernId || !tavernService) return
    tavernService.createMemoryAtom(tavernId, {
      ...newAtom,
      scope: 'visitor_character',
      visibility: 'private',
      tavern_id: tavernId,
      visitor_id: visitorId,
      character_id: selectedChar?.id || '',
      subject: visitorNickname || visitorId || '访客',
    }, visitorId)
      .then((result) => {
        const created = result.memory_atom || result
        setAtoms((prev) => [created, ...prev])
        setShowEditor(false)
      })
      .catch((err) => {
        alert('保存记忆失败：' + (err.message || String(err)))
      })
  }

  const userMessages = messages.filter((m) => m.role === 'user')
  const assistantMessages = messages.filter((m) => m.role === 'assistant')
  const recentUserMessage = [...userMessages].reverse().find((m) => m.content)
  const recentAssistantMessage = [...assistantMessages].reverse().find((m) => m.content)

  const filteredAtoms = filterDim === 'all'
    ? atoms
    : atoms.filter((m) => m.dimension === filterDim)

  const dimTabs = ['all', 'fact', 'emotion', 'event', 'preference', 'promise']
  const tabLabel = (d) => d === 'all' ? '全部' : (DIMENSION_LABELS[d] || d)

  return (
    <aside className="memory-detail-panel">
      <div className="char-detail-header">
        <h4>记忆</h4>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {/* Relationship / visitor state section */}
      <div className="memory-panel-section">
        <span className="mini-label">当前关系</span>
        <strong>{getRelationshipStageLabel(memory.stage)}</strong>
        <div className="memory-strength-bar" aria-label={`关系强度 ${strengthPercent}%`}>
          <span style={{ width: `${strengthPercent}%` }} />
        </div>
        <p className="muted">
          {visitorNickname || '这位访客'} 已到访 {memory.visitCount || 0} 次。
        </p>
      </div>

      <div className="memory-grid">
        <div>
          <span className="mini-label">首次到访</span>
          <strong>{formatMemoryTime(memory.firstVisit)}</strong>
        </div>
        <div>
          <span className="mini-label">最近到访</span>
          <strong>{formatMemoryTime(memory.lastVisit)}</strong>
        </div>
        <div>
          <span className="mini-label">本轮消息</span>
          <strong>{messages.length}</strong>
        </div>
        <div>
          <span className="mini-label">当前角色</span>
          <strong>{selectedChar?.name || '未选择'}</strong>
        </div>
      </div>

      <div className="memory-panel-section">
        <span className="mini-label">本轮短期记忆</span>
        {recentUserMessage || recentAssistantMessage ? (
          <div className="memory-recent-list">
            {recentUserMessage ? (
              <p>
                <strong>{visitorNickname || '访客'}：</strong>
                {recentUserMessage.content.slice(0, 90)}
              </p>
            ) : null}
            {recentAssistantMessage ? (
              <p>
                <strong>{selectedChar?.name || 'NPC'}：</strong>
                {recentAssistantMessage.content.slice(0, 90)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="muted">还没有本轮对话。发出第一句话后，这里会显示最新短期上下文。</p>
        )}
      </div>

      {/* Structured memory atoms section */}
      <div className="memory-panel-section">
        <div className="memory-atoms-header">
          <span className="mini-label">结构化记忆</span>
          <button
            className="btn-small"
            onClick={() => setShowEditor((v) => !v)}
            title="手动添加记忆"
          >
            {showEditor ? '取消' : '+ 添加'}
          </button>
        </div>

        {showEditor && (
          <MemoryEditor
            onSave={handleSave}
            onCancel={() => setShowEditor(false)}
          />
        )}

        {/* Dimension filter tabs */}
        <div className="memory-dim-tabs" role="tablist">
          {dimTabs.map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={filterDim === d}
              className={`memory-dim-tab ${filterDim === d ? 'active' : ''}`}
              onClick={() => setFilterDim(d)}
            >
              {tabLabel(d)}
            </button>
          ))}
        </div>

        {loading && <p className="muted memory-loading">加载中…</p>}
        {error && <p className="memory-error">{error}</p>}

        {!loading && !error && filteredAtoms.length === 0 && (
          <p className="muted">
            {filterDim === 'all'
              ? '还没有结构化记忆。发送带有情感或事实的消息，会自动创建记忆。'
              : `还没有${DIMENSION_LABELS[filterDim] || filterDim}类型的记忆。`}
          </p>
        )}

        {!loading && !error && filteredAtoms.length > 0 && (
          <div className="memory-card-list">
            {filteredAtoms.map((atom) => (
              <MemoryCard
                key={atom.id}
                memory={atom}
                onPin={handlePin}
                onDelete={handleDelete}
                onMarkWrong={handleMarkWrong}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast notification */}
      <MemoryToast
        count={toastCount}
        onDismiss={() => {
          setToastCount(0)
          refetch()
        }}
      />
    </aside>
  )
}
