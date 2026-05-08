import { useEffect, useMemo, useRef, useState } from 'react'
import { createMapAdapter } from './mapAdapter'
import { buildMapAnchorSummaryCopy } from './mapAnchorCopy'
import { TAVERN_ACCESS_META, getTavernAccessDescription } from './services/tavernService'
import { territoriesToCircles } from '../lib/territoryService.js'

const SNAPSHOT_STORAGE_KEY = 'fablemap.activeMapSnapshot'
const TAVERN_ACCESS_ORDER = ['public', 'password', 'private']

function getSnapshotId(world) {
  const raw = world?.slice_id || world?.id || world?.source?.label || world?.source?.name || 'default'
  return String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'default'
}

function renderSnapshotTiles(snapshotManifest) {
  const tiles = snapshotManifest?.tiles || []
  return tiles.map((tile, index) => (
    <img
      key={`${tile.file || tile.source || 'tile'}-${index}`}
      src={tile.file}
      alt="snapshot tile"
      style={{
        position: 'absolute',
        left: tile.left || 0,
        top: tile.top || 0,
        width: tile.width || 'auto',
        height: tile.height || 'auto',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  ))
}

function computeMapCenter(world, pois, landmarks) {
  const sourceLat = Number(world?.source?.lat)
  const sourceLon = Number(world?.source?.lon)
  if (Number.isFinite(sourceLat) && Number.isFinite(sourceLon)) {
    return [sourceLon, sourceLat]
  }

  for (const poi of pois) {
    const lat = Number(poi?.position?.lat)
    const lon = Number(poi?.position?.lon)
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return [lon, lat]
    }
  }

  for (const landmark of landmarks) {
    const lat = Number(landmark?.position?.lat)
    const lon = Number(landmark?.position?.lon)
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return [lon, lat]
    }
  }

  return null
}

