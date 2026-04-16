import { ROAD_STYLE, formatTag, getFactionColors, getIcon } from './config.js'

function drawPoiClusterHomes(ctx, pos, cellW, cellH, footprint, isActive) {
  const clusterScale = isActive ? 1.08 : 1
  const clusterHomes = [
    { dx: -cellW * 1.78, dy: -cellH * 0.12, w: 28, h: 17, roof: 8, lane: false },
    { dx: -cellW * 0.86, dy: cellH * 0.16, w: 26, h: 16, roof: 8, lane: true },
    { dx: cellW * 0.12, dy: cellH * 0.05, w: 34, h: 21, roof: 10, lane: false },
    { dx: cellW * 1.18, dy: cellH * 0.18, w: 26, h: 16, roof: 8, lane: true },
    { dx: -cellW * 1.08, dy: cellH * 1.08, w: 24, h: 15, roof: 7, lane: false },
    { dx: cellW * 0.08, dy: cellH * 1.22, w: 25, h: 16, roof: 8, lane: true },
    { dx: cellW * 1.16, dy: cellH * 1.06, w: 23, h: 15, roof: 7, lane: false },
  ].slice(0, Math.max(5, Math.min(7, footprint.w + footprint.h + 1)))

  const yardWidth = cellW * 3.35
  const yardHeight = cellH * 2.28
  ctx.fillStyle = isActive ? 'rgba(188, 168, 127, 0.18)' : 'rgba(176, 157, 120, 0.13)'
  ctx.beginPath()
  ctx.roundRect(pos.x - yardWidth / 2, pos.y - cellH * 0.42, yardWidth, yardHeight, 16)
  ctx.fill()

  ctx.strokeStyle = 'rgba(146, 121, 82, 0.16)'
  ctx.lineWidth = 1.1
  ctx.beginPath()
  ctx.moveTo(pos.x - yardWidth * 0.42, pos.y + cellH * 0.56)
  ctx.lineTo(pos.x + yardWidth * 0.42, pos.y + cellH * 0.56)
  ctx.moveTo(pos.x - yardWidth * 0.16, pos.y - cellH * 0.02)
  ctx.lineTo(pos.x - yardWidth * 0.12, pos.y + yardHeight * 0.48)
  ctx.moveTo(pos.x + yardWidth * 0.14, pos.y - cellH * 0.02)
  ctx.lineTo(pos.x + yardWidth * 0.18, pos.y + yardHeight * 0.48)
  ctx.stroke()

  clusterHomes.forEach((home, index) => {
    const w = home.w * clusterScale
    const h = home.h * clusterScale
    const roof = home.roof * clusterScale
    const hx = pos.x + home.dx
    const hy = pos.y + home.dy
    const wallFill = index === 2
      ? 'rgba(222, 201, 166, 0.96)'
      : index % 2 === 0
        ? 'rgba(214, 193, 160, 0.9)'
        : 'rgba(197, 177, 145, 0.88)'
    const roofFill = index === 2
      ? 'rgba(153, 114, 84, 0.9)'
      : index % 2 === 0
        ? 'rgba(142, 108, 80, 0.84)'
        : 'rgba(126, 93, 68, 0.8)'

    ctx.fillStyle = home.lane ? 'rgba(108, 90, 63, 0.16)' : 'rgba(104, 84, 60, 0.14)'
    ctx.beginPath()
    ctx.ellipse(hx, hy + h * 0.68, w * 0.76, h * 0.33, 0, 0, Math.PI * 2)
    ctx.fill()

    if (home.lane) {
      ctx.fillStyle = 'rgba(231, 219, 192, 0.24)'
      ctx.beginPath()
      ctx.roundRect(hx - w * 0.32, hy + h * 0.3, w * 0.64, h * 0.22, 4)
      ctx.fill()
    }

    ctx.fillStyle = wallFill
    ctx.beginPath()
    ctx.roundRect(hx - w / 2, hy - h / 2, w, h, 4)
    ctx.fill()

    ctx.fillStyle = roofFill
    ctx.beginPath()
    ctx.moveTo(hx, hy - h / 2 - roof)
    ctx.lineTo(hx + w / 2 + 1.5, hy - h / 2 + 1)
    ctx.lineTo(hx - w / 2 - 1.5, hy - h / 2 + 1)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = 'rgba(90, 67, 46, 0.18)'
    ctx.lineWidth = 0.9
    ctx.beginPath()
    ctx.moveTo(hx, hy - h / 2 - roof + 1)
    ctx.lineTo(hx, hy + h * 0.44)
    ctx.stroke()

    ctx.fillStyle = 'rgba(246, 236, 214, 0.62)'
    ctx.fillRect(hx - w * 0.26, hy - h * 0.12, 3.2, 4.2)
    ctx.fillRect(hx + w * 0.04, hy - h * 0.12, 3.2, 4.2)
    ctx.fillStyle = 'rgba(120, 84, 54, 0.34)'
    ctx.fillRect(hx - 1.1, hy + h * 0.08, 2.2, h * 0.28)
  })
}

