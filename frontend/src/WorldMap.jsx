import { useEffect, useMemo, useRef, useState } from 'react'
import { getAssetBuildingSrc, getAssetDecorationSrc, getAssetIconSrc, getAssetPack } from './mapAssets/manifest.js'
import { getBuildingKey, getDecorationKey } from './mapAssets/iconMapping.js'
import { loadImage } from './mapAssets/loadImage.js'

const DEFAULT_MAP_LAYERS = {
  roads: true,
  pois: true,
  landmarks: true,
  factionZones: true,
  labels: true,
  legend: true,
  ghostTraces: true,
}

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


function getFactionColors(faction) {
  return FACTION_COLORS[faction] || null
}

const TAG_LABELS_ZH = {
  verdant_district: '绿意城区',
  healing_quarter: '疗愈街区',
  market_quarter: '市集街区',
  bureau_district: '秩序街区',
  scholar_quarter: '学识街区',
  threshold_district: '边界地带',
  trade_guild: '贸易行会',
  order_bureau: '秩序局',
  clinic_circle: '诊疗环',
  memory_collective: '记忆共社',
  night_bloom: '夜绽社',
  ghibli_town: '绿野町',
  quiet_rain: '静雨',
  neon_nostalgia: '霓虹怀旧',
  amber_evening: '琥珀夜色',
  iron_blue: '铁蓝',
  chalk_dawn: '粉笔黎明',
  whispering_grove: '低语林苑',
  healing_sanctum: '疗愈圣所',
  supply_outpost: '补给站',
  judgement_tower: '裁定塔',
  ember_parlor: '余烬馆',
  lore_academy: '学识堂',
  debt_cathedral: '债务堂',
  feast_hall: '宴飨厅',
  refuel_station: '补能站',
  memory_archive: '记忆档案馆',
  spirit_sanctum: '灵息圣所',
  dormant_lot: '静置空场',
  remedy_post: '疗护铺',
  labor_forge: '劳作工坊',
  contract_spire: '契约尖塔',
}

function formatTag(value) {
  if (!value) return '未分类'
  return TAG_LABELS_ZH[value] || value.replace(/_/g, ' ')
}

