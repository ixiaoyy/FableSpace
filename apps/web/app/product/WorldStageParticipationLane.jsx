export default function WorldStageParticipationLane({
  selectedVisibilityMeta,
  selectedActionMeta,
  writebackForm,
  visibilityOptions,
}) {
  return (
    <div className="storyboard-lane d3-lane">
      <div className="storyboard-lane-header">
        <span className="storyboard-category-label">D3 · 玩家参与入口</span>
        <span className="storyboard-lane-meta">把写回动作解释成城市神话共创的上游入口，而不是孤立按钮</span>
      </div>
      <div className="d3-entry-hero">
        <div>
          <p className="mini-label">城市神话共创入口</p>
          <h3>{selectedVisibilityMeta.participationLabel}</h3>
          <p>{selectedVisibilityMeta.semantics}</p>
        </div>
        <div className="d3-entry-pill-group">
          <span className="d3-entry-pill">当前动作 · {selectedActionMeta.label}</span>
          <span className="d3-entry-pill">可见性 · {selectedVisibilityMeta.title}</span>
          <span className="d3-entry-pill">目标 · {writebackForm.eventType === 'dwell' ? '区域' : '地点'}</span>
        </div>
      </div>

      <div className="d3-entry-grid">
        {visibilityOptions.map((option, index) => {
          const active = writebackForm.visibility === option.value
          return (
            <article key={option.value} className={`d3-entry-card${active ? ' is-active' : ''}`}>
              <span className="d3-entry-index">0{index + 1}</span>
              <strong>{option.participationLabel}</strong>
              <p>{option.semantics}</p>
              <div className="d3-entry-copy">
                <span>{option.participationAction}</span>
                <span>{option.participationReward}</span>
              </div>
            </article>
          )
        })}
      </div>

      <div className="d3-flow-grid">
        <article className="d3-flow-card">
          <strong>即时反馈</strong>
          <p>{selectedActionMeta.label} 会先改变玩家状态、地点状态与当前切片反馈，属于你这次进入的即时回响。</p>
        </article>
        <article className="d3-flow-card">
          <strong>持久写回</strong>
          <p>{selectedVisibilityMeta.participationAction}</p>
        </article>
        <article className="d3-flow-card">
          <strong>神话推进</strong>
          <p>{selectedVisibilityMeta.participationReward}</p>
        </article>
      </div>
    </div>
  )
}