function drawPoiBuildingSprite(ctx, { pos, buildingImage, decoImage, isActive, familiarity, faction, hasSecret, glowColor }) {
  const buildingSize = isActive ? 112 : 86
  const buildingAlpha = isActive ? 0.96 : 0.9 + familiarity * 0.45
  ctx.save()
  ctx.globalAlpha = 0.1
  ctx.drawImage(
    buildingImage,
    pos.x - buildingSize / 2 + 3,
    pos.y - buildingSize * 0.78 + 8,
    buildingSize,
    buildingSize,
  )
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = buildingAlpha
  ctx.drawImage(
    buildingImage,
    pos.x - buildingSize / 2,
    pos.y - buildingSize * 0.82,
    buildingSize,
    buildingSize,
  )
  ctx.restore()

  if (decoImage) {
    const decoSize = isActive ? 36 : 28
    ctx.save()
    ctx.globalAlpha = 0.66
    ctx.drawImage(
      decoImage,
      pos.x + buildingSize * 0.28,
      pos.y - buildingSize * 0.46,
      decoSize,
      decoSize,
    )
    ctx.restore()
  }

  const parcelDots = [
    { dx: -buildingSize * 0.22, dy: 10 },
    { dx: buildingSize * 0.24, dy: 13 },
    { dx: 0, dy: 18 },
  ]
  parcelDots.forEach((dot, index) => {
    ctx.fillStyle = index === 1 ? 'rgba(110, 144, 94, 0.32)' : 'rgba(132, 118, 84, 0.24)'
    ctx.beginPath()
    ctx.arc(pos.x + dot.dx, pos.y + dot.dy, index === 2 ? 2.8 : 2.2, 0, Math.PI * 2)
    ctx.fill()
  })

  if (faction) {
    ctx.beginPath()
    ctx.ellipse(pos.x, pos.y - buildingSize * 0.2, isActive ? 22 : 17, isActive ? 8 : 6, 0, 0, Math.PI * 2)
    ctx.strokeStyle = `${faction.fill}66`
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.24 + familiarity * 0.55
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  if (hasSecret && isActive) {
    ctx.beginPath()
    ctx.arc(pos.x, pos.y - buildingSize * 0.35, 18, 0, Math.PI * 2)
    ctx.strokeStyle = `${glowColor}38`
    ctx.lineWidth = 0.9
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.setLineDash([])
  }
}

function drawPoiFallbackCard(ctx, {
  pos,
  isActive,
  hasSecret,
  faction,
  familiarity,
  glowColor,
  fillColor,
  palette,
  fantasyType,
  assetIcons,
}) {
  const cardWidth = isActive ? 34 : 28
  const cardHeight = isActive ? 28 : 24
  const roofHeight = isActive ? 11 : 9

  if (hasSecret && isActive) {
    ctx.beginPath()
    ctx.arc(pos.x, pos.y - 4, 18, 0, Math.PI * 2)
    ctx.strokeStyle = `${glowColor}55`
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.stroke()
    ctx.setLineDash([])
  }

  if (faction) {
    ctx.beginPath()
    ctx.arc(pos.x, pos.y - 4, isActive ? 22 : 18, 0, Math.PI * 2)
    ctx.strokeStyle = `${faction.fill}66`
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.24 + familiarity * 0.55
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  ctx.fillStyle = '#fff5df'
  ctx.beginPath()
  ctx.roundRect(pos.x - cardWidth / 2, pos.y - cardHeight / 2, cardWidth, cardHeight, 7)
  ctx.fill()

  ctx.fillStyle = 'rgba(132, 118, 84, 0.18)'
  ctx.beginPath()
  ctx.roundRect(pos.x - cardWidth / 2 - 11, pos.y + cardHeight * 0.35, cardWidth + 22, 8, 4)
  ctx.fill()

  ctx.strokeStyle = 'rgba(94, 74, 45, 0.16)'
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.roundRect(pos.x - cardWidth / 2, pos.y - cardHeight / 2, cardWidth, cardHeight, 7)
  ctx.stroke()

  ctx.fillStyle = isActive ? glowColor : fillColor
  ctx.beginPath()
  ctx.moveTo(pos.x, pos.y - cardHeight / 2 - roofHeight)
  ctx.lineTo(pos.x + cardWidth / 2 - 1, pos.y - cardHeight / 2 + 2)
  ctx.lineTo(pos.x - cardWidth / 2 + 1, pos.y - cardHeight / 2 + 2)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(101, 67, 33, 0.32)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(pos.x - cardWidth / 2, pos.y - cardHeight / 2, cardWidth, cardHeight, 7)
  ctx.stroke()

  drawPoiFallbackIcon({
    ctx,
    iconImage: assetIcons.get(fantasyType),
    isActive,
    palette,
    fantasyType,
    pos,
  })
}

export function drawMapBackdrop({
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
}) {
  const backgroundGradient = ctx.createLinearGradient(0, 0, 0, H)
  backgroundGradient.addColorStop(0, '#f3ead8')
  backgroundGradient.addColorStop(0.48, '#eadfca')
  backgroundGradient.addColorStop(1, '#dfd2bb')
  ctx.fillStyle = backgroundGradient
  ctx.fillRect(0, 0, W, H)

  const terrainGlow = ctx.createRadialGradient(W * 0.46, H * 0.24, 24, W * 0.46, H * 0.24, W * 0.88)
  terrainGlow.addColorStop(0, 'rgba(255, 248, 232, 0.10)')
  terrainGlow.addColorStop(0.5, 'rgba(247, 237, 212, 0.05)')
  terrainGlow.addColorStop(1, 'rgba(223, 207, 174, 0.015)')
  ctx.fillStyle = terrainGlow
  ctx.fillRect(0, 0, W, H)

  if (roadNodes.length > 0) {
    const sweep = ctx.createLinearGradient(0, H * 0.18, W, H * 0.82)
    sweep.addColorStop(0, 'rgba(255,255,255,0)')
    sweep.addColorStop(0.5, 'rgba(255,248,236,0.018)')
    sweep.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = sweep
    ctx.fillRect(0, 0, W, H)
  }

  waterSeeds.forEach((node, index) => {
    const tx = Number(node.tile_position?.x) || 0
    const ty = Number(node.tile_position?.y) || 0
    const pos = tileToCanvas(tx + (index - 1) * 1.2, ty + 2.2, W, H)
    const pondW = cellW * (3.8 + index * 0.9)
    const pondH = cellH * (1.5 + (index % 2) * 0.5)
    const pondFill = ctx.createLinearGradient(pos.x, pos.y - pondH, pos.x, pos.y + pondH)
    pondFill.addColorStop(0, 'rgba(158, 193, 205, 0.22)')
    pondFill.addColorStop(1, 'rgba(111, 154, 168, 0.12)')
    ctx.fillStyle = pondFill
    ctx.beginPath()
    ctx.ellipse(pos.x, pos.y, pondW, pondH, -0.12, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = 'rgba(233, 244, 246, 0.24)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.ellipse(pos.x + 1, pos.y - 1, pondW * 0.8, pondH * 0.62, -0.12, 0, Math.PI * 2)
    ctx.stroke()
  })

  blockSeeds.forEach((block) => {
    const pos = tileToCanvas(block.x, block.y, W, H)
    const width = cellW * (0.9 + (block.seed % 3) * 0.3)
    const height = cellH * (0.55 + (block.seed % 2) * 0.18)
    const rotation = ((block.seed % 5) - 2) * 0.08
    ctx.save()
    ctx.translate(pos.x, pos.y)
    ctx.rotate(rotation)

    ctx.fillStyle = block.seed % 2 === 0 ? 'rgba(150, 126, 96, 0.08)' : 'rgba(124, 142, 104, 0.07)'
    ctx.beginPath()
    ctx.roundRect(-width / 2, -height / 2, width, height, 5)
    ctx.fill()

    ctx.strokeStyle = 'rgba(110, 90, 63, 0.08)'
    ctx.lineWidth = 0.8
    ctx.beginPath()
    ctx.moveTo(-width * 0.28, -height / 2)
    ctx.lineTo(-width * 0.28, height / 2)
    ctx.moveTo(width * 0.08, -height / 2)
    ctx.lineTo(width * 0.08, height / 2)
    ctx.stroke()
    ctx.restore()
  })

  roadsideStructures.forEach((home) => {
    const pos = tileToCanvas(home.x, home.y, W, H)
    const w = home.w + (home.seed % 3)
    const h = home.h + (home.seed % 2)
    const roof = home.roof
    ctx.fillStyle = 'rgba(101, 83, 62, 0.12)'
    ctx.beginPath()
    ctx.ellipse(pos.x, pos.y + h * 0.7, w * 0.78, h * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = home.seed % 2 === 0 ? 'rgba(222, 205, 176, 0.92)' : 'rgba(205, 188, 158, 0.9)'
    ctx.beginPath()
    ctx.roundRect(pos.x - w / 2, pos.y - h / 2, w, h, 4)
    ctx.fill()

    ctx.fillStyle = home.seed % 2 === 0 ? 'rgba(145, 110, 81, 0.88)' : 'rgba(128, 98, 74, 0.84)'
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y - h / 2 - roof)
    ctx.lineTo(pos.x + w / 2 + 1, pos.y - h / 2 + 1)
    ctx.lineTo(pos.x - w / 2 - 1, pos.y - h / 2 + 1)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = 'rgba(246, 235, 210, 0.52)'
    ctx.fillRect(pos.x - w * 0.22, pos.y - h * 0.06, 2.8, 3.8)
    if (home.seed % 3 !== 0) {
      ctx.fillRect(pos.x + w * 0.02, pos.y - h * 0.06, 2.8, 3.8)
    }
  })
}

export function drawFactionZones({ ctx, poiNodes, poiMap, tileToCanvas, W, H }) {
  poiNodes.forEach((node) => {
    const poi = poiMap.get(node.id)
    const faction = getFactionColors(poi?.faction_alignment)
    if (!faction) return
    const pos = tileToCanvas(node.tile_position.x, node.tile_position.y, W, H)
    const radius = Math.max(W, H) * 0.11
    const haze = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius)
    haze.addColorStop(0, `${faction.zone}24`)
    haze.addColorStop(0.42, `${faction.zone}10`)
    haze.addColorStop(1, 'transparent')
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
    ctx.fillStyle = haze
    ctx.fill()
  })
}

export function drawRoads({ ctx, roadNodes, tileToCanvas, W, H }) {
  roadNodes.forEach((road) => {
    const points = road.points || []
    if (points.length < 2) return
    const style = ROAD_STYLE[road.kind] || ROAD_STYLE.threshold_path

    ctx.beginPath()
    const start = tileToCanvas(points[0].x, points[0].y, W, H)
    ctx.moveTo(start.x, start.y)
    for (let i = 1; i < points.length; i += 1) {
      const point = tileToCanvas(points[i].x, points[i].y, W, H)
      ctx.lineTo(point.x, point.y)
    }
    ctx.strokeStyle = 'rgba(118, 92, 58, 0.24)'
    ctx.lineWidth = Math.max(style.width + 2.8, 3.2)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    for (let i = 1; i < points.length; i += 1) {
      const point = tileToCanvas(points[i].x, points[i].y, W, H)
      ctx.lineTo(point.x, point.y)
    }
    ctx.strokeStyle = 'rgba(205, 186, 150, 0.68)'
    ctx.lineWidth = Math.max(style.width + 0.9, 1.8)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.setLineDash(style.dash)
    ctx.stroke()
    ctx.setLineDash([])
  })
}

export function drawLandmarks({ ctx, landmarkNodes, tileToCanvas, W, H }) {
  landmarkNodes.forEach((node) => {
    const pos = tileToCanvas(node.tile_position.x, node.tile_position.y, W, H)
    ctx.save()
    ctx.translate(pos.x, pos.y)

    ctx.fillStyle = 'rgba(33, 15, 68, 0.24)'
    ctx.beginPath()
    ctx.ellipse(0, 15, 18, 7, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#6ee7f9'
    ctx.beginPath()
    ctx.moveTo(0, -16)
    ctx.lineTo(10, 0)
    ctx.lineTo(0, 12)
    ctx.lineTo(-10, 0)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#e0f2fe'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()
  })
}

export function drawLabels({ ctx, rankedNodes, poiMap, tileToCanvas, activePoiId, palette, W, H }) {
  rankedNodes.slice(0, 8).forEach((node, index) => {
    const poi = poiMap.get(node.id)
    if (!poi) return
    const pos = tileToCanvas(node.tile_position.x, node.tile_position.y, W, H)
    const label = poi.real_name || poi.fantasy_name || 'unknown place'
    const districtLabel = formatTag(poi.tags?.[0])
    const isActive = node.id === activePoiId
    const baseY = pos.y - (isActive ? 24 : 20)
    const labelHeight = districtLabel && index < 4 ? 34 : 22
    ctx.font = isActive ? '600 13px sans-serif' : '500 12px sans-serif'
    const primaryWidth = ctx.measureText(label).width
    const secondaryWidth = districtLabel && index < 4 ? ctx.measureText(districtLabel).width : 0
    const width = Math.min(Math.max(Math.max(primaryWidth, secondaryWidth) + 18, 84), 188)
    const x = Math.max(12, Math.min(pos.x - width / 2, W - width - 12))
    const y = Math.max(12, baseY - (labelHeight === 34 ? 18 : 10))
    ctx.fillStyle = 'rgba(58, 47, 33, 0.58)'
    ctx.strokeStyle = isActive ? `${palette.glow}55` : 'rgba(255,248,236,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x, y, width, labelHeight, 8)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = isActive ? '#fff8ee' : '#f6edd9'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + width / 2, y + 11)

    if (districtLabel && index < 4) {
      ctx.font = '500 10px sans-serif'
      ctx.fillStyle = 'rgba(248, 236, 210, 0.76)'
      ctx.fillText(districtLabel, x + width / 2, y + 25)
    }
  })
}

export function drawLegendChips({ ctx, roadNodes, poiNodes, landmarkNodes, originLabel, H }) {
  const chips = [
    roadNodes.length ? `道路 ${roadNodes.length}` : null,
    poiNodes.length ? `地点 ${poiNodes.length}` : null,
    landmarkNodes.length ? `地标 ${landmarkNodes.length}` : null,
    originLabel ? `起点 ${originLabel}` : null,
  ].filter(Boolean)

  chips.slice(0, 4).forEach((chip, index) => {
    const chipWidth = Math.min(Math.max(ctx.measureText(chip).width + 20, 78), 170)
    const x = 18 + index * (chipWidth + 10)
    const y = H - 42
    ctx.fillStyle = 'rgba(82, 67, 49, 0.52)'
    ctx.strokeStyle = 'rgba(255, 245, 228, 0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x, y, chipWidth, 24, 12)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#f8efdc'
    ctx.font = '500 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(chip, x + chipWidth / 2, y + 12)
  })
}

export function drawPois({
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
}) {
  poiNodes.forEach((node) => {
    const pos = tileToCanvas(node.tile_position.x, node.tile_position.y, W, H)
    const poi = poiMap.get(node.id)
    const faction = getFactionColors(poi?.faction_alignment)
    const fillColor = faction?.fill || palette.node
    const glowColor = faction?.glow || palette.glow
    const isActive = node.id === activePoiId
    const isHovered = node.id === hovered
    const hasSecret = Boolean(poi?.secret_slot)
    const familiarity = Math.min((fam[node.id] || 0) * 0.08, 0.45)
    const buildingImage = assetBuildings.get(poi?.fantasy_type)
    const decoImage = assetDecorations.get(poi?.fantasy_type)
    const footprint = node.footprint || { w: 2, h: 2 }

    drawPoiClusterHomes(ctx, pos, cellW, cellH, footprint, isActive)

    ctx.fillStyle = 'rgba(94, 74, 45, 0.22)'
    ctx.beginPath()
    ctx.ellipse(pos.x, pos.y + 18, isActive ? 28 : 24, isActive ? 10 : 8, 0, 0, Math.PI * 2)
    ctx.fill()

    if (buildingImage) {
      drawPoiBuildingSprite(ctx, {
        pos,
        buildingImage,
        decoImage,
        isActive,
        familiarity,
        faction,
        hasSecret,
        glowColor,
      })
      return
    }

    drawPoiFallbackCard(ctx, {
      pos,
      isActive,
      isHovered,
      hasSecret,
      faction,
      familiarity,
      glowColor,
      fillColor,
      palette,
      fantasyType: poi?.fantasy_type,
      assetIcons,
    })
  })
}

export function drawGhostTraces({ ctx, ghostTraces, poiNodes, tileToCanvas, palette, W, H }) {
  const poiNodeMap = new Map(poiNodes.map((n) => [n.id, n]))
  ghostTraces.forEach((trace) => {
    const waypoints = trace?.waypoints || []
    const positions = waypoints
      .map((wp) => {
        const node = poiNodeMap.get(wp?.poi_id)
        if (!node) return null
        return tileToCanvas(node.tile_position.x, node.tile_position.y, W, H)
      })
      .filter(Boolean)
    if (positions.length < 2) return
    ctx.save()
    ctx.globalAlpha = 0.22
    ctx.strokeStyle = `${palette.glow}88`
    ctx.lineWidth = 1.2
    ctx.setLineDash([4, 5])
    ctx.beginPath()
    positions.forEach((pos, i) => {
      if (i === 0) ctx.moveTo(pos.x, pos.y)
      else ctx.lineTo(pos.x, pos.y)
    })
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 0.3
    ctx.fillStyle = `${palette.glow}66`
    ctx.beginPath()
    ctx.arc(positions[0].x, positions[0].y, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `${palette.glow}88`
    ctx.globalAlpha = 0.45
    ctx.beginPath()
    ctx.arc(positions[positions.length - 1].x, positions[positions.length - 1].y, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}

export function drawRipples({ ctx, ripples }) {
  const now = Date.now()
  ripples.forEach((ripple) => {
    const age = (now - ripple.born) / 900
    const radius = age * 46
    const alpha = 1 - age
    ctx.beginPath()
    ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,244,228,${alpha * 0.2})`
    ctx.lineWidth = 1
    ctx.stroke()
  })
}

export function drawPoiFallbackIcon({ ctx, iconImage, isActive, palette, fantasyType, pos }) {
  if (iconImage) {
    const iconSize = isActive ? 22 : 18
    ctx.drawImage(iconImage, pos.x - iconSize / 2, pos.y - iconSize / 2 - 1, iconSize, iconSize)
    return
  }

  ctx.font = isActive ? '16px serif' : '14px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = palette.bg
  ctx.fillText(getIcon(fantasyType), pos.x, pos.y - 1)
}
