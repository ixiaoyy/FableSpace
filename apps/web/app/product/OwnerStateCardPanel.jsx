/**
 * OwnerStateCardPanel — 店主侧状态卡管理面板
 *
 * 展示空间所有状态卡（按状态/类型分组），
 * 支持查看、确认/拒绝/替换，以及创建空间级正史卡。
 *
 * 权限：
 * - 店主可查看/管理所有 scope=space 和 scope=visitor 的卡
 * - fixed_canon=true 的卡只能由店主管理
 * - 其他访客的 pending visitor 卡只能由该访客确认，店主可查看
 */
import { useState, useEffect, useMemo } from 'react'
import { listStateCards, decideStateCard, createStateCard } from '../lib/spaces'

const CATEGORY_META = {
  character: { label: '角色事实', icon: '👤' },
  task: { label: '任务/委托', icon: '📋' },
  resource: { label: '资源/线索', icon: '🔑' },
  conflict: { label: '冲突/机会', icon: '⚡' },
  event_log: { label: '事件台账', icon: '📖' },
}

const STATUS_META = {
  pending: { label: '待确认', color: '#f59e0b', bg: '#fef3c7' },
  confirmed: { label: '已加入正史', color: '#22c55e', bg: '#dcfce7' },
  rejected: { label: '已忽略', color: '#94a3b8', bg: '#f1f5f9' },
  superseded: { label: '已替换', color: '#a855f7', bg: '#f3e8ff' },
}

function getCategoryLabel(cat) {
  return CATEGORY_META[cat]?.label || cat || '连续性'
}
function getCategoryIcon(cat) {
  return CATEGORY_META[cat]?.icon || '📄'
}

function getStatusMeta(status) {
  return STATUS_META[status] || { label: status, color: '#94a3b8', bg: '#f1f5f9' }
}

function safeCards(cards) {
  return Array.isArray(cards) ? cards.filter((c) => c && typeof c === 'object') : []
}

function groupByStatus(cards) {
  const groups = { pending: [], confirmed: [], rejected: [], superseded: [] }
  for (const card of safeCards(cards)) {
    const bucket = groups[card.status] || groups.pending
    bucket.push(card)
  }
  return groups
}

function CardItem({ card, onDecision, busy }) {
  const sm = getStatusMeta(card.status)
  const isFixed = Boolean(card.fixed_canon)
  const meta = card.metadata && typeof card.metadata === 'object' ? card.metadata : {}
  const hasContradiction = Boolean(meta.contradiction_candidate)
  const decisionNote = meta.decision_note || ''
  const decidedBy = meta.decided_by || ''
  const decidedAt = meta.decided_at || ''

  return (
    <article className={`owner-state-card-item${isFixed ? ' is-fixed' : ''}`}>
      <div className="owner-state-card-item__header">
        <span className="owner-state-card-item__icon">{getCategoryIcon(card.category)}</span>
        <span className="owner-state-card-item__category">{getCategoryLabel(card.category)}</span>
        <span
          className="owner-state-card-item__status"
          style={{ color: sm.color, background: sm.bg }}
        >
          {sm.label}
        </span>
        {card.canon_scope === 'space' && (
          <span className="owner-state-card-item__scope space">正史</span>
        )}
        {isFixed && (
          <span className="owner-state-card-item__fixed">固定正史</span>
        )}
        {hasContradiction && (
          <span className="owner-state-card-item__contradiction">⚠️ 矛盾候选</span>
        )}
      </div>
      <h5 className="owner-state-card-item__title">{card.title || getCategoryLabel(card.category)}</h5>
      <p className="owner-state-card-item__summary">{card.summary}</p>

      {card.source === 'chat' && (
        <p className="owner-state-card-item__source">来源：聊天 · 由 {card.proposed_by || '访客'} 提出</p>
      )}
      {card.source_message_ids?.length > 0 && (
        <p className="owner-state-card-item__source">涉及 {card.source_message_ids.length} 条消息</p>
      )}
      {decisionNote && (
        <p className="owner-state-card-item__note">
          <strong>备注：</strong>{decisionNote}
          {decidedBy && <span> · {decidedBy}{decidedAt ? ` @ ${new Date(decidedAt).toLocaleString('zh-CN')}` : ''}</span>}
        </p>
      )}

      {card.status === 'pending' && (
        <div className="owner-state-card-item__actions">
          <button
            type="button"
            className="btn-confirm"
            onClick={() => onDecision(card, 'confirmed')}
            disabled={busy}
            title={isFixed ? '固定正史只能由店主确认' : ''}
          >
            ✓ 加入正史
          </button>
          <button
            type="button"
            className="btn-reject"
            onClick={() => onDecision(card, 'rejected')}
            disabled={busy}
          >
            ✗ 忽略
          </button>
          <button
            type="button"
            className="btn-supersede"
            onClick={() => onDecision(card, 'superseded')}
            disabled={busy}
          >
            ↻ 替换
          </button>
        </div>
      )}
    </article>
  )
}

