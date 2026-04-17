import { formatCoordinates } from './services/appDisplay'

export default function WorldEntryPanel({
  lastSessionAt,
  originLabel,
  originHint,
  form,
  locationPresets,
  presetMeta,
  usePreset,
  locating,
  autoEntering,
  useCurrentLocation,
  submitting,
  submitNearby,
  advancedOpen,
  setAdvancedOpen,
  updateForm,
  errorText,
  result,
}) {
  const primaryActionText = autoEntering
    ? '正在读取附近地点...'
    : submitting
      ? '正在刷新附近内容...'
      : '查看附近地点与酒馆'

  const primaryActionHint = autoEntering
    ? '系统正在根据当前位置准备附近地点和酒馆入口，请稍候。'
    : submitting
      ? '正在刷新当前位置附近的地图内容，完成后会直接更新下方区域。'
      : result
        ? '附近内容已经准备好；往下可以直接选择地点或进入酒馆。'
        : '点击主按钮后，会按当前入口和范围显示附近地点与酒馆。'

  const actionStatusChip = autoEntering || submitting
    ? '刷新中'
    : result
      ? '已准备'
      : '待开始'

  return (
    <section className="panel primary-panel world-entry-panel">
      <div className="section-heading">
        <div>
          <p className="mini-label">附近入口</p>
          <h2>{autoEntering ? '正在根据定位读取附近内容' : '先确定你想从哪里开始'}</h2>
        </div>
        <p className="note muted">
          首次进入会优先尝试浏览器定位；你也可以使用预设地点或手动调整范围。
          {lastSessionAt ? ` 已恢复上次记录：${new Date(lastSessionAt).toLocaleString()}` : ''}
        </p>
      </div>

      <div className="origin-card">
        <div className="origin-card-copy">
          <strong>{originLabel}</strong>
          <p className="note muted">{originHint}</p>
        </div>
        <div className="origin-card-meta">
          <span>{formatCoordinates(form.lat, form.lon)}</span>
          <span>{form.radius}m 半径</span>
        </div>
      </div>

      <div className={`world-entry-panel__action-brief${autoEntering || submitting ? ' is-pending' : result ? ' is-ready' : ''}`} aria-live="polite">
        <div className="world-entry-panel__action-brief-header">
          <span className="mini-label">当前进入动作</span>
          <span className="world-entry-panel__status-chip">{actionStatusChip}</span>
        </div>
        <strong>{primaryActionText}</strong>
        <p className="note muted">{primaryActionHint}</p>
      </div>

      <div className="preset-grid">
        {locationPresets.map((preset) => {
          const active = preset.id === presetMeta?.id
          return (
            <button
              key={preset.id}
              type="button"
              className={`preset-card${active ? ' active' : ''}`}
              onClick={() => usePreset(preset)}
            >
              <span className="preset-title">{preset.title}</span>
              <span className="preset-subtitle">{preset.subtitle}</span>
              <span className="preset-meta">{preset.mode === 'fixture' ? '离线演示' : '实时地图'} · {preset.radius}m</span>
            </button>
          )
        })}
      </div>

      <div className="origin-actions origin-actions--primary-first">
        <button type="button" className="origin-actions__primary" disabled={submitting || autoEntering} onClick={() => submitNearby(false)}>
          {primaryActionText}
        </button>
        <div className="actions origin-actions__secondary-row">
          <button type="button" className="secondary" disabled={locating || autoEntering} onClick={() => useCurrentLocation()}>
            {locating || autoEntering ? '定位中...' : '重新定位'}
          </button>
          <button type="button" className="secondary" disabled={submitting || autoEntering} onClick={() => submitNearby(true)}>
            刷新附近内容
          </button>
        </div>
      </div>

      <button
        type="button"
        className="ghost-toggle"
        onClick={() => setAdvancedOpen((current) => !current)}
      >
        {advancedOpen ? '收起高级参数' : '展开高级参数'}
      </button>

      {advancedOpen ? (
        <div className="advanced-panel">
          <div className="row">
            <div>
              <label htmlFor="lat">纬度</label>
              <input id="lat" type="number" step="0.000001" value={form.lat} onChange={(event) => updateForm('lat', event.target.value)} />
            </div>
            <div>
              <label htmlFor="lon">经度</label>
              <input id="lon" type="number" step="0.000001" value={form.lon} onChange={(event) => updateForm('lon', event.target.value)} />
            </div>
            <div>
              <label htmlFor="radius">半径（米）</label>
              <input id="radius" type="number" min="1" step="1" value={form.radius} onChange={(event) => updateForm('radius', event.target.value)} />
            </div>
          </div>

          <div className="row-2">
            <div>
              <label htmlFor="mode">地点来源</label>
              <select id="mode" value={form.mode} onChange={(event) => updateForm('mode', event.target.value)}>
                <option value="live">实时 OSM</option>
                <option value="fixture">离线演示样例</option>
              </select>
            </div>
            <div>
              <label htmlFor="seed">种子</label>
              <input id="seed" type="text" placeholder="可选的稳定种子" value={form.seed} onChange={(event) => updateForm('seed', event.target.value)} />
            </div>
          </div>
        </div>
      ) : null}

      {errorText ? <p className="note error-note">{errorText}</p> : null}
    </section>
  )
}
