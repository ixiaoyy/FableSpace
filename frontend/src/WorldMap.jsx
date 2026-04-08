import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { preloadWorldMapAssets } from './worldMap/assets.js'
import { DEFAULT_MAP_LAYERS, getFactionColors, getPalette } from './worldMap/config.js'
import {
  buildRoadOccupancy,
  getViewBounds,
  getViewConfig,
  hasRoadNearby,
  tileToCanvas as projectTileToCanvas,
} from './worldMap/geometry.js'
import { getPoiHitFromEvent } from './worldMap/interactions.js'
import WorldMapOverlays from './worldMap/WorldMapOverlays.jsx'
import {
  drawFactionZones,
  drawGhostTraces,
  drawLabels,
  drawLandmarks,
  drawLegendChips,
  drawMapBackdrop,
  drawPois,
  drawRipples,
  drawRoads,
} from './worldMap/renderers.js'

export default function WorldMap({
  world,
  onPoiClick,
  activePoiId,
  familiarityMap,
  originLabel,
  ghostTraces = [],
  visibleLayers = DEFAULT_MAP_LAYERS,
}) {
  const canvasRef = useRef(null)
  const [hovered, setHovered] = useState(null)
  const [ripples, setRipples] = useState([])

  const map2d = world?.map2d
  const region = world?.region
  const pois = world?.pois || []
  const vibe = region?.vibe_profile || 'quiet_rain'
  const palette = getPalette(vibe)
  const fam = familiarityMap || {}
  const layers = { ...DEFAULT_MAP_LAYERS, ...(visibleLayers || {}) }

  const tileGrid = map2d?.tile_grid || { columns: 32, rows: 24, tile_size: 16 }
  const poiNodes = map2d?.renderables?.pois || []
  const roadNodes = map2d?.renderables?.roads || []
  const landmarkNodes = map2d?.renderables?.landmarks || []
  const spawnId = map2d?.navigation?.spawn_node

  const poiMap = useMemo(() => new Map(pois.map((poi) => [poi.id, poi])), [pois])
  const rankedNodes = useMemo(() => {
    return [...poiNodes].sort((a, b) => {
      const poiA = poiMap.get(a.id)
      const poiB = poiMap.get(b.id)
      const scoreA = (a.id === activePoiId ? 50 : 0) + (a.id === spawnId ? 20 : 0) + (poiA?.secret_slot ? 10 : 0) + (fam[a.id] || 0)
      const scoreB = (b.id === activePoiId ? 50 : 0) + (b.id === spawnId ? 20 : 0) + (poiB?.secret_slot ? 10 : 0) + (fam[b.id] || 0)
      return scoreB - scoreA
    })
  }, [poiNodes, poiMap, activePoiId, spawnId, fam])

  const activePoi = activePoiId ? poiMap.get(activePoiId) || null : null
  const hoveredPoi = hovered ? poiMap.get(hovered) || null : null
  const hoveredFaction = hoveredPoi ? getFactionColors(hoveredPoi.faction_alignment) : null
  const featuredPoi = activePoi || hoveredPoi || poiMap.get(spawnId) || poiMap.get(rankedNodes[0]?.id) || null
  const featuredFaction = featuredPoi ? getFactionColors(featuredPoi.faction_alignment) : null
  const presentFactions = [...new Set(pois.map((poi) => poi.faction_alignment).filter(Boolean))]
  const focusNode = activePoiId
    ? poiNodes.find((node) => node.id === activePoiId) || null
    : poiNodes.find((node) => node.id === spawnId) || rankedNodes[0] || poiNodes[0] || null
  const viewBounds = useMemo(() => getViewBounds({ poiNodes, landmarkNodes, roadNodes }), [poiNodes, landmarkNodes, roadNodes])
  const viewConfig = useMemo(() => getViewConfig({ tileGrid, focusNode, viewBounds }), [focusNode, tileGrid, viewBounds])

  const triggerRipple = useCallback((x, y) => {
    const id = Date.now()
    setRipples((prev) => [...prev, { id, x, y, born: Date.now() }])
    setTimeout(() => setRipples((prev) => prev.filter((ripple) => ripple.id !== id)), 900)
  }, [])

  const tileToCanvas = useCallback(
    (tx, ty, w, h) => projectTileToCanvas(tx, ty, w, h, tileGrid, viewConfig),
    [tileGrid, viewConfig],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !map2d) return

    let disposed = false

    async function drawWorld() {
      const ctx = canvas.getContext('2d')
      const W = canvas.width
      const H = canvas.height
      const cellW = W / tileGrid.columns
      const cellH = H / tileGrid.rows
      const roadOccupancy = buildRoadOccupancy(roadNodes)
      const waterSeeds = poiNodes
        .filter((node, index) => ((node.tile_position?.x || 0) + (node.tile_position?.y || 0) + index) % 5 === 0)
        .slice(0, 3)
      const blockSeeds = poiNodes.flatMap((node, index) => {
        const tx = Number(node.tile_position?.x)
        const ty = Number(node.tile_position?.y)
        if (!Number.isFinite(tx) || !Number.isFinite(ty)) return []

        const clusterOffsets = [
          { x: -2, y: -1 },
          { x: 2, y: -1 },
          { x: -1, y: 2 },
          { x: 2, y: 2 },
        ]

        return clusterOffsets
          .map((offset, offsetIndex) => {
            const gx = Math.round(tx + offset.x + ((index + offsetIndex) % 2 === 0 ? 0 : 1))
            const gy = Math.round(ty + offset.y + ((index + offsetIndex) % 3 === 0 ? 1 : 0))
            if (gx < 1 || gy < 1 || gx > tileGrid.columns - 2 || gy > tileGrid.rows - 2) return null
            if (hasRoadNearby(roadOccupancy, gx, gy, 1)) return null
            return { x: gx, y: gy, seed: index * 10 + offsetIndex }
          })
          .filter(Boolean)
      })
      const roadsideStructures = roadNodes.flatMap((road, roadIndex) => {
        const points = road.points || []
        if (points.length < 2) return []

        return points.flatMap((point, pointIndex) => {
          if (pointIndex % 2 !== 0) return []
          const tx = Number(point.x)
          const ty = Number(point.y)
          if (!Number.isFinite(tx) || !Number.isFinite(ty)) return []

          const options = [
            { x: tx - 1.4, y: ty - 1.1, w: 16, h: 10, roof: 5 },
            { x: tx + 1.5, y: ty + 1.0, w: 18, h: 11, roof: 5 },
          ]

          return options
            .map((item, sideIndex) => {
              const gx = Math.round(item.x)
              const gy = Math.round(item.y)
              if (gx < 1 || gy < 1 || gx > tileGrid.columns - 2 || gy > tileGrid.rows - 2) return null
              if (hasRoadNearby(roadOccupancy, gx, gy, 0)) return null
              return {
                ...item,
                seed: roadIndex * 100 + pointIndex * 10 + sideIndex,
              }
            })
            .filter(Boolean)
        })
      })

      const { assetIcons, assetBuildings, assetDecorations } = await preloadWorldMapAssets(vibe)

      if (disposed) return

      drawMapBackdrop({
        ctx,
        W,
        H,
        roadNodes,
        waterSeeds,
        blockSeeds,
        roadsideStructures,
        cellW,
        cellH,
        tileToCanvas,
      })

      if (layers.factionZones) {
        drawFactionZones({ ctx, poiNodes, poiMap, tileToCanvas, W, H })
      }

      if (layers.roads) {
        drawRoads({ ctx, roadNodes, tileToCanvas, W, H })
      }

      if (layers.landmarks) {
        drawLandmarks({ ctx, landmarkNodes, tileToCanvas, W, H })
      }

      if (layers.pois) {
        drawPois({
          ctx,
          poiNodes,
          poiMap,
          tileToCanvas,
          W,
          H,
          cellW,
          cellH,
          palette,
          activePoiId,
          hovered,
          fam,
          assetIcons,
          assetBuildings,
          assetDecorations,
        })
      }

      if (layers.labels) {
        drawLabels({ ctx, rankedNodes, poiMap, tileToCanvas, activePoiId, palette, W, H })
      }

      if (layers.legend) {
        drawLegendChips({ ctx, roadNodes, poiNodes, landmarkNodes, originLabel, H })
      }

      if (layers.ghostTraces && ghostTraces.length > 0) {
        drawGhostTraces({ ctx, ghostTraces, poiNodes, tileToCanvas, palette, W, H })
      }

      drawRipples({ ctx, ripples })
  }

    drawWorld()
    return () => {
      disposed = true
    }
  }, [map2d, tileGrid, roadNodes, poiNodes, rankedNodes, spawnId, palette, hovered, activePoiId, ripples, poiMap, fam, landmarkNodes, vibe, layers, ghostTraces])

  useEffect(() => {
    if (ripples.length === 0) return
    const raf = requestAnimationFrame(() => setRipples((current) => [...current]))
    return () => cancelAnimationFrame(raf)
  }, [ripples])

  function handleMouseMove(event) {
    const canvas = canvasRef.current
    const { hit } = getPoiHitFromEvent({
      event,
      canvas,
      poiNodes,
      tileGrid,
      viewConfig,
      layers,
    })
    setHovered(hit ? hit.id : null)
  }

  function handleClick(event) {
    const canvas = canvasRef.current
    const { pointer, hit } = getPoiHitFromEvent({
      event,
      canvas,
      poiNodes,
      tileGrid,
      viewConfig,
      layers,
    })
    if (!pointer || !hit) return
    triggerRipple(pointer.x, pointer.y)
    onPoiClick && onPoiClick(hit.id, poiMap.get(hit.id))
  }

  if (!map2d) {
    return (
      <div className="map-empty">
        <p>生成世界切片后，这里会显示地图。</p>
      </div>
    )
  }

  return (
    <div
      className="world-map-wrap"
      style={{
        '--map-bg': palette.bg,
        '--map-node': palette.node,
        '--map-glow': palette.glow,
        '--map-panel': palette.panel,
      }}
    >
      <WorldMapOverlays
        region={region}
        vibe={vibe}
        originLabel={originLabel}
        roadNodes={roadNodes}
        poiNodes={poiNodes}
        landmarkNodes={landmarkNodes}
        layers={layers}
        hoveredPoi={hoveredPoi}
        hoveredFaction={hoveredFaction}
        activePoi={activePoi}
        featuredPoi={featuredPoi}
        featuredFaction={featuredFaction}
        presentFactions={presentFactions}
        rankedNodes={rankedNodes}
      />

      <canvas
        ref={canvasRef}
        width={960}
        height={600}
        className={`world-canvas cursor-${hovered ? 'pointer' : 'default'}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        onClick={handleClick}
      />
    </div>
  )
}