export default function OwnerStateCardPanel({ space, ownerId, onClose }) {
  const [allCards, setAllCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterScope, setFilterScope] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newCardDraft, setNewCardDraft] = useState({ category: 'task', title: '', summary: '' })

  async function loadCards() {
    if (!space?.id) return
    setLoading(true)
    setError('')
    try {
      const result = await listStateCards(
        space.id,
        {
          status: filterStatus || undefined,
          category: filterCategory || undefined,
          canon_scope: filterScope || undefined,
        },
        ownerId,
      )
      setAllCards(Array.isArray(result?.state_cards) ? result.state_cards : [])
    } catch (err) {
      setError(`读取状态卡失败：${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCards()
  }, [space?.id, filterStatus, filterCategory, filterScope])

  async function handleDecision(card, status) {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const note = `店主决策：${status}`
      const result = await decideStateCard(space.id, card.id, { status, note }, ownerId)
      // Remove the decided card from local state
      setAllCards((prev) => prev.filter((c) => c.id !== card.id))
    } catch (err) {
      setError(`状态卡更新失败：${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  async function handleCreateCard() {
    if (!newCardDraft.title.trim() || !newCardDraft.summary.trim()) {
      setError('标题和摘要不能为空')
      return
    }
    setBusy(true)
    setError('')
    try {
      const result = await createStateCard(
        space.id,
        {
          category: newCardDraft.category,
          title: newCardDraft.title.trim(),
          summary: newCardDraft.summary.trim(),
          canon_scope: 'space',
          fixed_canon: false,
          status: 'pending',
        },
        ownerId,
      )
      setAllCards((prev) => [result?.state_card || result, ...prev])
      setNewCardDraft({ category: 'task', title: '', summary: '' })
      setShowCreate(false)
    } catch (err) {
      setError(`创建状态卡失败：${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const groups = groupByStatus(allCards)

  const stats = useMemo(() => ({
    pending: groups.pending.length,
    confirmed: groups.confirmed.length,
    rejected: groups.rejected.length,
    superseded: groups.superseded.length,
    total: allCards.length,
  }), [groups])

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal owner-state-card-panel" role="dialog" aria-label="店主状态卡管理">
        {/* Header */}
        <div className="modal__header">
          <div>
            <p className="mini-label">Canon Ledger</p>
            <h2>{space?.name || '空间'} — 状态卡管理</h2>
            <p className="note muted">
              共 {stats.total} 张卡 · {stats.pending} 待确认 · {stats.confirmed} 已确认
            </p>
          </div>
          <div className="modal__header-actions">
            <button type="button" className="secondary" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? '取消创建' : '+ 创建正史卡'}
            </button>
            <button type="button" className="secondary" onClick={loadCards} disabled={loading}>
              {loading ? '加载中...' : '刷新'}
            </button>
            <button type="button" className="icon-close" onClick={onClose} aria-label="关闭">✕</button>
          </div>
        </div>

        {/* Filters */}
        <div className="modal__filters">
          <label>
            状态：
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">全部</option>
              <option value="pending">待确认</option>
              <option value="confirmed">已加入正史</option>
              <option value="rejected">已忽略</option>
              <option value="superseded">已替换</option>
            </select>
          </label>
          <label>
            类型：
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
              <option value="">全部</option>
              <option value="character">角色事实</option>
              <option value="task">任务/委托</option>
              <option value="resource">资源/线索</option>
              <option value="conflict">冲突/机会</option>
              <option value="event_log">事件台账</option>
            </select>
          </label>
          <label>
            范围：
            <select value={filterScope} onChange={(e) => setFilterScope(e.target.value)}>
              <option value="">全部</option>
              <option value="visitor">访客卡</option>
              <option value="space">正史卡</option>
            </select>
          </label>
        </div>

        {error && (
          <div className="alert alert-error" role="alert">{error}</div>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="owner-state-card-panel__create">
            <h4>创建空间正史卡</h4>
            <label>
              类型
              <select
                value={newCardDraft.category}
                onChange={(e) => setNewCardDraft((d) => ({ ...d, category: e.target.value }))}
              >
                <option value="character">角色事实</option>
                <option value="task">任务/委托</option>
                <option value="resource">资源/线索</option>
                <option value="conflict">冲突/机会</option>
                <option value="event_log">事件台账</option>
              </select>
            </label>
            <label>
              标题（最长 80 字）
              <input
                type="text"
                value={newCardDraft.title}
                onChange={(e) => setNewCardDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="例如：委托-找回铜钥匙"
                maxLength={80}
              />
            </label>
            <label>
              摘要（最长 600 字）
              <textarea
                value={newCardDraft.summary}
                onChange={(e) => setNewCardDraft((d) => ({ ...d, summary: e.target.value }))}
                placeholder="描述这条正史的具体内容..."
                maxLength={600}
                rows={3}
              />
            </label>
            <div className="owner-state-card-panel__create-actions">
              <button type="button" className="btn-primary" onClick={handleCreateCard} disabled={busy}>
                {busy ? '创建中...' : '创建待确认卡'}
              </button>
              <button type="button" className="secondary" onClick={() => setShowCreate(false)}>取消</button>
            </div>
          </div>
        )}

        {/* Card groups */}
        {loading && allCards.length === 0 ? (
          <div className="modal__body owner-state-card-panel__loading">加载中...</div>
        ) : allCards.length === 0 ? (
          <div className="modal__body owner-state-card-panel__empty">
            <div className="empty-icon">📋</div>
            <p>暂无状态卡。聊完天后访客会生成待确认候选卡，或在此手动创建正史卡。</p>
          </div>
        ) : (
          <div className="modal__body owner-state-card-panel__groups">
            {['pending', 'confirmed', 'rejected', 'superseded'].map((status) => {
              const cards = groups[status]
              if (cards.length === 0) return null
              const sm = getStatusMeta(status)
              return (
                <section key={status} className="owner-state-card-group">
                  <h4
                    className="owner-state-card-group__label"
                    style={{ borderColor: sm.color }}
                  >
                    {sm.label} ({cards.length})
                  </h4>
                  <div className="owner-state-card-list">
                    {cards.map((card) => (
                      <CardItem
                        key={card.id}
                        card={card}
                        onDecision={handleDecision}
                        busy={busy}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
