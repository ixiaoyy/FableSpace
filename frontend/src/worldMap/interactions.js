import { findPoiAtPoint, getCanvasPointer } from './geometry.js'

export function getPoiHitFromEvent({
  event,
  canvas,
  poiNodes,
  tileGrid,
  viewConfig,
  layers,
}) {
  if (!canvas || !layers?.pois) {
    return { pointer: null, hit: null }
  }

  const pointer = getCanvasPointer(event, canvas)
  const hit = findPoiAtPoint({
    mx: pointer.x,
    my: pointer.y,
    poiNodes,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    tileGrid,
    viewConfig,
  })

  return { pointer, hit }
}
