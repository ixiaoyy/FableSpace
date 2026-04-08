import { useCallback, useState } from 'react'

export function useBackendStatus({ api, apiBase, restoredSession, setForm }) {
  const [checking, setChecking] = useState(false)
  const [statusOk, setStatusOk] = useState(false)
  const [statusText, setStatusText] = useState('等待连接 FastAPI...')
  const [statusDetail, setStatusDetail] = useState('')

  const applyMeta = useCallback((meta) => {
    if (!meta) {
      return
    }

    const coords = meta.default_coordinates || {}
    setForm((current) => {
      if (restoredSession?.form) {
        return current
      }

      return {
        ...current,
        lat: typeof coords.lat === 'number' ? String(coords.lat) : current.lat,
        lon: typeof coords.lon === 'number' ? String(coords.lon) : current.lon,
        radius: typeof coords.radius === 'number' ? String(coords.radius) : current.radius,
        mode: meta.default_mode || current.mode,
      }
    })
  }, [restoredSession?.form, setForm])

  const checkBackend = useCallback(async () => {
    setChecking(true)
    setStatusOk(false)
    setStatusText('正在检查 FastAPI 服务...')
    setStatusDetail('')

    try {
      const [health, meta] = await Promise.all([api.getHealth(), api.getMeta()])
      applyMeta(meta)
      setStatusOk(true)
      setStatusText(`FastAPI 已连接 · ${meta.project || 'FableMap'}`)
      setStatusDetail(
        `api=${meta.api_base || apiBase} · frontend_mode=${meta.frontend_mode} · fixture_available=${health.fixture_available}`
      )
    } catch (error) {
      setStatusOk(false)
      setStatusText('FastAPI 不可用')
      setStatusDetail(error.message || String(error))
    } finally {
      setChecking(false)
    }
  }, [api, apiBase, applyMeta])

  return {
    applyMeta,
    checkBackend,
    checking,
    statusDetail,
    statusOk,
    statusText,
  }
}
