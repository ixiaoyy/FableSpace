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
}) {
  return (
    <section className="panel primary-panel">
      <div className="section-heading">
        <div>
          <p className="mini-label">自动世界入口</p>
          <h2>{autoEntering ? '正在根据定位进入世界' : '已经为你准备好附近世界'}</h2>
        </div>
        <p className="note muted">
          首次进入会优先尝试浏览器定位并自动生成附近切片；下方控制保留给你重新定位、切换入口和微调参数。
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
              <span className="preset-meta">{preset.mode === 'fixture' ? '离线稳定' : '实时地图'} · {preset.radius}m</span>
            </button>
          )
        })}
      </div>

      <div className="actions origin-actions">
        <button type="button" className="secondary" disabled={locating || autoEntering} onClick={() => useCurrentLocation()}>
          {locating || autoEntering ? '定位中...' : '重新获取我的位置'}
        </button>
        <button type="button" disabled={submitting || autoEntering} onClick={() => submitNearby(false)}>
          {submitting ? '生成中...' : '重新生成附近世界'}
        </button>
        <button type="button" className="secondary" disabled={submitting || autoEntering} onClick={() => submitNearby(true)}>
          刷新实时地图
        </button>
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
              <label htmlFor="mode">世界来源</label>
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
