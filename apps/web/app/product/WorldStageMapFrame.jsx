import WorldMap from './WorldMap'
import WorldStageMapLayerToolbar from './WorldStageMapLayerToolbar'

export default function WorldStageMapFrame({
  className = 'storyboard-map-frame',
  mapLayerPanelOpen,
  setMapLayerPanelOpen,
  visibleMapLayers,
  mapLayerOptions,
  mapLayerPresets,
  applyMapLayerPreset,
  setAllMapLayers,
  resetMapLayers,
  toggleMapLayer,
  world,
  onPoiClick,
  activePoiId,
  familiarityMap,
  originLabel,
  ghostTraces,
  toolbarLabel,
  toolbarCopy,
  toolbarClassName,
  spaces = [],
  totalSpaceMatches = spaces.length,
  spaceMarkerLimit = 0,
  onSpaceClick,
  activeSpaceId,
  territories = [],
}) {
  return (
    <div className={className}>
      <WorldStageMapLayerToolbar
        mapLayerPanelOpen={mapLayerPanelOpen}
        setMapLayerPanelOpen={setMapLayerPanelOpen}
        visibleMapLayers={visibleMapLayers}
        mapLayerOptions={mapLayerOptions}
        mapLayerPresets={mapLayerPresets}
        applyMapLayerPreset={applyMapLayerPreset}
        setAllMapLayers={setAllMapLayers}
        resetMapLayers={resetMapLayers}
        toggleMapLayer={toggleMapLayer}
        label={toolbarLabel}
        copy={toolbarCopy}
        className={toolbarClassName}
      />
      <WorldMap
        world={world}
        onPoiClick={onPoiClick}
        activePoiId={activePoiId}
        familiarityMap={familiarityMap}
        originLabel={originLabel}
        ghostTraces={ghostTraces}
        visibleLayers={visibleMapLayers}
        spaces={spaces}
        totalSpaceMatches={totalSpaceMatches}
        spaceMarkerLimit={spaceMarkerLimit}
        onSpaceClick={onSpaceClick}
        activeSpaceId={activeSpaceId}
        territories={territories}
      />
    </div>
  )
}
