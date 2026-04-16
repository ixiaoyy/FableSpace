import { getActionButtonText } from './services/appDisplay'

export default function WorldStageWritebackActionPanel({
  writebackTargetSummary,
  writebackActions,
  writebackForm,
  applyWritebackAction,
  selectedActionMeta,
  updateWritebackForm,
  visibilityOptions,
  selectedVisibilityMeta,
  writebackSubmitting,
  submitWriteback,
  writebackError,
}) {
  return (
    <div className="writeback-action-panel">
      <div className="writeback-action-header">
        <div>
          <p className="mini-label">P6 · 写回动作</p>
          <h3>在当前地点直接触发观察 / 驻足 / 标记</h3>
        </div>
        <span className="writeback-action-target">{writebackTargetSummary}</span>
      </div>

      <div className="writeback-action-grid">
        {writebackActions.map((action) => {
          const active = writebackForm.eventType === action.eventType
          return (
            <button
              key={action.eventType}
              type="button"
              className={`writeback-action-card${active ? ' is-active' : ''}`}
              onClick={() => applyWritebackAction(action.eventType)}
            >
              <strong>{action.label}</strong>
              <span>{action.hint}</span>
            </button>
          )
        })}
      </div>

      <div className="writeback-quick-panel">
        <div className="writeback-quick-meta">
          <strong>{selectedActionMeta.label}</strong>
          <span>{selectedActionMeta.hint}</span>
        </div>

        {writebackForm.eventType === 'observe' ? (
          <label className="writeback-inline-field">
            <span>观察强度</span>
            <input
              type="number"
              min="1"
              max="3"
              step="1"
              value={writebackForm.intensity}
              onChange={(event) => updateWritebackForm('intensity', event.target.value)}
            />
          </label>
        ) : null}

        {writebackForm.eventType === 'mark' ? (
          <label className="writeback-inline-field">
            <span>标记类型</span>
            <select value={writebackForm.tag} onChange={(event) => updateWritebackForm('tag', event.target.value)}>
              <option value="safe">safe</option>
              <option value="uncanny">uncanny</option>
              <option value="warm_corner">warm_corner</option>
              <option value="return_again">return_again</option>
              <option value="rain_friendly">rain_friendly</option>
            </select>
          </label>
        ) : null}

        <label className="writeback-inline-field writeback-inline-field--wide">
          <span>补充说明</span>
          <input
            type="text"
            value={writebackForm.note}
            onChange={(event) => updateWritebackForm('note', event.target.value)}
            placeholder="可选的一句备注，用于帮助你回访时辨认这次写回"
          />
        </label>

        <label className="writeback-inline-field">
          <span>可见性</span>
          <select value={writebackForm.visibility} onChange={(event) => updateWritebackForm('visibility', event.target.value)}>
            {visibilityOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="writeback-primary-btn"
          disabled={writebackSubmitting}
          onClick={submitWriteback}
        >
          {getActionButtonText(writebackForm.eventType, writebackSubmitting)}
        </button>
      </div>

      <div className="writeback-visibility-panel">
        <div className="writeback-visibility-header">
          <div>
            <p className="mini-label">D3 · 参与与可见性</p>
            <h3>这次写回准备留在什么层</h3>
          </div>
          <span className={`writeback-visibility-badge writeback-visibility-badge--${selectedVisibilityMeta.value}`}>
            {selectedVisibilityMeta.title}
          </span>
        </div>
        <p className="writeback-visibility-summary">{selectedVisibilityMeta.title} · {selectedVisibilityMeta.hint}</p>
        <div className="writeback-visibility-grid">
          {visibilityOptions.map((option) => (
            <article key={option.value} className={`writeback-visibility-card${writebackForm.visibility === option.value ? ' is-active' : ''}`}>
              <strong>{option.label}</strong>
              <span>{option.title}</span>
              <p>{option.access}</p>
            </article>
          ))}
        </div>
      </div>

      {writebackError ? <p className="note error-note">{writebackError}</p> : null}
    </div>
  )
}
