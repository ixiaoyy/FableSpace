export default function WorldStageWritebackInsightsPanel({
  writebackTimeline,
  writebackResult,
  revisitSummary,
  writebackResidues,
  behaviorInsights,
}) {
  return (
    <>
      {writebackTimeline.length ? (
        <div className="writeback-structured-panel">
          <div className="writeback-structured-header">
            <div>
              <p className="mini-label">结构化状态变化</p>
              <h3>本次写回已经产生可验证的状态链路</h3>
            </div>
            <span className="writeback-persistence-badge">已存事件 {writebackResult?.persistence?.stored_event_count ?? 0}</span>
          </div>

          <div className={`writeback-revisit-banner${revisitSummary.sameSlice ? ' is-valid' : ''}`}>
            <div>
              <strong>{revisitSummary.sameSlice ? '回访验证成功' : '等待同一切片回访验证'}</strong>
              <p>
                {revisitSummary.sameSlice
                  ? `当前切片 ${revisitSummary.currentSliceId} 与最近一次写回目标一致，说明这次进入仍然挂着你上次留下的痕迹。`
                  : `最近写回记录来自 ${revisitSummary.persistedSliceId || '未知切片'}，当前切片为 ${revisitSummary.currentSliceId || '尚未生成'}。重新进入同一切片时，这里会继续显示残留痕迹。`}
              </p>
            </div>
            <div className="writeback-revisit-stats">
              <span>最近事件={revisitSummary.lastEventType}</span>
              <span>熟悉度={revisitSummary.familiarity}</span>
              <span>已存事件={revisitSummary.storedEvents}</span>
            </div>
          </div>

          <div className="writeback-timeline">
            {writebackTimeline.map((item) => (
              <article key={item.id} className="writeback-timeline-item">
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>

          {writebackResidues.length ? (
            <div className="writeback-residue-grid">
              {writebackResidues.map((group) => (
                <article key={group.id} className="writeback-residue-card">
                  <strong>{group.title}</strong>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="storyboard-placeholder-card writeback-placeholder-card">
          <strong>等待第一次地点写回</strong>
          <p>先在上方选择 observe、dwell 或 mark，然后直接把动作提交到 /api/world/event。这里会显示玩家状态、地点状态、切片反馈与持续写入结果。</p>
        </div>
      )}

      <div className="behavior-insight-panel">
        <div className="writeback-visibility-header behavior-insight-header">
          <div>
            <p className="mini-label">AIO4 · 行为到意义</p>
            <h3>这段行动正在形成怎样的玩家含义</h3>
          </div>
          <span className="writeback-persistence-badge">{behaviorInsights?.dominant_meaning || '等待轨迹生成'}</span>
        </div>
        {behaviorInsights ? (
          <>
            <p className="writeback-visibility-summary">
              神话入口 · {behaviorInsights.myth_entry || '未命名漂流者'} · 主导城区 · {behaviorInsights.dominant_district || '未知'}
            </p>
            <div className="behavior-score-grid">
              <article className="behavior-score-card">
                <strong>explorer</strong>
                <span>{behaviorInsights.explorer_score ?? 0}</span>
              </article>
              <article className="behavior-score-card">
                <strong>chronicler</strong>
                <span>{behaviorInsights.chronicler_score ?? 0}</span>
              </article>
              <article className="behavior-score-card">
                <strong>restorer</strong>
                <span>{behaviorInsights.restorer_score ?? 0}</span>
              </article>
              <article className="behavior-score-card">
                <strong>recluse</strong>
                <span>{behaviorInsights.recluse_score ?? 0}</span>
              </article>
              <article className="behavior-score-card">
                <strong>共振度</strong>
                <span>{behaviorInsights.resonant_score ?? 0}</span>
              </article>
            </div>
            <div className="behavior-action-summary">
              {Object.entries(behaviorInsights.action_counts || {}).map(([key, value]) => (
                <span key={key} className="d3-entry-pill">{key} · {value}</span>
              ))}
            </div>
          </>
        ) : (
          <p className="writeback-visibility-summary">等待行为轨迹输入。第一次写回后，这里会把事件流编译成更高层的玩家角色倾向。</p>
        )}
      </div>

      <div className="behavior-insight-panel">
        <div className="writeback-visibility-header behavior-insight-header">
          <div>
            <p className="mini-label">AIO5 · 城市人格</p>
            <h3>城市对你的持续人格回应</h3>
          </div>
          {behaviorInsights?.city_persona && (
            <span className="writeback-persistence-badge">{behaviorInsights.city_persona.emotional_tone}</span>
          )}
        </div>
        {behaviorInsights?.city_persona ? (
          <>
            <p className="writeback-visibility-summary">
              {behaviorInsights.city_persona.greeting}
            </p>
            <div className="behavior-score-grid">
              <article className="behavior-score-card">
                <strong>称谓</strong>
                <span>{behaviorInsights.city_persona.address}</span>
              </article>
              <article className="behavior-score-card">
                <strong>回应偏好</strong>
                <span>{behaviorInsights.city_persona.response_bias}</span>
              </article>
              <article className="behavior-score-card">
                <strong>信任度</strong>
                <span>{behaviorInsights.city_persona.trust_level}</span>
              </article>
            </div>
            {behaviorInsights.city_persona.persona_tags?.length > 0 && (
              <div className="behavior-action-summary">
                {behaviorInsights.city_persona.persona_tags.map((tag) => (
                  <span key={tag} className="d3-entry-pill">{tag}</span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="writeback-visibility-summary">城市尚未对你形成人格印象。完成第一次写回后，这里会显示城市对你的称谓与情绪倾向。</p>
        )}
      </div>

      {behaviorInsights?.scene_capsule && (
        <div className="scene-capsule-panel">
          <div className="scene-capsule-header">
            <div>
              <p className="mini-label">AIO6 · 场景胶囊 · {behaviorInsights.scene_capsule.capsule_type}</p>
              <h3 className="scene-capsule-title">{behaviorInsights.scene_capsule.title || '城市低语'}</h3>
            </div>
            <span className="scene-capsule-type-badge">{behaviorInsights.scene_capsule.visibility}</span>
          </div>
          <p className="scene-capsule-narrative">
            {behaviorInsights.scene_capsule.narrative || behaviorInsights.scene_capsule.narrative_fragment}
          </p>
          {behaviorInsights.scene_capsule.summary && (
            <p className="writeback-visibility-summary muted">{behaviorInsights.scene_capsule.summary}</p>
          )}
          <div className="d3-entry-pills">
            <span className="d3-entry-pill">资源提示 · {behaviorInsights.scene_capsule.asset_pack_hint || behaviorInsights.scene_capsule.asset_hint || '-'}</span>
            <span className="d3-entry-pill">渲染方式 · {behaviorInsights.scene_capsule.render_mode || '默认浮层'}</span>
            <span className="d3-entry-pill">持续时间 · {behaviorInsights.scene_capsule.ttl_seconds ?? behaviorInsights.scene_capsule.decay_turns ?? '-'}</span>
            {behaviorInsights.scene_capsule.is_fallback && (
              <span className="d3-entry-pill muted">回退内容</span>
            )}
          </div>
        </div>
      )}
    </>
  )
}
