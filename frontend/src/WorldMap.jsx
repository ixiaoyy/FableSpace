import { useEffect, useMemo, useRef, useState } from 'react'
import { getAssetIconSrc, getAssetPack } from './mapAssets/manifest.js'

const ICON_MAP = {
  whispering_grove: '🌿',
  healing_sanctum: '✚',
  supply_outpost: '📦',
  judgement_tower: '🏛',
  ember_parlor: '☕',
  lore_academy: '📚',
  debt_cathedral: '🏦',
  feast_hall: '🍽',
  refuel_station: '⚡',
  memory_archive: '🗄',
  spirit_sanctum: '🕯',
  dormant_lot: '🅿',
  remedy_post: '💊',
  labor_forge: '💪',
  contract_spire: '🏢',
}

const FACTION_COLORS = {
  trade_guild: { fill: '#d97706', glow: '#fbbf24', zone: '#7c2d12' },
  order_bureau: { fill: '#3b82f6', glow: '#93c5fd', zone: '#172554' },
  clinic_circle: { fill: '#14b8a6', glow: '#5eead4', zone: '#134e4a' },
  memory_collective: { fill: '#8b5cf6', glow: '#c4b5fd', zone: '#3b0764' },
  night_bloom: { fill: '#10b981', glow: '#6ee7b7', zone: '#052e16' },
}

const ROAD_STYLE = {
  iron_lane: { width: 5, alpha: 0.9, dash: [], glow: 12 },
  trade_route: { width: 4, alpha: 0.8, dash: [], glow: 10 },
  market_street: { width: 3, alpha: 0.68, dash: [], glow: 8 },
  lantern_lane: { width: 2.4, alpha: 0.55, dash: [], glow: 5 },
  threshold_path: { width: 1.5, alpha: 0.34, dash: [7, 5], glow: 0 },
  ritual_path: { width: 1.2, alpha: 0.28, dash: [3, 7], glow: 0 },
}

const VIBE_PALETTE = {
  ghibli_town: {
    bg: '#0f1b12',
    panel: 'rgba(12, 25, 18, 0.84)',
    road: '#7dd3a7',
    avenue: '#dcfce7',
    node: '#4ade80',
    glow: '#bbf7d0',
    ink: '#effef4',
    label: '#d1fae5',
    block: 'rgba(53, 84, 60, 0.34)',
    blockAlt: 'rgba(32, 52, 36, 0.3)',
    grid: 'rgba(255,255,255,0.05)',
  },
  quiet_rain: {
    bg: '#09111d',
    panel: 'rgba(9, 17, 29, 0.84)',
    road: '#60a5fa',
    avenue: '#dbeafe',
    node: '#7dd3fc',
    glow: '#bfdbfe',
    ink: '#f8fbff',
    label: '#dbeafe',
    block: 'rgba(30, 41, 59, 0.46)',
    blockAlt: 'rgba(15, 23, 42, 0.38)',
    grid: 'rgba(255,255,255,0.06)',
  },
  neon_nostalgia: {
    bg: '#14091f',
    panel: 'rgba(20, 9, 31, 0.84)',
    road: '#c084fc',
    avenue: '#f5d0fe',
    node: '#e879f9',
    glow: '#f5d0fe',
    ink: '#fdf4ff',
    label: '#f5d0fe',
    block: 'rgba(76, 29, 149, 0.32)',
    blockAlt: 'rgba(45, 11, 67, 0.34)',
    grid: 'rgba(255,255,255,0.06)',
  },
  amber_evening: {
    bg: '#1a1200',
    panel: 'rgba(26, 18, 0, 0.84)',
    road: '#f59e0b',
    avenue: '#fef3c7',
    node: '#fbbf24',
    glow: '#fde68a',
    ink: '#fffaf0',
    label: '#fef3c7',
    block: 'rgba(120, 53, 15, 0.34)',
    blockAlt: 'rgba(69, 26, 3, 0.34)',
    grid: 'rgba(255,255,255,0.05)',
  },
  iron_blue: {
    bg: '#081019',
    panel: 'rgba(8, 16, 25, 0.84)',
    road: '#94a3b8',
    avenue: '#e2e8f0',
    node: '#cbd5e1',
    glow: '#f8fafc',
    ink: '#f8fafc',
    label: '#e2e8f0',
    block: 'rgba(30, 41, 59, 0.4)',
    blockAlt: 'rgba(15, 23, 42, 0.34)',
    grid: 'rgba(255,255,255,0.05)',
  },
  chalk_dawn: {
    bg: '#151610',
    panel: 'rgba(21, 22, 16, 0.84)',
    road: '#d6d3b0',
    avenue: '#faf7d4',
    node: '#f1efc2',
    glow: '#f8f6dc',
    ink: '#fffef2',
    label: '#f8f6dc',
    block: 'rgba(64, 63, 43, 0.38)',
    blockAlt: 'rgba(38, 39, 27, 0.34)',
    grid: 'rgba(255,255,255,0.05)',
  },
}

