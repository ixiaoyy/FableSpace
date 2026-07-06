const CATEGORY_LABELS = {
  character: '角色事实',
  task: '任务/委托',
  resource: '资源/线索',
  conflict: '冲突/机会',
  event_log: '事件台账',
}

const STATUS_LABELS = {
  pending: '待确认',
  confirmed: '已加入正史',
  rejected: '已忽略',
  superseded: '已替换',
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || category || '连续性'
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] || status || STATUS_LABELS.pending
}

function safeCards(cards) {
  return Array.isArray(cards) ? cards.filter((card) => card && typeof card === 'object') : []
}

export default function StateCardReviewPanel({
  cards = [],
  busy = false,
  error = '',
  onDecision,
}) {
  const pendingCards = safeCards(cards).filter((card) => card.status === 'pending')
  if (!error && pendingCards.length === 0) return null

  return (
    <section className="state-card-review-panel" aria-label="待确认连续性变化">
      <div className="state-card-review-panel__header">
        <div>
          <span className="state-card-review-panel__eyebrow">Canon Ledger</span>
          <h4>本轮待确认变化</h4>
        </div>
        <span className="state-card-review-panel__count">{pendingCards.length} 条</span>
      </div>
      <p className="state-card-review-panel__hint">
        AI 可以提出剧情和线索，但不会直接改写店主正史；确认后才进入结构化状态卡。
      </p>
      {error ? (
        <div className="state-card-review-panel__error" role="status">{error}</div>
      ) : null}
      <div className="state-card-list">
        {pendingCards.map((card) => {
          const metadata = card.metadata && typeof card.metadata === 'object' ? card.metadata : {}
          const contradiction = Boolean(metadata.contradiction_candidate)
          return (
            <article key={card.id} className="state-card-item">
              <div className="state-card-item__meta">
                <span>{getCategoryLabel(card.category)}</span>
                <span>{getStatusLabel(card.status)}</span>
                {contradiction ? <strong>可能引用未确认事实</strong> : null}
              </div>
              <h5>{card.title || getCategoryLabel(card.category)}</h5>
              <p>{card.summary}</p>
              <div className="state-card-item__actions">
                <button
                  type="button"
                  onClick={() => onDecision?.(card, 'confirmed')}
                  disabled={busy}
                >
                  加入正史
                </button>
                <button
                  type="button"
                  className="state-card-item__secondary"
                  onClick={() => onDecision?.(card, 'rejected')}
                  disabled={busy}
                >
                  忽略本次
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
