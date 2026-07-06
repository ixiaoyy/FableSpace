import { useCallback, useState } from 'react'

export function useNearbySession({
  api,
  form,
  restoredWritebackSession,
  applyOrigin,
  setForm,
  setResult,
  setAdvancedOpen,
  setErrorText,
  setActivePoiId,
  setActivePoi,
  setFamiliarityMap,
  setWritebackResult,
  setWritebackForm,
}) {
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)

  const submitNearby = useCallback(async (refresh, overrideForm = null, options = {}) => {
    const requestForm = overrideForm || form
    const { keepAdvancedState = false } = options
    setSubmitting(true)
    setErrorText(refresh ? '正在刷新附近地点切片...' : '正在生成附近地点切片...')

    try {
      const payload = await api.createNearbyPreview({
        lat: requestForm.lat,
        lon: requestForm.lon,
        radius: requestForm.radius,
        mode: requestForm.mode,
        seed: requestForm.seed,
        refresh: refresh ? 'true' : 'false',
      })
      const nextSliceId = payload.world_id || ''
      const fallbackPrimaryPoiId = payload.world?.pois?.[0]?.id || ''
      const fallbackPrimaryZoneId = payload.world?.map2d?.encounter_zones?.[0]?.id || ''
      const primaryPoiId = payload.primary_poi_id || fallbackPrimaryPoiId
      const primaryZoneId = payload.primary_zone_id || fallbackPrimaryZoneId
      const canReuseWriteback = Boolean(
        restoredWritebackSession?.sliceId &&
          nextSliceId &&
          restoredWritebackSession.sliceId === nextSliceId
      )

      const responseFormPatch = {
        ...(overrideForm || {}),
        ...(payload.fallback_mode ? { mode: payload.fallback_mode } : {}),
      }
      if (overrideForm || payload.fallback_mode) {
        setForm((current) => ({ ...current, ...responseFormPatch }))
      }

      setResult(payload)
      if (!keepAdvancedState) {
        setAdvancedOpen(true)
      }
      setErrorText('')

      if (canReuseWriteback) {
        setActivePoiId(restoredWritebackSession?.activePoiId || primaryPoiId || null)
        setActivePoi(restoredWritebackSession?.activePoi || null)
        setFamiliarityMap(restoredWritebackSession?.familiarityMap || {})
        setWritebackResult(restoredWritebackSession?.writebackResult || null)
        setWritebackForm((current) => ({
          ...current,
          ...(restoredWritebackSession?.writebackForm || {}),
          sliceId: nextSliceId || current.sliceId,
          targetId:
            restoredWritebackSession?.writebackForm?.targetId ||
            primaryPoiId ||
            current.targetId,
          zoneId:
            restoredWritebackSession?.writebackForm?.zoneId ||
            primaryZoneId ||
            current.zoneId,
        }))
      } else {
        setActivePoiId(primaryPoiId || null)
        setActivePoi(null)
        setFamiliarityMap({})
        setWritebackResult(null)
        setWritebackForm((current) => ({
          ...current,
          sliceId: nextSliceId || current.sliceId,
          targetId: primaryPoiId || current.targetId,
          zoneId: primaryZoneId || current.zoneId,
        }))
      }
    } catch (error) {
      setErrorText(`生成失败：${error.message || String(error)}`)
    } finally {
      setSubmitting(false)
    }
  }, [
    api,
    form,
    restoredWritebackSession,
    setActivePoi,
    setActivePoiId,
    setAdvancedOpen,
    setErrorText,
    setFamiliarityMap,
    setForm,
    setResult,
    setWritebackForm,
    setWritebackResult,
  ])

  const useCurrentLocation = useCallback(async ({ autoSubmit = false, refresh = false, openAdvanced = true, suppressError = false } = {}) => {
    if (!navigator.geolocation) {
      if (!suppressError) {
        setErrorText('当前浏览器不支持定位，可先使用预设入口或手动填写高级坐标。')
      }
      if (autoSubmit) {
        await submitNearby(refresh, null, { keepAdvancedState: !openAdvanced })
      }
      return false
    }

    setLocating(true)
    setErrorText('')

    const getCurrentPosition = () => new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      })
    })

    try {
      const position = await getCurrentPosition()
      const nextForm = {
        lat: position.coords.latitude.toFixed(6),
        lon: position.coords.longitude.toFixed(6),
        radius: form.radius || '300',
        mode: 'live',
        seed: form.seed,
      }
      applyOrigin(
        nextForm,
        '我的当前位置',
        autoSubmit ? '已根据你的浏览器定位自动生成附近地点切片。' : '已抓取浏览器定位，可直接生成你附近的地点切片。'
      )
      setAdvancedOpen(openAdvanced)
      if (autoSubmit) {
        await submitNearby(refresh, nextForm, { keepAdvancedState: !openAdvanced })
      }
      return true
    } catch (error) {
      if (!suppressError) {
        setErrorText(`定位失败：${error.message || '浏览器拒绝了位置权限。'}`)
      }
      if (autoSubmit) {
        applyOrigin(
          form,
          '上海默认切片',
          '定位失败，已回退到默认入口并自动生成附近地点切片。'
        )
        await submitNearby(refresh, null, { keepAdvancedState: !openAdvanced })
      }
      return false
    } finally {
      setLocating(false)
    }
  }, [applyOrigin, form, setAdvancedOpen, setErrorText, submitNearby])

  return {
    locating,
    submitNearby,
    submitting,
    useCurrentLocation,
  }
}