const DEFAULT_PALETTE = {
  bg: '#0f172a',
  panel: 'rgba(15, 23, 42, 0.84)',
  road: '#64748b',
  avenue: '#e2e8f0',
  node: '#94a3b8',
  glow: '#cbd5e1',
  ink: '#f8fafc',
  label: '#e2e8f0',
  block: 'rgba(30, 41, 59, 0.42)',
  blockAlt: 'rgba(15, 23, 42, 0.36)',
  grid: 'rgba(255,255,255,0.05)',
}

function getPalette(vibe) {
  return VIBE_PALETTE[vibe] || DEFAULT_PALETTE
}

function getIcon(fantasyType) {
  return ICON_MAP[fantasyType] || '◆'
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(null)
      return
    }
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function getFactionColors(faction) {
  return FACTION_COLORS[faction] || null
}

function formatTag(value) {
  return value ? value.replace(/_/g, ' ') : 'unclassified'
}

function buildRoadOccupancy(roadNodes) {
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

function hasRoadNearby(occupied, x, y, radius = 1) {
  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      if (occupied.has(`${x + dx}:${y + dy}`)) {
        return true
      }
    }
  }
  return false
}

export default function WorldMap({ world, onPoiClick, activePoiId, familiarityMap, originLabel }) {
  const canvasRef = useRef(null)
  const [hovered, setHovered] = useState(null)
  const [ripples, setRipples] = useState([])

  const map2d = world?.map2d
  const region = world?.region
  const pois = world?.pois || []
  const vibe = region?.vibe_profile || 'quiet_rain'
  const palette = getPalette(vibe)
  const assetPack = useMemo(() => getAssetPack(vibe), [vibe])
  const fam = familiarityMap || {}

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

  const labeledNodeIds = useMemo(() => new Set(rankedNodes.slice(0, 6).map((node) => node.id)), [rankedNodes])
  const activePoi = activePoiId ? poiMap.get(activePoiId) || null : null
  const hoveredPoi = hovered ? poiMap.get(hovered) || null : null
  const featuredPoi = activePoi || hoveredPoi || poiMap.get(spawnId) || poiMap.get(rankedNodes[0]?.id) || null
  const featuredFaction = featuredPoi ? getFactionColors(featuredPoi.faction_alignment) : null
  const presentFactions = [...new Set(pois.map((poi) => poi.faction_alignment).filter(Boolean))]

  function triggerRipple(x, y) {
    const id = Date.now()
    setRipples((prev) => [...prev, { id, x, y, born: Date.now() }])
    setTimeout(() => setRipples((prev) => prev.filter((ripple) => ripple.id !== id)), 900)
  }

  function tileToCanvas(tx, ty, w, h) {
    const px = (tx / Math.max(tileGrid.columns - 1, 1)) * w
    const py = (ty / Math.max(tileGrid.rows - 1, 1)) * h
    return { x: px, y: py }
  }

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

      const sceneImage = await loadImage(assetPack.scene).catch(() => null)
      const iconEntries = await Promise.all(
        Object.entries(ICON_MAP).map(async ([fantasyType]) => {
          const src = getAssetIconSrc(vibe, fantasyType)
          const image = await loadImage(src).catch(() => null)
          return [fantasyType, image]
        }),
      )
      if (disposed) return
      const assetIcons = new Map(iconEntries)

      const backgroundGradient = ctx.createLinearGradient(0, 0, 0, H)
      backgroundGradient.addColorStop(0, '#f8eedb')
      backgroundGradient.addColorStop(0.18, palette.glow)
      backgroundGradient.addColorStop(0.45, palette.bg)
      backgroundGradient.addColorStop(1, '#08111d')
      ctx.fillStyle = backgroundGradient
      ctx.fillRect(0, 0, W, H)

      if (sceneImage) {
        ctx.save()
        ctx.globalAlpha = 0.32
        ctx.drawImage(sceneImage, 0, 0, W, H)
        ctx.restore()
      }

      const sunGlow = ctx.createRadialGradient(W * 0.5, H * 0.14, 24, W * 0.5, H * 0.14, W * 0.46)
      sunGlow.addColorStop(0, 'rgba(255,247,220,0.92)')
      sunGlow.addColorStop(0.38, `${palette.glow}55`)
      sunGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = sunGlow
      ctx.fillRect(0, 0, W, H)

      const vignette = ctx.createRadialGradient(W * 0.5, H * 0.42, 90, W * 0.5, H * 0.42, Math.max(W, H) * 0.78)
      vignette.addColorStop(0, 'transparent')
      vignette.addColorStop(1, 'rgba(11,16,24,0.42)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = palette.grid
    ctx.lineWidth = 1
    for (let col = 0; col <= tileGrid.columns; col += 2) {
      ctx.beginPath()
      ctx.moveTo(col * cellW, 0)
      ctx.lineTo(col * cellW, H)
      ctx.stroke()
    }
    for (let row = 0; row <= tileGrid.rows; row += 2) {
      ctx.beginPath()
      ctx.moveTo(0, row * cellH)
      ctx.lineTo(W, row * cellH)
      ctx.stroke()
    }

    for (let col = 0; col < tileGrid.columns - 1; col += 2) {
      for (let row = 0; row < tileGrid.rows - 1; row += 2) {
        if (hasRoadNearby(roadOccupancy, col, row, 1)) continue
        const insetX = cellW * 0.12
        const insetY = cellH * 0.16
        const px = col * cellW + insetX
        const py = row * cellH + insetY
        const bw = cellW * 1.74
        const bh = cellH * 1.58
        const radius = Math.min(cellW, cellH) * 0.42
        const fill = (col + row) % 4 === 0 ? palette.block : palette.blockAlt
        ctx.fillStyle = fill
        ctx.beginPath()
        ctx.roundRect(px, py, bw, bh, radius)
        ctx.fill()

        ctx.fillStyle = 'rgba(255,255,255,0.05)'
        ctx.beginPath()
        ctx.ellipse(px + bw * 0.5, py + bh * 0.28, bw * 0.34, bh * 0.18, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    poiNodes.forEach((node) => {
      const poi = poiMap.get(node.id)
      const faction = getFactionColors(poi?.faction_alignment)
      if (!faction) return
      const pos = tileToCanvas(node.tile_position.x, node.tile_position.y, W, H)
      const radius = Math.max(W, H) * 0.12
      const haze = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius)
      haze.addColorStop(0, `${faction.zone}44`)
      haze.addColorStop(0.45, `${faction.zone}18`)
      haze.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = haze
      ctx.fill()
    })

    const spawnNode = poiNodes.find((node) => node.id === spawnId) || rankedNodes[0]
    if (spawnNode) {
      const pos = tileToCanvas(spawnNode.tile_position.x, spawnNode.tile_position.y, W, H)
      const radius = Math.max(W, H) * 0.26
      const halo = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius)
      halo.addColorStop(0, `${palette.glow}22`)
      halo.addColorStop(1, 'transparent')
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2)
      ctx.fillStyle = halo
      ctx.fill()
    }

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
      if (style.glow) {
        ctx.strokeStyle = `${palette.glow}20`
        ctx.lineWidth = style.width + style.glow
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      for (let i = 1; i < points.length; i += 1) {
        const point = tileToCanvas(points[i].x, points[i].y, W, H)
        ctx.lineTo(point.x, point.y)
      }
      ctx.strokeStyle = 'rgba(70, 45, 20, 0.28)'
      ctx.lineWidth = style.width + 2.8
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(start.x, start.y)
      for (let i = 1; i < points.length; i += 1) {
        const point = tileToCanvas(points[i].x, points[i].y, W, H)
        ctx.lineTo(point.x, point.y)
      }
      ctx.strokeStyle = style.width >= 4 ? '#f5deb3' : '#dcc08c'
      ctx.globalAlpha = Math.min(style.alpha + 0.12, 1)
      ctx.lineWidth = style.width + 0.9
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.setLineDash(style.dash)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
    })

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
      const cardWidth = isActive ? 34 : 28
      const cardHeight = isActive ? 28 : 24
      const roofHeight = isActive ? 11 : 9

      if (isActive || isHovered) {
        const glow = ctx.createRadialGradient(pos.x, pos.y - 6, 8, pos.x, pos.y - 6, isActive ? 54 : 38)
        glow.addColorStop(0, `${glowColor}aa`)
        glow.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(pos.x, pos.y - 6, isActive ? 54 : 38, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()
      }

      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)'
      ctx.beginPath()
      ctx.ellipse(pos.x, pos.y + 16, isActive ? 22 : 18, isActive ? 8 : 6, 0, 0, Math.PI * 2)
      ctx.fill()

      if (hasSecret) {
        ctx.beginPath()
        ctx.arc(pos.x, pos.y - 4, isActive ? 26 : 21, 0, Math.PI * 2)
        ctx.strokeStyle = `${glowColor}77`
        ctx.lineWidth = 1.2
        ctx.setLineDash([4, 4])
        ctx.stroke()
        ctx.setLineDash([])
      }

      if (faction) {
        ctx.beginPath()
        ctx.arc(pos.x, pos.y - 4, isActive ? 22 : 18, 0, Math.PI * 2)
        ctx.strokeStyle = `${faction.fill}aa`
        ctx.lineWidth = 1.4
        ctx.globalAlpha = 0.55 + familiarity
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      ctx.fillStyle = '#fff5df'
      ctx.beginPath()
      ctx.roundRect(pos.x - cardWidth / 2, pos.y - cardHeight / 2, cardWidth, cardHeight, 7)
      ctx.fill()

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

      const iconImage = assetIcons.get(poi?.fantasy_type)
      if (iconImage) {
        const iconSize = isActive ? 22 : 18
        ctx.drawImage(iconImage, pos.x - iconSize / 2, pos.y - iconSize / 2 - 1, iconSize, iconSize)
      } else {
        ctx.font = isActive ? '16px serif' : '14px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = palette.bg
        ctx.fillText(getIcon(poi?.fantasy_type), pos.x, pos.y - 1)
      }
    })

    rankedNodes.slice(0, 6).forEach((node) => {
      const poi = poiMap.get(node.id)
      if (!poi) return
      const pos = tileToCanvas(node.tile_position.x, node.tile_position.y, W, H)
      const label = poi.real_name || poi.fantasy_name || 'unknown place'
      const isActive = node.id === activePoiId
      const baseY = pos.y - (isActive ? 24 : 20)
      ctx.font = isActive ? '600 13px sans-serif' : '500 12px sans-serif'
      const width = Math.min(Math.max(ctx.measureText(label).width + 16, 80), 180)
      const x = Math.max(12, Math.min(pos.x - width / 2, W - width - 12))
      const y = Math.max(12, baseY - 10)
      ctx.fillStyle = 'rgba(2, 6, 23, 0.78)'
      ctx.strokeStyle = isActive ? `${palette.glow}99` : 'rgba(255,255,255,0.1)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(x, y, width, 22, 8)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = isActive ? palette.ink : palette.label
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, x + width / 2, y + 11)
    })

    const now = Date.now()
    ripples.forEach((ripple) => {
      const age = (now - ripple.born) / 900
      const radius = age * 46
      const alpha = 1 - age
      ctx.beginPath()
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.55})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
    }

    drawWorld()
    return () => {
      disposed = true
    }
  }, [map2d, tileGrid, roadNodes, poiNodes, rankedNodes, spawnId, palette, hovered, activePoiId, ripples, poiMap, fam, landmarkNodes, assetPack, vibe])

  useEffect(() => {
    if (ripples.length === 0) return
    const raf = requestAnimationFrame(() => setRipples((current) => [...current]))
    return () => cancelAnimationFrame(raf)
  }, [ripples])

  function getPoiAtPoint(mx, my, W, H) {
    return poiNodes.find((node) => {
      const pos = tileToCanvas(node.tile_position.x, node.tile_position.y, W, H)
      const dx = pos.x - mx
      const dy = pos.y - my
      return Math.sqrt(dx * dx + dy * dy) <= 18
    })
  }

  function handleMouseMove(event) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const mx = (event.clientX - rect.left) * scaleX
    const my = (event.clientY - rect.top) * scaleY
    const hit = getPoiAtPoint(mx, my, canvas.width, canvas.height)
    setHovered(hit ? hit.id : null)
  }

  function handleClick(event) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const mx = (event.clientX - rect.left) * scaleX
    const my = (event.clientY - rect.top) * scaleY
    const hit = getPoiAtPoint(mx, my, canvas.width, canvas.height)
    if (!hit) return
    triggerRipple(mx, my)
    onPoiClick && onPoiClick(hit.id, poiMap.get(hit.id))
  }

  if (!map2d) {
    return (
      <div className="map-empty">
        <p>Generate a world slice to see the map.</p>
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
      <div className="map-sky-glow" />
      <div className="map-overlay map-overlay-top">
        <div className="map-biome-banner">
          <span className="map-biome-kicker">FableMap World</span>
          <strong>{region?.theme || formatTag(vibe)}</strong>
          <span>{originLabel || 'Nearby slice'} · {poiNodes.length} places · {landmarkNodes.length} landmarks</span>
        </div>
        <div className="map-chip-row">
          <div className="map-chip">{formatTag(vibe)}</div>
          <div className="map-chip">{roadNodes.length} roads</div>
          <div className="map-chip">{poiNodes.length} places</div>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={960}
        height={600}
        className={`world-canvas cursor-${hovered ? 'pointer' : 'default'}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        onClick={handleClick}
      />

      {hoveredPoi ? (
        <div className="map-tooltip">
          <span className="map-tooltip-icon">{getIcon(hoveredPoi.fantasy_type)}</span>
          <div>
            <strong>{hoveredPoi.real_name || hoveredPoi.fantasy_name}</strong>
            {hoveredPoi.faction_alignment ? (
              <span className="map-tooltip-faction" style={getFactionColors(hoveredPoi.faction_alignment) ? { color: getFactionColors(hoveredPoi.faction_alignment).glow } : undefined}>
                {formatTag(hoveredPoi.faction_alignment)}
              </span>
            ) : null}
            <p>{hoveredPoi.satire_hook}</p>
          </div>
        </div>
      ) : null}

      {featuredPoi ? (
        <div className="map-sidecar">
          <div className="map-sidecar-kicker">{activePoi ? 'Current focus' : 'Suggested entry point'}</div>
          <div className="map-sidecar-title-row">
            <span className="map-sidecar-icon">{getIcon(featuredPoi.fantasy_type)}</span>
            <div>
              <h3>{featuredPoi.real_name || featuredPoi.fantasy_name}</h3>
              <p>{featuredPoi.fantasy_name}</p>
            </div>
          </div>

          <div className="map-sidecar-chip-row">
            <span className="map-sidecar-chip">{formatTag(featuredPoi.fantasy_type)}</span>
            {featuredPoi.faction_alignment ? (
              <span className="map-sidecar-chip" style={featuredFaction ? { borderColor: `${featuredFaction.glow}66`, color: featuredFaction.glow } : undefined}>
                {formatTag(featuredPoi.faction_alignment)}
              </span>
            ) : null}
            {featuredPoi.secret_slot ? <span className="map-sidecar-chip">hidden slot</span> : null}
          </div>

          <p className="map-sidecar-copy">{featuredPoi.satire_hook}</p>
          {featuredPoi.emotion_hook ? <p className="map-sidecar-subcopy">{featuredPoi.emotion_hook}</p> : null}
          {featuredPoi.rumor_hook ? <p className="map-sidecar-rumor">{featuredPoi.rumor_hook}</p> : null}
        </div>
      ) : null}

      <div className="map-legend">
        {presentFactions.map((faction) => {
          const colors = getFactionColors(faction)
          return colors ? (
            <span key={faction} className="map-legend-faction">
              <span className="map-legend-swatch" style={{ background: colors.fill }} />
              {formatTag(faction)}
            </span>
          ) : null
        })}
      </div>

      <div className="map-bottom-dock">
        <div className="map-dock-item">
          <span className="map-dock-icon">🗺️</span>
          <div>
            <strong>{roadNodes.length}</strong>
            <span>Roads</span>
          </div>
        </div>
        <div className="map-dock-item">
          <span className="map-dock-icon">🏠</span>
          <div>
            <strong>{poiNodes.length}</strong>
            <span>Settlements</span>
          </div>
        </div>
        <div className="map-dock-item">
          <span className="map-dock-icon">💎</span>
          <div>
            <strong>{landmarkNodes.length}</strong>
            <span>Landmarks</span>
          </div>
        </div>
      </div>

      {labeledNodeIds.size > 0 ? <div className="map-caption">2D world slice · click a settlement to turn it into your current stage card.</div> : null}
    </div>
  )
}
