export function buildRoadOccupancy(roadNodes) {
  const occupied = new Set()
  roadNodes.forEach((road) => {
    ;(road.points || []).forEach((pt) => {
      if (Number.isFinite(pt?.x) && Number.isFinite(pt?.y)) {
        occupied.add(`${Math.round(pt.x)}:${Math.round(pt.y)}`)
      }
    })
  })
  return occupied
}

export function hasRoadNearby(occupied, x, y, radius = 1) {
  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      if (occupied.has(`${x + dx}:${y + dy}`)) {
        return true
      }
    }
  }
  return false
}

export function getViewBounds({ poiNodes, landmarkNodes, roadNodes }) {
  const primaryPoints = poiNodes.map((node) => node.tile_position).filter(Boolean)
  const secondaryPoints = landmarkNodes.map((node) => node.tile_position).filter(Boolean)
  const fallbackPoints = roadNodes.flatMap((road) => road.points || []).filter(Boolean)
  const points = primaryPoints.length ? primaryPoints : secondaryPoints.length ? secondaryPoints : fallbackPoints

  if (!points.length) {
    return null
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  points.forEach((point) => {
    const x = Number(point.x) || 0
    const y = Number(point.y) || 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  })

  return { minX, minY, maxX, maxY }
}

export function getViewConfig({ tileGrid, focusNode, viewBounds }) {
  const maxX = Math.max(tileGrid.columns - 1, 1)
  const maxY = Math.max(tileGrid.rows - 1, 1)
  const fallbackCenterX = (focusNode?.tile_position?.x ?? maxX / 2) / maxX
  const fallbackCenterY = (focusNode?.tile_position?.y ?? maxY / 2) / maxY

  if (!viewBounds) {
    return {
      zoom: 1.5,
      centerX: fallbackCenterX,
      centerY: fallbackCenterY,
      offsetX: 0,
      offsetY: 0.02,
    }
  }

  const spanX = Math.max(viewBounds.maxX - viewBounds.minX, 3)
  const spanY = Math.max(viewBounds.maxY - viewBounds.minY, 3)
  const boundedSpanX = Math.min(spanX, maxX)
  const boundedSpanY = Math.min(spanY, maxY)
  const paddedSpanX = Math.max(6, boundedSpanX * 0.72)
  const paddedSpanY = Math.max(5, boundedSpanY * 0.74)
  const zoomX = maxX / Math.max(paddedSpanX, 1)
  const zoomY = maxY / Math.max(paddedSpanY, 1)
  const focusWeightX = focusNode?.tile_position?.x != null ? Number(focusNode.tile_position.x) * 0.18 : 0
  const focusWeightY = focusNode?.tile_position?.y != null ? Number(focusNode.tile_position.y) * 0.18 : 0
  const centerTileX = ((viewBounds.minX + viewBounds.maxX) * 0.5 + focusWeightX) / 1.18
  const centerTileY = ((viewBounds.minY + viewBounds.maxY) * 0.5 + focusWeightY) / 1.18

  return {
    zoom: Math.max(1.7, Math.min(3.4, Math.min(zoomX, zoomY))),
    centerX: Math.max(0.12, Math.min(0.88, centerTileX / maxX)),
    centerY: Math.max(0.12, Math.min(0.88, centerTileY / maxY)),
    offsetX: 0,
    offsetY: 0.03,
  }
}

export function tileToCanvas(tx, ty, w, h, tileGrid, viewConfig) {
  const normalizedX = tx / Math.max(tileGrid.columns - 1, 1)
  const normalizedY = ty / Math.max(tileGrid.rows - 1, 1)
  const px = (normalizedX - viewConfig.centerX) * w * viewConfig.zoom + w * (0.5 + viewConfig.offsetX)
  const py = (normalizedY - viewConfig.centerY) * h * viewConfig.zoom + h * (0.5 + viewConfig.offsetY)
  return { x: px, y: py }
}

export function getCanvasPointer(event, canvas) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  }
}

export function findPoiAtPoint({
  mx,
  my,
  poiNodes,
  canvasWidth,
  canvasHeight,
  tileGrid,
  viewConfig,
  radius = 28,
}) {
  return poiNodes.find((node) => {
    const pos = tileToCanvas(node.tile_position.x, node.tile_position.y, canvasWidth, canvasHeight, tileGrid, viewConfig)
    const dx = pos.x - mx
    const dy = pos.y - my
    return Math.sqrt(dx * dx + dy * dy) <= radius
  })
}
