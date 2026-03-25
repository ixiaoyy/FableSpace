import WorldMap from './WorldMap'
import WorldDensityIndicator from './WorldDensityIndicator'
import {
  formatTagLabel,
  getActionButtonText,
  getPoiFactionLabel,
  getPoiTypeLabel,
} from './services/appDisplay'

export default function WorldStagePanel({
  result,
  originLabel,
  form,
  statusOk,
  mapLayerPanelOpen,
  setMapLayerPanelOpen,
  visibleMapLayers,
  mapLayerOptions,
  mapLayerPresets,
  applyMapLayerPreset,
  setAllMapLayers,
  resetMapLayers,
  toggleMapLayer,
  activePoiId,
  familiarityMap,
  ghostTraces,
  handlePoiClick,
  writebackForm,
  handleOrchestrationEvent,
  submitting,
  submitNearby,
  resolvedActivePoi,
  writebackResult,
  selectedVisibilityMeta,
  poiSearch,
  setPoiSearch,
  poiTypeFilter,
  setPoiTypeFilter,
  poiTypeOptions,
  poiFactionFilter,
  setPoiFactionFilter,
  poiFactionOptions,
  poiOnlyFamiliar,
  setPoiOnlyFamiliar,
  poiSearchSummary,
  filteredWorldPois,
  orchestrationEvents,
  disturbanceForm,
  setDisturbanceForm,
  disturbanceSubmitting,
  submitDisturbance,
  disturbanceActive,
  clearDisturbance,
  selectedActionMeta,
  visibilityOptions,
  writebackTargetSummary,
  writebackActions,
  applyWritebackAction,
  updateWritebackForm,
  writebackSubmitting,
  submitWriteback,
  writebackError,
  writebackTimeline,
  revisitSummary,
  writebackResidues,
  behaviorInsights,
  focusWritebackTarget,
  lastWritebackPoiId,
}) {
  return (
    <section className="panel preview-panel player-preview-panel storyboard-panel">
      <div className="section-heading storyboard-heading">
        <div>
          <p className="mini-label">步骤 3</p>
          <h2>进入 2D 世界地图</h2>
        </div>
        <div className="storyboard-heading-copy">
          <p className="note muted">这里不再是平面预览区，而是你附近切片被转译成 2D 游戏世界地图的主舞台。</p>
        </div>
      </div>

      <div className="storyboard-shell">
        <div className="storyboard-shell-top">
          <div className="storyboard-category">
            <span className="storyboard-category-label">世界气候层</span>
            <div className="storyboard-chip-row">
              <span className={`storyboard-chip${result ? '' : ' storyboard-chip--empty'}`}>
                {result ? '切片已就绪' : '待生成'}
              </span>
              <span className="storyboard-chip">{formatTagLabel(result?.world?.region?.vibe_profile, '静雨')}</span>
              <span className="storyboard-chip">{formatTagLabel(result?.dominant_faction, '未显形势力')}</span>
              <span className="storyboard-chip">{formatTagLabel(result?.region_theme, '未命名切片')}</span>
            </div>
          </div>
          <div className="storyboard-category">
            <span className="storyboard-category-label">进入设定</span>
            <div className="storyboard-chip-row">
              <span className="storyboard-chip">{originLabel}</span>
              <span className="storyboard-chip">{form.radius}m 半径</span>
              <span className="storyboard-chip">{result?.landmark_count ?? 0} 个地标</span>
            </div>
          </div>
        </div>

        <div className="storyboard-map-frame">
          <div
            className={`map-layer-toolbar${mapLayerPanelOpen ? '' : ' is-collapsed'}`}
            role="group"
            aria-label="地图图层控制器"
          >
            <div className="map-layer-toolbar__header">
              <div>
                <span className="storyboard-category-label">图层控制器</span>
                <p className="map-layer-toolbar__copy">按需折叠世界骨架、标签与残影，同时保留地图主舞台。</p>
              </div>
              <div className="map-layer-toolbar__header-actions">
                <span className="map-layer-toolbar__summary">
                  已开启 {Object.values(visibleMapLayers).filter(Boolean).length} / {mapLayerOptions.length} 层
                </span>
                <button
                  type="button"
                  className="map-layer-toolbar__toggle"
                  onClick={() => setMapLayerPanelOpen((current) => !current)}
                  aria-expanded={mapLayerPanelOpen}
                  aria-controls="map-layer-toolbar-panel"
                >
                  {mapLayerPanelOpen ? '收起控制器' : '展开控制器'}
                </button>
              </div>
            </div>
            {mapLayerPanelOpen ? (
              <div id="map-layer-toolbar-panel" className="map-layer-toolbar__panel">
                <div className="map-layer-preset-row" role="toolbar" aria-label="地图图层预设">
                  {mapLayerPresets.map((preset) => {
                    const active = mapLayerOptions.every((layer) => Boolean(visibleMapLayers[layer.key]) === Boolean(preset.layers[layer.key]))
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        className={`map-layer-preset${active ? ' is-active' : ''}`}
                        onClick={() => applyMapLayerPreset(preset.key)}
                      >
                        <strong>{preset.label}</strong>
                        <span>{preset.hint}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="map-layer-toolbar__actions" role="toolbar" aria-label="图层快捷操作">
                  <button type="button" className="map-layer-action" onClick={() => setAllMapLayers(true)}>全开</button>
                  <button type="button" className="map-layer-action" onClick={() => setAllMapLayers(false)}>全关</button>
                  <button type="button" className="map-layer-action" onClick={resetMapLayers}>重置默认</button>
                </div>
                <div className="map-layer-toolbar__grid">
                  {mapLayerOptions.map((layer) => (
                    <label key={layer.key} className={`map-layer-toggle${visibleMapLayers[layer.key] ? ' is-active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={Boolean(visibleMapLayers[layer.key])}
                        onChange={() => toggleMapLayer(layer.key)}
                      />
                      <span className="map-layer-toggle__text">
                        <strong>{layer.label}</strong>
                        <span>{layer.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <WorldMap
            world={result?.world}
            onPoiClick={handlePoiClick}
            activePoiId={activePoiId}
            familiarityMap={familiarityMap}
            originLabel={originLabel}
            ghostTraces={ghostTraces}
            visibleLayers={visibleMapLayers}
          />
        </div>

        <div className="storyboard-shell-bottom">
          <div className="storyboard-lane">
            <div className="storyboard-lane-header">
              <span className="storyboard-category-label">探索引导</span>
              <span className="storyboard-lane-meta">按 2D 世界地图的方式进入，而不是读表单</span>
            </div>
            {result?.world_id ? (
              <WorldDensityIndicator
                sliceId={result.world_id}
                playerId={writebackForm.playerId}
                lat={form.lat}
                lon={form.lon}
                onEvent={handleOrchestrationEvent}
              />
            ) : null}
            <div className="shared-task-grid">
              <article className={`shared-task-card shared-task-card--gen${result ? ' is-done' : submitting ? ' is-loading' : ''}`}>
                <span className="shared-task-index">00</span>
                <div className="shared-task-gen-body">
                  <h3>{result ? formatTagLabel(result.region_theme, '世界已生成') : '生成当前切片'}</h3>
                  <p className="shared-task-gen-meta">
                    {result
                      ? `${result.poi_count ?? 0} 个节点 · ${result.road_count ?? 0} 条路径 · ${formatTagLabel(result.dominant_faction, '未知势力')}`
                      : `${originLabel} · ${form.radius}m · ${form.mode === 'fixture' ? '离线样例' : '实时地图'}`
                    }
                  </p>
                  {!result ? (
                    <div className="shared-task-gen-actions">
                      <button
                        type="button"
                        className="shared-task-gen-btn"
                        disabled={submitting}
                        onClick={() => submitNearby(false)}
                      >
                        {submitting ? '生成中...' : '生成世界'}
                      </button>
                      <button
                        type="button"
                        className="shared-task-gen-btn secondary"
                        disabled={submitting}
                        onClick={() => submitNearby(true)}
                      >
                        刷新
                      </button>
                    </div>
                  ) : (
                    <div className="shared-task-gen-actions">
                      <button
                        type="button"
                        className="shared-task-gen-btn secondary"
                        disabled={submitting}
                        onClick={() => submitNearby(true)}
                      >
                        {submitting ? '刷新中...' : '重新生成'}
                      </button>
                    </div>
                  )}
                </div>
              </article>
              <article className={`shared-task-card${resolvedActivePoi ? ' is-active' : ''}`}>
                <span className="shared-task-index">01</span>
                <div>
                  <h3>选一个据点</h3>
                  <p>{resolvedActivePoi ? `${resolvedActivePoi.fantasy_name} 已成为当前主据点。` : '先在地图上点击一个节点，把它变成你这次进入世界的主据点。'}</p>
                </div>
              </article>
              <article className="shared-task-card">
                <span className="shared-task-index">02</span>
                <div>
                  <h3>读地图气氛</h3>
                  <p>{resolvedActivePoi?.satire_hook || '悬停节点先读名字、阵营、钩子，再决定往哪一块世界深入。'}</p>
                </div>
              </article>
              <article className="shared-task-card">
                <span className="shared-task-index">03</span>
                <div>
                  <h3>留下你的动静</h3>
                  <p>{writebackResult ? `最近一次观察已经落在 ${writebackResult?.event?.target?.target_id || writebackForm.targetId || '当前地点'}。` : '点“驻足观察”，把这次进入留成地点的第一层痕迹。'}</p>
                </div>
              </article>
              <article className="shared-task-card shared-task-card--visibility">
                <span className="shared-task-index">04</span>
                <div>
                  <h3>决定这次写回留在哪一层</h3>
                  <p>{selectedVisibilityMeta.title} · {selectedVisibilityMeta.hint}</p>
                </div>
              </article>
            </div>

            <div className="storyboard-lane poi-filter-lane">
              <div className="storyboard-lane-header">
                <span className="storyboard-category-label">POI 搜索与筛选</span>
                <span className="storyboard-lane-meta">不必在地图上逐个试点，可以先缩小候选节点范围</span>
              </div>

              <div className="poi-filter-toolbar">
                <label className="poi-filter-field poi-filter-field--search">
                  <span>搜索词</span>
                  <input
                    type="text"
                    value={poiSearch}
                    onChange={(event) => setPoiSearch(event.target.value)}
                    placeholder="输入地点名、钩子、势力或 POI ID"
                  />
                </label>

                <label className="poi-filter-field">
                  <span>地点类型</span>
                  <select value={poiTypeFilter} onChange={(event) => setPoiTypeFilter(event.target.value)}>
                    <option value="all">全部类型</option>
                    {poiTypeOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="poi-filter-field">
                  <span>所属势力</span>
                  <select value={poiFactionFilter} onChange={(event) => setPoiFactionFilter(event.target.value)}>
                    <option value="all">全部势力</option>
                    {poiFactionOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="poi-filter-toggle">
                  <input
                    type="checkbox"
                    checked={poiOnlyFamiliar}
                    onChange={(event) => setPoiOnlyFamiliar(event.target.checked)}
                  />
                  <span>只看已积累熟悉度的节点</span>
                </label>

                <button
                  type="button"
                  className="secondary poi-filter-reset"
                  onClick={() => {
                    setPoiSearch('')
                    setPoiTypeFilter('all')
                    setPoiFactionFilter('all')
                    setPoiOnlyFamiliar(false)
                  }}
                  disabled={!poiSearch && poiTypeFilter === 'all' && poiFactionFilter === 'all' && !poiOnlyFamiliar}
                >
                  清空筛选
                </button>
              </div>

              <div className="poi-filter-summary-row">
                <span className="poi-filter-summary">{poiSearchSummary}</span>
                {resolvedActivePoi ? (
                  <span className="poi-filter-summary poi-filter-summary--active">
                    当前主据点：{resolvedActivePoi.fantasy_name}
                  </span>
                ) : null}
              </div>

              {result ? (
                filteredWorldPois.length ? (
                  <div className="poi-filter-results">
                    {filteredWorldPois.slice(0, 12).map((poi) => {
                      const isActive = poi.id === resolvedActivePoi?.id
                      const familiarity = familiarityMap?.[poi.id] ?? 0
                      return (
                        <button
                          key={poi.id}
                          type="button"
                          className={`poi-filter-card${isActive ? ' is-active' : ''}`}
                          onClick={() => handlePoiClick(poi.id, poi)}
                        >
                          <div className="poi-filter-card-top">
                            <strong>{poi.fantasy_name || poi.real_name || poi.id}</strong>
                            <span>{getPoiTypeLabel(poi)}</span>
                          </div>
                          <p>{poi.satire_hook || poi.emotion_hook || '这个节点暂时还没有公开钩子。'}</p>
                          <div className="poi-filter-card-meta">
                            <span>{getPoiFactionLabel(poi)}</span>
                            <span>familiarity · {familiarity}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="storyboard-placeholder-card poi-filter-empty">
                    <strong>没有符合条件的 POI</strong>
                    <p>当前搜索词或筛选条件没有匹配到节点。可以先放宽类型、势力或熟悉度限制。</p>
                  </div>
                )
              ) : (
                <div className="storyboard-placeholder-card poi-filter-empty">
                  <strong>等待世界切片生成</strong>
                  <p>生成当前切片后，这里会出现可搜索、可筛选、可快速选中的 POI 列表。</p>
                </div>
              )}
            </div>

            {orchestrationEvents.length ? (
              <div className="storyboard-lane orchestration-lane">
                <div className="storyboard-lane-header">
                  <span className="storyboard-category-label">编排事件</span>
                  <span className="storyboard-lane-meta">世界编排器正在根据当前切片与你的位置发出信号</span>
                </div>
                <div className="orchestration-event-grid">
                  {orchestrationEvents.map((event, index) => (
                    <article key={`${event.type}-${event.priority}-${index}`} className="orchestration-event-card">
                      <strong>{event.type || 'unknown_event'}</strong>
                      <span>priority · {event.priority ?? '-'}</span>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {result?.world_id ? (
              <div className="storyboard-lane">
                <div className="storyboard-lane-header">
                  <span className="storyboard-category-label">人为扰动注入</span>
                  <span className="storyboard-lane-meta">向当前切片注入天气、人流等外部信号，影响编排器输出</span>
                </div>
                <div className="writeback-form-grid">
                  <div>
                    <label>天气</label>
                    <select value={disturbanceForm.weather} onChange={(e) => setDisturbanceForm((f) => ({ ...f, weather: e.target.value }))}>
                      <option value="">不覆盖</option>
                      <option value="sunny">晴天</option>
                      <option value="rainy">雨天</option>
                      <option value="foggy">雾天</option>
                      <option value="cloudy">多云</option>
                    </select>
                  </div>
                  <div>
                    <label>人流密度 (0-1)</label>
                    <input type="number" min="0" max="1" step="0.1" value={disturbanceForm.crowd_density} onChange={(e) => setDisturbanceForm((f) => ({ ...f, crowd_density: e.target.value }))} placeholder="0.0 - 1.0" />
                  </div>
                  <div>
                    <label>交通强度 (0-1)</label>
                    <input type="number" min="0" max="1" step="0.1" value={disturbanceForm.traffic_level} onChange={(e) => setDisturbanceForm((f) => ({ ...f, traffic_level: e.target.value }))} placeholder="0.0 - 1.0" />
                  </div>
                  <div>
                    <label>特殊事件标签</label>
                    <select value={disturbanceForm.event_tag} onChange={(e) => setDisturbanceForm((f) => ({ ...f, event_tag: e.target.value }))}>
                      <option value="">无</option>
                      <option value="festival">节庆</option>
                      <option value="holiday">假日</option>
                      <option value="anomaly_detected">异常信号</option>
                      <option value="special_event">特殊事件</option>
                    </select>
                  </div>
                </div>
                <div className="actions">
                  <button type="button" disabled={disturbanceSubmitting} onClick={submitDisturbance}>注入扰动</button>
                  {disturbanceActive ? <button type="button" onClick={clearDisturbance}>清除扰动</button> : null}
                </div>
                {disturbanceActive ? (
                  <div className="subtle-block">当前扰动：{JSON.stringify(disturbanceActive)}</div>
                ) : null}
              </div>
            ) : null}

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
          </div>

          <div className="storyboard-lane">
            <div className="storyboard-lane-header">
              <span className="storyboard-category-label">当前舞台卡</span>
              <span className="storyboard-lane-meta">把选中的地点当成 RPG 世界节点来看</span>
            </div>
            {resolvedActivePoi ? (
              <div className="storyboard-stage-stack">
                <div className="poi-detail-bar storyboard-poi-bar">
                  <span className="poi-detail-name">{resolvedActivePoi.fantasy_name}</span>
                  <span className="poi-detail-type muted">{formatTagLabel(resolvedActivePoi.fantasy_type, '未分类地点')}</span>
                  <span className="poi-detail-satire">{resolvedActivePoi.satire_hook}</span>
                  <span className="poi-detail-emotion muted">{resolvedActivePoi.emotion_hook}</span>
                </div>

                <div className="writeback-action-panel">
                  <div className="writeback-action-header">
                    <div>
                      <p className="mini-label">P6 · 写回动作</p>
                      <h3>在主舞台直接触发观察 / 驻足 / 标记</h3>
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

                  {writebackTimeline.length ? (
                    <div className="writeback-structured-panel">
                      <div className="writeback-structured-header">
                        <div>
                          <p className="mini-label">结构化状态变化</p>
                          <h3>本次写回已经产生可验证的状态链路</h3>
                        </div>
                        <span className="writeback-persistence-badge">{writebackResult?.persistence?.stored_event_count ?? 0} stored events</span>
                      </div>

                      <div className={`writeback-revisit-banner${revisitSummary.sameSlice ? ' is-valid' : ''}`}>
                        <div>
                          <strong>{revisitSummary.sameSlice ? '回访验证成功' : '等待同一 slice 回访验证'}</strong>
                          <p>
                            {revisitSummary.sameSlice
                              ? `当前切片 ${revisitSummary.currentSliceId} 与最近一次写回目标一致，说明这次进入仍然挂着你上次留下的痕迹。`
                              : `最近写回记录来自 ${revisitSummary.persistedSliceId || '未知 slice'}，当前切片为 ${revisitSummary.currentSliceId || '尚未生成'}。重新进入同一 slice 时，这里会继续显示残留痕迹。`}
                          </p>
                        </div>
                        <div className="writeback-revisit-stats">
                          <span>last_event={revisitSummary.lastEventType}</span>
                          <span>familiarity={revisitSummary.familiarity}</span>
                          <span>stored_events={revisitSummary.storedEvents}</span>
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
                      <strong>等待第一次主舞台写回</strong>
                      <p>先在上方选择 observe、dwell 或 mark，然后直接把动作提交到 /api/world/event。这里会显示玩家状态、地点状态、世界反馈与持久化结果。</p>
                    </div>
                  )}

                  <div className="behavior-insight-panel">
                    <div className="writeback-visibility-header behavior-insight-header">
                      <div>
                        <p className="mini-label">AIO4 · 行为到意义</p>
                        <h3>这段行动正在形成怎样的玩家含义</h3>
                      </div>
                      <span className="writeback-persistence-badge">{behaviorInsights?.dominant_meaning || 'waiting_trace'}</span>
                    </div>
                    {behaviorInsights ? (
                      <>
                        <p className="writeback-visibility-summary">
                          myth entry · {behaviorInsights.myth_entry || 'unnamed_drifter'} · dominant district · {behaviorInsights.dominant_district || 'unknown'}
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
                        <span className="d3-entry-pill">渲染方式 · {behaviorInsights.scene_capsule.render_mode || 'toast'}</span>
                        <span className="d3-entry-pill">持续时间 · {behaviorInsights.scene_capsule.ttl_seconds ?? behaviorInsights.scene_capsule.decay_turns ?? '-'}</span>
                        {behaviorInsights.scene_capsule.is_fallback && (
                          <span className="d3-entry-pill muted">回退内容</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="storyboard-placeholder-card">
                <strong>等待你选中第一块地图据点</strong>
                <p>这张地图应该像 2D 游戏世界入口，而不是静态平面图。先点一个地点，右侧信息就会变成你的当前舞台卡。</p>
                {writebackResult && lastWritebackPoiId ? (
                  <button type="button" className="storyboard-inline-btn" onClick={focusWritebackTarget}>
                    回到上次写回目标
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
