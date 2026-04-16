export default function WorldStageDisturbancePanel({
  disturbanceForm,
  setDisturbanceForm,
  disturbanceSubmitting,
  submitDisturbance,
  disturbanceActive,
  clearDisturbance,
}) {
  return (
    <div className="storyboard-lane">
      <div className="storyboard-lane-header">
        <span className="storyboard-category-label">人为扰动注入</span>
        <span className="storyboard-lane-meta">向当前地点切片注入天气、人流等外部信号，影响编排器输出</span>
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
  )
}