function formatCount(count, unit) {
  return `${count} ${unit}`
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
  const assetPack = useMemo(() => getAssetPack(vibe), [vibe])
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

  const labeledNodeIds = useMemo(() => new Set(rankedNodes.slice(0, 6).map((node) => node.id)), [rankedNodes])
  const activePoi = activePoiId ? poiMap.get(activePoiId) || null : null
  const hoveredPoi = hovered ? poiMap.get(hovered) || null : null
  const featuredPoi = activePoi || hoveredPoi || poiMap.get(spawnId) || poiMap.get(rankedNodes[0]?.id) || null
  const featuredFaction = featuredPoi ? getFactionColors(featuredPoi.faction_alignment) : null
  const presentFactions = [...new Set(pois.map((poi) => poi.faction_alignment).filter(Boolean))]
  const focusNode = activePoiId
    ? poiNodes.find((node) => node.id === activePoiId) || null
    : poiNodes.find((node) => node.id === spawnId) || rankedNodes[0] || poiNodes[0] || null
  const viewBounds = useMemo(() => {
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
  }, [poiNodes, landmarkNodes, roadNodes])
  const viewConfig = useMemo(() => {
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
  }, [focusNode, tileGrid.columns, tileGrid.rows, viewBounds])

  function triggerRipple(x, y) {
    const id = Date.now()
    setRipples((prev) => [...prev, { id, x, y, born: Date.now() }])
    setTimeout(() => setRipples((prev) => prev.filter((ripple) => ripple.id !== id)), 900)
  }

  function tileToCanvas(tx, ty, w, h) {
    const normalizedX = tx / Math.max(tileGrid.columns - 1, 1)
    const normalizedY = ty / Math.max(tileGrid.rows - 1, 1)
    const px = (normalizedX - viewConfig.centerX) * w * viewConfig.zoom + w * (0.5 + viewConfig.offsetX)
    const py = (normalizedY - viewConfig.centerY) * h * viewConfig.zoom + h * (0.5 + viewConfig.offsetY)
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

      const iconEntries = await Promise.all(
        Object.entries(ICON_MAP).map(async ([fantasyType]) => {
          const src = getAssetIconSrc(vibe, fantasyType)
          const image = await loadImage(src).catch(() => null)
          return [fantasyType, image]
        }),
      )

      // 预加载建筑 sprite（每种 fantasyType 对应一个建筑类型键名）
      const buildingEntries = await Promise.all(
        Object.entries(ICON_MAP).map(async ([fantasyType]) => {
          const buildingKey = getBuildingKey(fantasyType)
          const src = buildingKey ? getAssetBuildingSrc(vibe, buildingKey) : null
          const image = src ? await loadImage(src).catch(() => null) : null
          return [fantasyType, image]
        }),
      )

      // 预加载装饰 sprite
      const decoEntries = await Promise.all(
        Object.entries(ICON_MAP).map(async ([fantasyType]) => {
          const decoKey = getDecorationKey(fantasyType)
          const src = decoKey ? getAssetDecorationSrc(vibe, decoKey) : null
          const image = src ? await loadImage(src).catch(() => null) : null
          return [fantasyType, image]
        }),
      )

      if (disposed) return
      const assetIcons = new Map(iconEntries)
      const assetBuildings = new Map(buildingEntries)
      const assetDecorations = new Map(decoEntries)

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

    if (layers.factionZones) {
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

    const spawnNode = poiNodes.find((node) => node.id === spawnId) || rankedNodes[0]

    if (layers.roads) {
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

    if (layers.landmarks) {
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

    if (layers.pois) {
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
        const buildingImage = assetBuildings.get(poi?.fantasy_type)
        const decoImage = assetDecorations.get(poi?.fantasy_type)
        const hasBuildingSprite = Boolean(buildingImage)
        const footprint = node.footprint || { w: 2, h: 2 }
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

        // 地面投影椭圆
        ctx.fillStyle = 'rgba(94, 74, 45, 0.22)'
        ctx.beginPath()
        ctx.ellipse(pos.x, pos.y + 18, isActive ? 28 : 24, isActive ? 10 : 8, 0, 0, Math.PI * 2)
        ctx.fill()

        // 建筑 sprite 层：有图片时直接渲染建筑图，替代向量房屋
        if (hasBuildingSprite) {
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

          // 环境装饰 sprite（树/路灯），绘制在建筑右侧稍偏后
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

          // 阵营光环边框（覆盖在建筑上方）
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
        } else {
          // 无建筑 sprite 时保留原向量绘制路径（降级）
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
        }
      })
    }

    if (layers.labels) {
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

    if (layers.legend) {
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

    if (layers.ghostTraces && ghostTraces.length > 0) {
      const poiNodeMap = new Map(poiNodes.map((n) => [n.id, n]))
      ghostTraces.forEach((trace) => {
        const waypoints = trace?.waypoints || []
        const positions = waypoints
          .map((wp) => {
            const node = poiNodeMap.get(wp?.poi_id)
            if (!node) return null
            return tileToCanvas(Number(node.x), Number(node.y), W, H)
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
        // draw start dot
        ctx.setLineDash([])
        ctx.globalAlpha = 0.3
        ctx.fillStyle = `${palette.glow}66`
        ctx.beginPath()
        ctx.arc(positions[0].x, positions[0].y, 3, 0, Math.PI * 2)
        ctx.fill()
        // draw end dot
        ctx.fillStyle = `${palette.glow}88`
        ctx.globalAlpha = 0.45
        ctx.beginPath()
        ctx.arc(positions[positions.length - 1].x, positions[positions.length - 1].y, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })
    }

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

    drawWorld()
    return () => {
      disposed = true
    }
  }, [map2d, tileGrid, roadNodes, poiNodes, rankedNodes, spawnId, palette, hovered, activePoiId, ripples, poiMap, fam, landmarkNodes, assetPack, vibe, layers, ghostTraces])

  useEffect(() => {
    if (ripples.length === 0) return
    const raf = requestAnimationFrame(() => setRipples((current) => [...current]))
    return () => cancelAnimationFrame(raf)
  }, [ripples])

  function getPoiAtPoint(mx, my, W, H) {
    if (!layers.pois) {
      return null
    }

    return poiNodes.find((node) => {
      const pos = tileToCanvas(node.tile_position.x, node.tile_position.y, W, H)
      const dx = pos.x - mx
      const dy = pos.y - my
      return Math.sqrt(dx * dx + dy * dy) <= 28
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
      <div className="map-sky-glow" />
      <div className="map-overlay map-overlay-top">
        <div className="map-biome-banner">
          <span className="map-biome-kicker">FableMap 世界切片</span>
          <strong>{formatTag(region?.theme || vibe)}</strong>
          <span>{originLabel || '附近切片'} · {formatCount(poiNodes.length, '个地点')} · {formatCount(landmarkNodes.length, '个地标')}</span>
        </div>
        <div className="map-chip-row">
          <div className="map-chip">{formatTag(vibe)}</div>
          {layers.roads ? <div className="map-chip">{formatCount(roadNodes.length, '条道路')}</div> : null}
          {layers.pois ? <div className="map-chip">{formatCount(poiNodes.length, '个地点')}</div> : null}
          {layers.landmarks ? <div className="map-chip">{formatCount(landmarkNodes.length, '个地标')}</div> : null}
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

      {layers.pois && hoveredPoi ? (
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

      {layers.pois && featuredPoi ? (
        <div className="map-sidecar">
          <div className="map-sidecar-kicker">{activePoi ? '当前关注点' : '建议进入点'}</div>
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
            {featuredPoi.secret_slot ? <span className="map-sidecar-chip">隐藏槽位</span> : null}
          </div>

          <p className="map-sidecar-copy">{featuredPoi.satire_hook}</p>
          {featuredPoi.emotion_hook ? <p className="map-sidecar-subcopy">{featuredPoi.emotion_hook}</p> : null}
          {featuredPoi.rumor_hook ? <p className="map-sidecar-rumor">{featuredPoi.rumor_hook}</p> : null}
        </div>
      ) : null}

      {layers.legend ? (
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
      ) : null}

      <div className="map-bottom-dock">
        {layers.roads ? (
          <div className="map-dock-item">
            <span className="map-dock-icon">🗺️</span>
            <div>
              <strong>{roadNodes.length}</strong>
              <span>道路</span>
            </div>
          </div>
        ) : null}
        {layers.pois ? (
          <div className="map-dock-item">
            <span className="map-dock-icon">🏠</span>
            <div>
              <strong>{poiNodes.length}</strong>
              <span>地点</span>
            </div>
          </div>
        ) : null}
        {layers.landmarks ? (
          <div className="map-dock-item">
            <span className="map-dock-icon">💎</span>
            <div>
              <strong>{landmarkNodes.length}</strong>
              <span>地标</span>
            </div>
          </div>
        ) : null}
      </div>

      {layers.labels && labeledNodeIds.size > 0 ? <div className="map-caption">二维世界切片 · 点击任一地点可将其设为当前舞台卡片。</div> : null}
    </div>
  )
}
