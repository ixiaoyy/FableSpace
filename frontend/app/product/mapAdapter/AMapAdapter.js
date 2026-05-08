import { MapAdapter } from './MapAdapter'
import { buildMapAnchorMarkerCopy } from '../mapAnchorCopy'

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE
const AMAP_SRC = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`

const TAVERN_ACCESS_MARKER_THEME = {
  public: {
    icon: '🔓',
    label: '公开',
    accent: '#22c55e',
    border: 'rgba(34,197,94,0.86)',
    background: 'linear-gradient(135deg,rgba(5,46,22,0.94),rgba(22,101,52,0.96))',
    activeBackground: 'linear-gradient(135deg,#15803d,#22c55e)',
    text: '#dcfce7',
    activeText: '#f0fdf4',
    shadow: 'rgba(34,197,94,0.32)',
  },
  password: {
    icon: '🔒',
    label: '密令',
    accent: '#f59e0b',
    border: 'rgba(245,158,11,0.9)',
    background: 'linear-gradient(135deg,rgba(69,26,3,0.94),rgba(146,64,14,0.96))',
    activeBackground: 'linear-gradient(135deg,#b45309,#f59e0b)',
    text: '#fef3c7',
    activeText: '#fff7ed',
    shadow: 'rgba(245,158,11,0.34)',
  },
  private: {
    icon: '👤',
    label: '私人',
    accent: '#e11d48',
    border: 'rgba(225,29,72,0.86)',
    background: 'linear-gradient(135deg,rgba(76,5,25,0.94),rgba(159,18,57,0.96))',
    activeBackground: 'linear-gradient(135deg,#be123c,#e11d48)',
    text: '#ffe4e6',
    activeText: '#fff1f2',
    shadow: 'rgba(225,29,72,0.34)',
  },
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getTavernAccessMarkerTheme(access) {
  return TAVERN_ACCESS_MARKER_THEME[access] || {
    icon: '❓',
    label: '未知',
    accent: '#94a3b8',
    border: 'rgba(148,163,184,0.72)',
    background: 'linear-gradient(135deg,rgba(30,41,59,0.94),rgba(71,85,105,0.96))',
    activeBackground: 'linear-gradient(135deg,#475569,#64748b)',
    text: '#e2e8f0',
    activeText: '#f8fafc',
    shadow: 'rgba(148,163,184,0.28)',
  }
}

// Territory type to color mapping
const TERRITORY_TYPE_COLORS = {
  tavern: '#FFD700',
  pet_shop: '#FF69B4',
  garden: '#32CD32',
  game_workshop: '#4169E1',
  gacha: '#9932CC',
  cultivation: '#8B4513',
  shop: '#FFD700',
  warehouse: '#808080',
}

function getTerritoryCircleColor(type) {
  return TERRITORY_TYPE_COLORS[type] || '#94a3b8'
}

function buildPoiMarkerContent({ poi, isActive, familiarity }) {
  const label = poi?.fantasy_name || poi?.real_name || poi?.id || '未命名地点'
  return `
    <div style="
      display:flex;
      align-items:center;
      gap:8px;
      padding:8px 12px;
      border-radius:999px;
      border:1px solid ${isActive ? 'rgba(59,130,246,0.95)' : 'rgba(15,23,42,0.22)'};
      background:${isActive ? 'linear-gradient(135deg,#1d4ed8,#2563eb)' : 'rgba(255,255,255,0.96)'};
      color:${isActive ? '#eff6ff' : '#0f172a'};
      box-shadow:0 10px 24px rgba(15,23,42,0.18);
      white-space:nowrap;
      font:600 12px/1.2 Segoe UI,Arial,sans-serif;
    ">
      <span style="
        width:10px;
        height:10px;
        border-radius:50%;
        background:${isActive ? '#fef3c7' : '#2563eb'};
        box-shadow:0 0 0 3px ${isActive ? 'rgba(255,255,255,0.18)' : 'rgba(37,99,235,0.16)'};
      "></span>
      <span>${label}</span>
      <span style="opacity:${familiarity > 0 ? '1' : '0.68'};font-weight:700;">熟悉度 ${familiarity}</span>
    </div>
  `
}

function buildLandmarkMarkerContent(landmark) {
  return `
    <div style="
      display:flex;
      align-items:center;
      gap:6px;
      padding:6px 10px;
      border-radius:999px;
      background:rgba(15,23,42,0.88);
      border:1px solid rgba(251,191,36,0.42);
      color:#fef3c7;
      box-shadow:0 8px 20px rgba(15,23,42,0.2);
      white-space:nowrap;
      font:600 12px/1.2 Segoe UI,Arial,sans-serif;
    ">
      <span>◆</span>
      <span>${landmark?.name || landmark?.id || '地标'}</span>
    </div>
  `
}

function buildTavernMarkerContent({ tavern, isActive }) {
  const accessTheme = getTavernAccessMarkerTheme(tavern?.access)
  const statusColor = tavern?.status === 'open' ? '#22c55e' : '#ef4444'
  const copy = buildMapAnchorMarkerCopy(tavern)
  const label = escapeHtml(copy.name)
  const badgeLabel = escapeHtml(copy.badgeLabel)
  const statusText = escapeHtml(copy.statusText)
  const title = escapeHtml(copy.title)

  return `
    <div style="
      display:flex;
      align-items:center;
      gap:8px;
      padding:8px 10px;
      border-radius:8px;
      border:1px solid ${isActive ? accessTheme.accent : accessTheme.border};
      background:${isActive ? accessTheme.activeBackground : accessTheme.background};
      color:${isActive ? accessTheme.activeText : accessTheme.text};
      box-shadow:0 8px 24px ${accessTheme.shadow};
      white-space:nowrap;
      font:600 12px/1.2 Segoe UI,Arial,sans-serif;
    " title="${title}">
      <span style="
        display:inline-flex;
        align-items:center;
        gap:4px;
        padding:4px 6px;
        border-radius:6px;
        background:rgba(255,255,255,0.16);
        border:1px solid rgba(255,255,255,0.18);
        font-size:11px;
        font-weight:800;
      ">${badgeLabel}</span>
      <span style="font-weight:800;max-width:180px;overflow:hidden;text-overflow:ellipsis;">${label}</span>
      <span style="opacity:0.82;font-size:11px;font-weight:700;">${statusText}</span>
      <span style="
        width:8px;
        height:8px;
        border-radius:50%;
        background:${statusColor};
        box-shadow:0 0 6px ${statusColor};
      "></span>
    </div>
  `
}

export class AMapAdapter extends MapAdapter {
  constructor() {
    super()
    this._map = null
    this._container = null
    this._poiMarkers = []
    this._landmarkMarkers = []
    this._tavernMarkers = []
    this._territoryCircles = []
    this._ready = Boolean(window.AMap)
    this._error = ''
  }

  getProviderName() {
    return 'amap'
  }

  isReady() {
    return this._ready
  }

  getError() {
    return this._error
  }

  async loadSdk() {
    if (!AMAP_KEY) {
      this._error = '缺少高德地图 Key，请检查 VITE_AMAP_KEY'
      return Promise.reject(new Error(this._error))
    }

    if (window.AMap) {
      this._ready = true
      return
    }

    if (window.__fablemapAmapLoader) {
      return window.__fablemapAmapLoader
    }

    if (AMAP_SECURITY_CODE) {
      window._AMapSecurityConfig = {
        securityJsCode: AMAP_SECURITY_CODE,
      }
    }

    window.__fablemapAmapLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-amap-sdk="true"]')
      if (existing) {
        existing.addEventListener('load', () => {
          if (window.AMap) {
            this._ready = true
            resolve(window.AMap)
          } else {
            this._error = '高德地图脚本已加载，但 AMap 对象不可用'
            reject(new Error(this._error))
          }
        }, { once: true })
        existing.addEventListener('error', () => {
          this._error = '高德地图脚本加载失败'
          reject(new Error(this._error))
        }, { once: true })
        return
      }

      const script = document.createElement('script')
      script.src = AMAP_SRC
      script.async = true
      script.defer = true
      script.dataset.amapSdk = 'true'
      script.onload = () => {
        if (window.AMap) {
          this._ready = true
          resolve(window.AMap)
        } else {
          this._error = '高德地图脚本已加载，但 AMap 对象不可用'
          reject(new Error(this._error))
        }
      }
      script.onerror = () => {
        this._error = '高德地图脚本加载失败'
        reject(new Error(this._error))
      }
      document.head.appendChild(script)
    })

    return window.__fablemapAmapLoader
  }

  createMap(container, options = {}) {
    if (!this._ready || !window.AMap) {
      throw new Error('AMap SDK not ready')
    }

    this._container = container
    this._map = new window.AMap.Map(container, {
      viewMode: '3D',
      zoom: options.zoom ?? 16,
      center: options.center ?? undefined,
      pitch: options.pitch ?? 35,
      resizeEnable: true,
      mapStyle: options.mapStyle ?? 'amap://styles/darkblue',
    })

    return this._map
  }

  setCenter(lon, lat) {
    if (!this._map) return
    this._map.setCenter([lon, lat])
  }

  setZoom(zoom) {
    if (!this._map) return
    this._map.setZoom(zoom)
  }

  setMarkers(markers, type, opts = {}) {
    if (!this._map) return

    if (type === 'poi') {
      // Remove existing POI markers
      this._poiMarkers.forEach((m) => m.setMap(null))
      this._poiMarkers = []

      if (!markers?.length) return

      const { activePoiId, familiarityMap = {}, onMarkerClick } = opts
      const newMarkers = markers
        .map((marker) => {
          const position = marker.position
          if (!position) return null

          const lat = Number(position.lat)
          const lon = Number(position.lon)
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

          const familiarity = familiarityMap[marker.id] ?? 0
          const amapMarker = new window.AMap.Marker({
            position: [lon, lat],
            anchor: 'bottom-center',
            offset: new window.AMap.Pixel(0, 0),
            content: buildPoiMarkerContent({
              poi: marker,
              isActive: marker.id === activePoiId,
              familiarity,
            }),
          })

          if (onMarkerClick) {
            amapMarker.on('click', () => onMarkerClick(marker))
          }

          return amapMarker
        })
        .filter(Boolean)

      this._poiMarkers = newMarkers
      this._map.add(newMarkers)
      this.fitBounds(newMarkers.map((m) => m.getPosition()), 80, 16)
    } else if (type === 'tavern') {
      // Remove existing tavern markers
      this._tavernMarkers.forEach((m) => m.setMap(null))
      this._tavernMarkers = []

      if (!markers?.length) return

      const { activeTavernId, onTavernClick } = opts
      const newMarkers = markers
        .map((marker) => {
          const lat = Number(marker.lat)
          const lon = Number(marker.lon)
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

          const amapMarker = new window.AMap.Marker({
            position: [lon, lat],
            anchor: 'bottom-center',
            offset: new window.AMap.Pixel(0, 0),
            content: buildTavernMarkerContent({
              tavern: marker,
              isActive: marker.id === activeTavernId,
            }),
          })

          if (onTavernClick) {
            amapMarker.on('click', () => onTavernClick(marker))
          }

          return amapMarker
        })
        .filter(Boolean)

      this._tavernMarkers = newMarkers
      this._map.add(newMarkers)
    } else if (type === 'landmark') {
      // Remove existing landmark markers
      this._landmarkMarkers.forEach((m) => m.setMap(null))
      this._landmarkMarkers = []

      if (!markers?.length) return

      const newMarkers = markers
        .map((marker) => {
          const position = marker.position
          if (!position) return null

          const lat = Number(position.lat)
          const lon = Number(position.lon)
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null

          return new window.AMap.Marker({
            position: [lon, lat],
            anchor: 'bottom-center',
            offset: new window.AMap.Pixel(0, 0),
            content: buildLandmarkMarkerContent(marker),
          })
        })
        .filter(Boolean)

      this._landmarkMarkers = newMarkers
      this._map.add(newMarkers)
    }
  }

  fitBounds(positions, padding = 80, zoom = 16) {
    if (!this._map || !positions?.length) return
    this._map.setFitView(positions, false, [padding, padding, padding, padding], zoom)
  }

  collectTiles(container) {
    if (!container) return []

    const containerRect = container.getBoundingClientRect()
    const images = Array.from(container.querySelectorAll('img'))

    return images
      .map((image) => {
        const src = image.currentSrc || image.src || ''
        if (!/^https?:\/\//i.test(src)) return null

        const rect = image.getBoundingClientRect()
        const width = Math.round(rect.width)
        const height = Math.round(rect.height)
        if (width <= 0 || height <= 0) return null

        return {
          src,
          left: Math.round(rect.left - containerRect.left),
          top: Math.round(rect.top - containerRect.top),
          width,
          height,
        }
      })
      .filter(Boolean)
  }

  getMapState() {
    if (!this._map) return null
    const center = this._map.getCenter()
    const zoom = this._map.getZoom()
    const size = this._map.getSize()
    return {
      center: center
        ? { lng: Number(center.lng), lat: Number(center.lat) }
        : null,
      zoom: Number.isFinite(Number(zoom)) ? Number(zoom) : null,
      size: size
        ? { width: Math.round(size.width), height: Math.round(size.height) }
        : null,
    }
  }

  clearTerritoryCircles() {
    if (!this._map) return
    this._territoryCircles.forEach((circle) => circle.setMap(null))
    this._territoryCircles = []
  }

  removeTerritoryCircles(ids) {
    if (!this._map || !ids?.length) return
    const idsToRemove = new Set(ids)
    const remaining = []
    for (const circle of this._territoryCircles) {
      const circleId = circle.getExtData()?.id
      if (circleId && idsToRemove.has(circleId)) {
        circle.setMap(null)
      } else {
        remaining.push(circle)
      }
    }
    this._territoryCircles = remaining
  }

  setTerritoryCircles(circles) {
    if (!this._map) return

    // Clear existing circles
    this.clearTerritoryCircles()

    if (!circles?.length) return

    const newCircles = circles
      .map((circle) => {
        const center = circle.center
        if (!center || center.length < 2) return null

        const lon = Number(center[0])
        const lat = Number(center[1])
        const radius = Number(circle.radius)
        if (!Number.isFinite(lon) || !Number.isFinite(lat) || !Number.isFinite(radius)) return null

        const color = circle.color || getTerritoryCircleColor(circle.type)
        const status = circle.status || 'active'
        const opacity = status === 'paused' ? 0.15 : 0.25

        const amapCircle = new window.AMap.Circle({
          center: [lon, lat],
          radius: radius,
          strokeColor: color,
          strokeWeight: 2,
          strokeOpacity: 0.8,
          fillColor: color,
          fillOpacity: opacity,
          strokeStyle: 'dashed',
          showLabel: true,
          extData: { id: circle.id, name: circle.name, type: circle.type },
        })

        // Add label for territory name
        if (circle.name) {
          const label = new window.AMap.LabelMarker({
            position: [lon, lat],
            text: {
              content: `<div style="
                background:rgba(15,23,42,0.85);
                color:#fff;
                padding:2px 6px;
                border-radius:4px;
                font-size:10px;
                font-weight:600;
                white-space:nowrap;
                border:1px solid ${color}40;
              ">${escapeHtml(circle.name)}</div>`,
              direction: 'top',
              offset: new window.AMap.Pixel(0, -8),
            },
          })
          amapCircle._labelMarker = label
        }

        return amapCircle
      })
      .filter(Boolean)

    // Add circles to map
    this._map.add(newCircles)
    this._territoryCircles = newCircles

    // Also add labels
    const labels = newCircles
      .map((circle) => circle._labelMarker)
      .filter(Boolean)
    if (labels.length > 0) {
      this._map.add(labels)
    }
  }

  destroy() {
    if (this._map) {
      this._poiMarkers.forEach((m) => m.setMap(null))
      this._landmarkMarkers.forEach((m) => m.setMap(null))
      this._tavernMarkers.forEach((m) => m.setMap(null))
      this._territoryCircles.forEach((c) => c.setMap(null))
      this._poiMarkers = []
      this._landmarkMarkers = []
      this._tavernMarkers = []
      this._territoryCircles = []
      this._map.destroy()
      this._map = null
    }
  }

  /** Expose the underlying map instance for event listening (e.g., 'complete'). */
  _getMap() {
    return this._map
  }
}
