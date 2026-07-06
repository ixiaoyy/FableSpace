export default function AdminDebugPanel({
  adminOpen,
  setAdminOpen,
  apiBase,
  setApiBase,
  checking,
  checkBackend,
  statusOk,
  statusText,
  statusDetail,
  writebackForm,
  updateWritebackForm,
  writebackSubmitting,
  submitWriteback,
  writebackError,
  writebackResult,
  playerState,
  feedback,
  recentEchoes,
  recentMarks,
  placeLegend,
  honorBoard,
}) {
  return (
    <section className="panel admin-panel">
      <div className="admin-header">
        <div>
          <p className="mini-label">后台 / 调试</p>
          <h2>后台与调试工具</h2>
          <p className="note muted">开发调试、接口验证和写回实验都留在折叠区，不再占据首页主叙事。</p>
        </div>
        <button type="button" className="secondary admin-toggle" onClick={() => setAdminOpen((current) => !current)}>
          {adminOpen ? '收起后台工具' : '展开后台工具'}
        </button>
      </div>

      {adminOpen ? (
        <div className="admin-content">
          <div className="grid admin-grid">
            <section className="panel inner-panel">
              <h3>后端连接</h3>
              <label htmlFor="server-base">API 基础地址</label>
              <div className="row-2">
                <input id="server-base" type="text" value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
                <button type="button" className="secondary" disabled={checking} onClick={checkBackend}>
                  {checking ? '检查中...' : '重新检查'}
                </button>
              </div>
              <p className="status">
                <span className={`dot${statusOk ? ' ok' : ''}`}></span>
                <span>{statusText}</span>
              </p>
              <p className="note muted">{statusDetail}</p>
            </section>

            <section className="panel inner-panel">
              <h3>写回事件</h3>
              <p className="note">使用同一切片提交最小事件，验证玩家状态、地点痕迹与切片反馈是否会被后端持续写入。</p>
              <div className="row-3">
                <div>
                  <label htmlFor="player-id">玩家 ID</label>
                  <input id="player-id" type="text" value={writebackForm.playerId} onChange={(event) => updateWritebackForm('playerId', event.target.value)} />
                </div>
                <div>
                  <label htmlFor="event-type">事件类型</label>
                  <select id="event-type" value={writebackForm.eventType} onChange={(event) => updateWritebackForm('eventType', event.target.value)}>
                    <option value="observe">观察</option>
                    <option value="dwell">驻足</option>
                    <option value="mark">标记</option>
                    <option value="repair">修复</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="visibility">可见性</label>
                  <select id="visibility" value={writebackForm.visibility} onChange={(event) => updateWritebackForm('visibility', event.target.value)}>
                    <option value="private">仅自己可见</option>
                    <option value="local_public">区域公开</option>
                    <option value="global">城市神话层候选</option>
                  </select>
                </div>
              </div>
              <div className="row-3">
                <div>
                  <label htmlFor="target-type">目标类型</label>
                  <select id="target-type" value={writebackForm.targetType} onChange={(event) => updateWritebackForm('targetType', event.target.value)}>
                    <option value="poi">地点</option>
                    <option value="zone">区域</option>
                    <option value="route">路径</option>
                    <option value="landmark">地标</option>
                    <option value="home">家园</option>
                    <option value="world">切片</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="target-id">目标 ID</label>
                  <input id="target-id" type="text" value={writebackForm.targetId} onChange={(event) => updateWritebackForm('targetId', event.target.value)} />
                </div>
                <div>
                  <label htmlFor="slice-id">切片 ID</label>
                  <input id="slice-id" type="text" value={writebackForm.sliceId} onChange={(event) => updateWritebackForm('sliceId', event.target.value)} />
                </div>
              </div>
              <div className="row-3">
                <div>
                  <label htmlFor="zone-id">区域 ID</label>
                  <input id="zone-id" type="text" value={writebackForm.zoneId} onChange={(event) => updateWritebackForm('zoneId', event.target.value)} />
                </div>
                <div>
                  <label htmlFor="intensity">观察强度</label>
                  <input id="intensity" type="number" min="1" max="3" step="1" value={writebackForm.intensity} onChange={(event) => updateWritebackForm('intensity', event.target.value)} />
                </div>
                <div>
                  <label htmlFor="mark-tag">标记标签</label>
                  <select id="mark-tag" value={writebackForm.tag} onChange={(event) => updateWritebackForm('tag', event.target.value)}>
                    <option value="safe">安全</option>
                    <option value="uncanny">异样</option>
                    <option value="warm_corner">温暖角落</option>
                    <option value="return_again">还想再来</option>
                    <option value="rain_friendly">适合雨天</option>
                  </select>
                </div>
              </div>
              <label htmlFor="writeback-note">可选备注</label>
              <input id="writeback-note" type="text" value={writebackForm.note} onChange={(event) => updateWritebackForm('note', event.target.value)} placeholder="给这次事件补一条轻量注释" />
              <div className="actions">
                <button type="button" disabled={writebackSubmitting} onClick={submitWriteback}>
                  {writebackSubmitting ? '写回中...' : '提交写回事件'}
                </button>
              </div>
              {writebackError ? <p className="note error-note">{writebackError}</p> : null}
            </section>
          </div>

          {writebackResult ? (
            <div className="writeback-grid">
              <div className="result-card">
                <h3>玩家状态</h3>
                <div><strong>动作：</strong> {playerState?.action_state || '-'}</div>
                <div><strong>清晰度：</strong> {playerState?.clarity ?? '-'}</div>
                <div><strong>张力：</strong> {playerState?.tension ?? '-'}</div>
                <div><strong>感应度：</strong> {playerState?.attunement ?? '-'}</div>
                <div><strong>区域熟悉度：</strong> {JSON.stringify(playerState?.zone_familiarity || {})}</div>
                <div><strong>地点熟悉度：</strong> {JSON.stringify(playerState?.poi_familiarity || {})}</div>
              </div>
              <div className="result-card">
                <h3>地点状态</h3>
                <div><strong>目标：</strong> {writebackResult.place_state?.target_id || '-'}</div>
                <div><strong>类型：</strong> {writebackResult.place_state?.target_type || '-'}</div>
                <div><strong>熟悉度：</strong> {writebackResult.place_state?.familiarity ?? '-'}</div>
                <div><strong>标记数：</strong> {writebackResult.place_state?.mark_count ?? '-'}</div>
                {writebackResult.place_state?.repair_count > 0 ? (
                  <div><strong>修复次数：</strong> {writebackResult.place_state.repair_count}</div>
                ) : null}
                <div><strong>最近事件：</strong> {writebackResult.place_state?.last_event_type || '-'}</div>
                <div><strong>已存事件：</strong> {writebackResult.persistence?.stored_event_count ?? '-'}</div>
              </div>
              <div className="result-card">
                <h3>切片反馈</h3>
                <div><strong>摘要：</strong> {feedback?.summary || '-'}</div>
                <div><strong>广播提示：</strong> {(feedback?.broadcast_hints || []).join(' · ') || '-'}</div>
                <div><strong>显现字段：</strong> {(feedback?.revealed_fields || []).join(' · ') || '-'}</div>
                <div><strong>持久化文件：</strong> {writebackResult.persistence?.state_file || '-'}</div>
              </div>
            </div>
          ) : null}

          {recentEchoes.length ? (
            <div className="result-card stacked-card">
              <h3>最近回声</h3>
              {recentEchoes.map((entry) => (
                <div key={`${entry.timestamp}-${entry.target_id}-${entry.entry_type}`} className="subtle-block">
                  <strong>{entry.entry_type}</strong> · {entry.text}
                </div>
              ))}
            </div>
          ) : null}

          {recentMarks.length ? (
            <div className="result-card stacked-card">
              <h3>最近标记</h3>
              {recentMarks.map((entry) => (
                <div key={entry.event_id} className="subtle-block">
                  <strong>{entry.tag}</strong> · {entry.visibility} {entry.note ? `· ${entry.note}` : ''}
                </div>
              ))}
            </div>
          ) : null}

          {placeLegend ? (
            <div className="result-card stacked-card">
              <h3>地点传说（{placeLegend.tier}）</h3>
              <p className="subtle-block">{placeLegend.narrative}</p>
              {placeLegend.vibe_summary ? (
                <div className="subtle-block"><strong>气质：</strong>{placeLegend.vibe_summary}</div>
              ) : null}
              <div className="subtle-block"><strong>印记总数：</strong>{placeLegend.mark_count}</div>
            </div>
          ) : null}

          {honorBoard.length > 0 ? (
            <div className="result-card stacked-card">
              <h3>城市荣誉榜</h3>
              {honorBoard.map((entry, i) => (
                <div key={entry.player_id} className="subtle-block">
                  <strong>#{i + 1} {entry.player_id}</strong> · 修复 {entry.contributions} 次
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
