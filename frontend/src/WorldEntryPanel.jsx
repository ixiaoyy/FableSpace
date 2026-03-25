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
          <p className="mini-label">步骤 1</p>
          <h2>选择入口并生成世界</h2>
        </div>
        <p className="note muted">
          优先用人类能理解的入口，再把坐标与种子折叠为高级选项。
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
        <button type="button" className="secondary" disabled={locating} onClick={useCurrentLocation}>
          {locating ? '定位中...' : '用我的当前位置'}
        </button>
        <button type="button" disabled={submitting} onClick={() => submitNearby(false)}>
          {submitting ? '生成中...' : '生成世界预览'}
        </button>
        <button type="button" className="secondary" disabled={submitting} onClick={() => submitNearby(true)}>
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
