import { useCallback, useState } from 'react'

export function useMapLayerControls({
  defaultVisibleMapLayers,
  mapLayerOptions,
  mapLayerPresets,
  restoredSession,
}) {
  const [visibleMapLayers, setVisibleMapLayers] = useState(
    restoredSession?.visibleLayers || defaultVisibleMapLayers
  )
  const [mapLayerPanelOpen, setMapLayerPanelOpen] = useState(
    typeof restoredSession?.mapLayerPanelOpen === 'boolean'
      ? restoredSession.mapLayerPanelOpen
      : true
  )

  const toggleMapLayer = useCallback((layerKey) => {
    setVisibleMapLayers((current) => ({
      ...current,
      [layerKey]: !current[layerKey],
    }))
  }, [])

  const setAllMapLayers = useCallback((nextValue) => {
    setVisibleMapLayers(
      mapLayerOptions.reduce((acc, layer) => {
        acc[layer.key] = nextValue
        return acc
      }, {})
    )
  }, [mapLayerOptions])

  const resetMapLayers = useCallback(() => {
    setVisibleMapLayers({ ...defaultVisibleMapLayers })
  }, [defaultVisibleMapLayers])

  const applyMapLayerPreset = useCallback((presetKey) => {
    const preset = mapLayerPresets.find((item) => item.key === presetKey)
    if (!preset) {
      return
    }
    setVisibleMapLayers({ ...preset.layers })
  }, [mapLayerPresets])

  return {
    applyMapLayerPreset,
    mapLayerPanelOpen,
    resetMapLayers,
    setAllMapLayers,
    setMapLayerPanelOpen,
    toggleMapLayer,
    visibleMapLayers,
  }
}