export default function WorldMap({
  world,
  onPoiClick,
  activePoiId,
  familiarityMap,
  originLabel,
  ghostTraces = [],
  visibleLayers,
  taverns = [],
  totalTavernMatches = taverns.length,
  tavernMarkerLimit = 0,
  onTavernClick,
  activeTavernId,
  territories = [],
}) {
  const containerRef = useRef(null)
  const adapterRef = useRef(null)
  const snapshotId = useMemo(() => getSnapshotId(world), [world])
  const autoSaveTriggeredRef = useRef(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [sdkError, setSdkError] = useState('')
  const [selectedPoi, setSelectedPoi] = useState(null)
  const [snapshotManifest, setSnapshotManifest] = useState(null)
  const [snapshotStatus, setSnapshotStatus] = useState('未发现本地快照')
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [preferSnapshot, setPreferSnapshot] = useState(() => {
    try {
      return window.localStorage.getItem(SNAPSHOT_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  const pois = world?.pois || []
  const landmarks = world?.landmarks || []
  const fam = familiarityMap || {}
  const layers = visibleLayers || {}

  const center = useMemo(() => computeMapCenter(world, pois, landmarks), [world, pois, landmarks])
  const usingSnapshot = preferSnapshot && Boolean(snapshotManifest)
  const hiddenTavernMarkerCount = Math.max(0, Number(totalTavernMatches || 0) - taverns.length)
  const tavernAnchorSummary = buildMapAnchorSummaryCopy({
    matching: taverns.length,
    total: totalTavernMatches,
  })
  const tavernAccessLegend = useMemo(() => {
    const counts = taverns.reduce((acc, tavern) => {
      const access = tavern?.access || 'unknown'
      acc[access] = (acc[access] || 0) + 1
      return acc
    }, {})

    return TAVERN_ACCESS_ORDER.map((access) => ({
      access,
      count: counts[access] || 0,
      ...TAVERN_ACCESS_META[access],
    }))
  }, [taverns])

  // Initialize adapter
  useEffect(() => {
    const adapter = createMapAdapter()
    adapterRef.current = adapter

    adapter
      .loadSdk()
      .then(() => {
        setSdkReady(true)
        setSdkError('')
      })
      .catch((error) => {
        setSdkError(error.message || '地图初始化失败')
      })
  }, [])

  // Load snapshot manifest and auto-prefer if it exists
  useEffect(() => {
    let cancelled = false

    async function loadSnapshotManifest() {
      try {
        const response = await fetch(`/assets/map-snapshots/${snapshotId}/manifest.json`, { cache: 'no-store' })
        if (!response.ok) {
          throw new Error('manifest not found')
        }
        const manifest = await response.json()
        if (cancelled) return

        setSnapshotManifest(manifest)
        setSnapshotStatus(`已加载本地快照 · ${manifest.tiles?.length || 0} 张瓦片`)
        // Auto-prefer cached snapshot to skip AMap tile requests
        setPreferSnapshot(true)
      } catch {
        if (cancelled) return
        setSnapshotManifest(null)
        setSnapshotStatus('未发现本地快照')
        // Ensure we show the live map when no snapshot exists
        setPreferSnapshot(false)
      }
    }

    loadSnapshotManifest()

    return () => {
      cancelled = true
    }
  }, [snapshotId])

  // Persist snapshot preference
  useEffect(() => {
    try {
      window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, preferSnapshot ? '1' : '0')
    } catch {
      // ignore persistence failures
    }
  }, [preferSnapshot])

  // Create/destroy map when SDK and center are ready.
  // Skip creating the live map if we already have a cached snapshot —
  // this avoids unnecessary AMap tile requests on return visits.
  useEffect(() => {
    if (!sdkReady || !containerRef.current || !center) return
    if (preferSnapshot && snapshotManifest) return // Use cached snapshot instead

    const adapter = adapterRef.current
    if (!adapter) return

    try {
      adapter.createMap(containerRef.current, {
        center,
        zoom: 16,
        pitch: 35,
        mapStyle: 'amap://styles/darkblue',
      })
    } catch (err) {
      setSdkError(err.message || '地图创建失败')
    }

    return () => {
      adapter.destroy()
    }
  }, [sdkReady, center, preferSnapshot, snapshotManifest])

  // Auto-save snapshot after map tiles have loaded.
  // Only triggers once per snapshotId when there is no existing snapshot.
  useEffect(() => {
    if (preferSnapshot && snapshotManifest) return // Already have a snapshot
    if (autoSaveTriggeredRef.current) return // Already triggered for this snapshot
    if (snapshotBusy) return // Save already in progress
    if (!sdkReady) return

    const adapter = adapterRef.current
    if (!adapter || !containerRef.current) return

    // Get the underlying AMap map instance to listen for 'complete'
    const mapInstance = adapter._getMap()
    if (!mapInstance) return

    autoSaveTriggeredRef.current = true
    setSnapshotBusy(true)
    setSnapshotStatus('正在保存快照…')

    const doCapture = () => {
      captureSnapshot()
      setSnapshotBusy(false)
    }

    // Wait for AMap tiles to finish loading before capturing
    if (typeof mapInstance.on === 'function') {
      const handler = () => {
        mapInstance.off('complete', handler)
        setTimeout(doCapture, 800)
      }
      mapInstance.on('complete', handler)
      // Fallback: if 'complete' never fires, save anyway after 5s
      const fallback = setTimeout(() => {
        mapInstance.off('complete', handler)
        doCapture()
      }, 5000)
      return () => {
        mapInstance.off('complete', handler)
        clearTimeout(fallback)
        setSnapshotBusy(false)
        autoSaveTriggeredRef.current = false
      }
    } else {
      setTimeout(doCapture, 2000)
    }

    return () => {
      setSnapshotBusy(false)
      autoSaveTriggeredRef.current = false
    }
  }, [sdkReady, preferSnapshot, snapshotManifest, snapshotId])

  // Update center when it changes
  useEffect(() => {
    const adapter = adapterRef.current
    if (!adapter || !center) return
    adapter.setCenter(center[0], center[1])
  }, [center])

  // Update POI markers when pois change
  useEffect(() => {
    const adapter = adapterRef.current
    if (!adapter) return

    if (layers.pois === false) {
      adapter.setMarkers([], 'poi', {})
      return
    }

    adapter.setMarkers(pois, 'poi', {
      activePoiId,
      familiarityMap: fam,
      onMarkerClick: (marker) => {
        setSelectedPoi(marker)
        if (onPoiClick) {
          onPoiClick(marker.id, marker)
        }
      },
    })
  }, [pois, fam, activePoiId, onPoiClick, layers.pois])

  // Update landmark markers when landmarks change
  useEffect(() => {
    const adapter = adapterRef.current
    if (!adapter) return

    if (layers.landmarks === false) {
      adapter.setMarkers([], 'landmark', {})
      return
    }

    adapter.setMarkers(landmarks, 'landmark', {})
  }, [landmarks, layers.landmarks])

  // Update tavern markers when taverns change
  useEffect(() => {
    const adapter = adapterRef.current
    if (!adapter) return

    adapter.setMarkers(taverns, 'tavern', {
      activeTavernId,
      onTavernClick: (marker) => {
        if (onTavernClick) {
          onTavernClick(marker.id, marker)
        }
      },
    })
  }, [taverns, activeTavernId, onTavernClick])

  // Update territory circles when territories change
  useEffect(() => {
    const adapter = adapterRef.current
    if (!adapter) return

    if (layers.territories === false || !territories?.length) {
      adapter.clearTerritoryCircles()
      return
    }

    const circles = territoriesToCircles(territories)
    adapter.setTerritoryCircles(circles)
  }, [territories, layers.territories])

  // Sync selectedPoi with activePoiId
  useEffect(() => {
    if (!selectedPoi && activePoiId) {
      const activePoi = pois.find((poi) => poi.id === activePoiId) || null
      if (activePoi) {
        setSelectedPoi(activePoi)
      }
      return
    }

    if (selectedPoi?.id && !pois.find((poi) => poi.id === selectedPoi.id)) {
      setSelectedPoi(null)
    }
  }, [activePoiId, pois, selectedPoi])

  if (!center) {
    return (
      <div className="map-empty">
        <p>当前切片缺少可用经纬度，暂时无法加载地图。</p>
      </div>
    )
  }

  if (sdkError && !usingSnapshot) {
    return (
      <div className="map-empty">
        <p>{sdkError}</p>
      </div>
    )
  }

  async function captureSnapshot() {
    const adapter = adapterRef.current
    const container = containerRef.current
    if (!adapter || !container) {
      setSnapshotStatus('地图尚未完成加载，暂时无法抓取快照')
      return
    }

    const tiles = adapter.collectTiles(container)
    if (!tiles.length) {
      setSnapshotStatus('当前视野未抓到可下载瓦片，请稍后重试')
      return
    }

    setSnapshotBusy(true)
    setSnapshotStatus(`正在保存快照 · ${tiles.length} 张瓦片`)

    try {
      const mapState = adapter.getMapState()
      const response = await fetch(`/api/map/snapshot/${snapshotId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          world_id: world?.slice_id || world?.id || null,
          origin_label: originLabel || '',
          captured_from: `${adapter.getProviderName()}-dom`,
          captured_at: new Date().toISOString(),
          center: mapState?.center || null,
          zoom: mapState?.zoom ?? null,
          width: mapState?.size?.width || container.clientWidth || 0,
          height: mapState?.size?.height || container.clientHeight || 0,
          tiles,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.detail || '地图快照保存失败')
      }

      setSnapshotManifest(payload)
      setPreferSnapshot(true)
      setSnapshotStatus(`本地快照已保存 · ${payload.tiles?.length || 0} 张瓦片`)
    } catch (error) {
      setSnapshotStatus(error.message || '地图快照保存失败')
    } finally {
      setSnapshotBusy(false)
    }
  }

  return (
    <div className="world-map-wrap">
      <div
        ref={containerRef}
        className="amap-container"
        style={{
          width: '100%',
          minHeight: '600px',
          height: 'min(72vh, 720px)',
          opacity: usingSnapshot ? 0.01 : 1,
          pointerEvents: usingSnapshot ? 'none' : 'auto',
        }}
      />

      {usingSnapshot ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 2,
            overflow: 'hidden',
            background: '#020617',
          }}
        >
          {renderSnapshotTiles(snapshotManifest)}
        </div>
      ) : null}

      <div
        className="amap-topbar"
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 11,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 16,
            background: 'rgba(15,23,42,0.72)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            color: '#e2e8f0',
            pointerEvents: 'auto',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 6 }}>
            {usingSnapshot ? '本地街区快照' : '街区底图已接入'}
          </strong>
          <span style={{ fontSize: 13, color: '#cbd5e1', display: 'block', marginBottom: 10 }}>
            {originLabel || '当前街角'} · {pois.length} 个地点 · {landmarks.length} 个地标 · {tavernAnchorSummary}
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={captureSnapshot}
              disabled={snapshotBusy || !sdkReady}
              style={{
                pointerEvents: 'auto',
                border: '1px solid rgba(59,130,246,0.45)',
                background: 'rgba(37,99,235,0.22)',
                color: '#dbeafe',
                borderRadius: 999,
                padding: '6px 12px',
                cursor: snapshotBusy || !sdkReady ? 'not-allowed' : 'pointer',
              }}
            >
              {snapshotBusy ? '保存中...' : '抓取当前快照'}
            </button>
            <button
              type="button"
              onClick={() => setPreferSnapshot((current) => !current)}
              disabled={!snapshotManifest}
              style={{
                pointerEvents: 'auto',
                border: '1px solid rgba(251,191,36,0.35)',
                background: snapshotManifest ? 'rgba(251,191,36,0.16)' : 'rgba(148,163,184,0.12)',
                color: snapshotManifest ? '#fef3c7' : '#94a3b8',
                borderRadius: 999,
                padding: '6px 12px',
                cursor: snapshotManifest ? 'pointer' : 'not-allowed',
              }}
            >
              {usingSnapshot ? '切回在线地图' : '优先本地快照'}
            </button>
          </div>
        </div>
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 16,
            background: 'rgba(15,23,42,0.72)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            color: '#e2e8f0',
            pointerEvents: 'auto',
          }}
        >
          <strong style={{ display: 'block', marginBottom: 6 }}>状态</strong>
          <span style={{ fontSize: 13, color: '#cbd5e1', display: 'block', marginBottom: 6 }}>
            {adapterRef.current?.getProviderName() || 'map'} {sdkReady ? '已就绪' : '加载中'} · 残影 {ghostTraces.length}
          </span>
          <span style={{ fontSize: 13, color: '#cbd5e1', display: 'block' }}>{snapshotStatus}</span>
          <span style={{ fontSize: 12, color: '#93c5fd', display: 'block', marginTop: 6 }}>
            快照 ID · {snapshotId}
          </span>
        </div>
      </div>

      <div className="tavern-map-legend" aria-label="空间灯牌分类">
        <div className="tavern-map-legend__header">
          <span>空间灯牌</span>
          <strong>{taverns.length}/{totalTavernMatches}</strong>
        </div>
        {hiddenTavernMarkerCount ? (
          <p className="tavern-map-legend__note">
            已优先点亮前 {tavernMarkerLimit || taverns.length} 间；继续搜索或筛选可缩小地图灯牌数量。
          </p>
        ) : null}
        <div className="tavern-map-legend__items">
          {tavernAccessLegend.map((item) => (
            <div
              key={item.access}
              className={`tavern-map-legend__item tavern-access-chip tavern-access-chip--${item.tone}`}
              title={getTavernAccessDescription(item.access)}
            >
              <span>{item.icon} {item.label}</span>
              <strong>{item.count}</strong>
            </div>
          ))}
        </div>
      </div>

      {selectedPoi ? (
        <div
          className="amap-sidecar"
          style={{
            position: 'absolute',
            right: 16,
            bottom: 16,
            zIndex: 11,
            maxWidth: 360,
            padding: 16,
            borderRadius: 18,
            background: 'rgba(15,23,42,0.84)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(14px)',
            color: '#e2e8f0',
          }}
        >
          <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 8 }}>当前地点</div>
          <strong style={{ display: 'block', fontSize: 18, marginBottom: 6 }}>
            {selectedPoi.fantasy_name || selectedPoi.real_name || selectedPoi.id}
          </strong>
          <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 10 }}>
            {selectedPoi.real_name || '未命名现实地点'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <span className="storyboard-chip">熟悉度 {fam[selectedPoi.id] ?? 0}</span>
            {selectedPoi.faction_alignment ? <span className="storyboard-chip">{selectedPoi.faction_alignment}</span> : null}
            {selectedPoi.fantasy_type ? <span className="storyboard-chip">{selectedPoi.fantasy_type}</span> : null}
          </div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: '#e2e8f0' }}>
            {selectedPoi.satire_hook || selectedPoi.emotion_hook || '这个地点暂时还没有公开钩子。'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
