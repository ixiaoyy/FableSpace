export default function WorldStageMapLayerToolbar({
  mapLayerPanelOpen,
  setMapLayerPanelOpen,
  visibleMapLayers,
  mapLayerOptions,
  mapLayerPresets,
  applyMapLayerPreset,
  setAllMapLayers,
  resetMapLayers,
  toggleMapLayer,
  label = '图层控制器',
  copy = '按需折叠地点骨架、标签与残影，同时保留当前地点视图。',
  className = 'map-layer-toolbar',
}) {
  return (
    <div
      className={`${className}${mapLayerPanelOpen ? '' : ' is-collapsed'}`}
      role="group"
      aria-label="地点图层控制器"
    >
      <div className="map-layer-toolbar__header">
        <div>
          <span className="storyboard-category-label">{label}</span>
          <p className="map-layer-toolbar__copy">{copy}</p>
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
            {mapLayerPanelOpen ? '收起控制器' : '图层'}
          </button>
        </div>
      </div>
      {mapLayerPanelOpen ? (
        <div id="map-layer-toolbar-panel" className="map-layer-toolbar__panel">
          <div className="map-layer-preset-row" role="toolbar" aria-label="地点图层预设">
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
  )
}
