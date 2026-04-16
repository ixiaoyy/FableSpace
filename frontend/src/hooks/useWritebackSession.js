import { useCallback, useState } from 'react'
import { clampObserveIntensity } from '../services/appDisplay'

export function useWritebackSession({
  api,
  result,
  activePoi,
  resolvedActivePoi,
  writebackForm,
  pendingWaypointsRef,
  setWritebackForm,
  setWritebackError,
  setWritebackResult,
  setWritebackSubmitting,
  setFamiliarityMap,
  setBehaviorInsights,
  setGhostTraces,
}) {
  const [ghostTracesLoading, setGhostTracesLoading] = useState(false)

  const handlePoiClick = useCallback((poiId, poi) => {
    setWritebackError('')
    setWritebackForm((current) => ({
      ...current,
      targetId: poi?.id || current.targetId,
      targetType: 'poi',
      eventType: current.eventType || 'observe',
    }))

    return { activePoiId: poiId, activePoi: poi }
  }, [setWritebackError, setWritebackForm])

  const applyWritebackAction = useCallback((eventType) => {
    setWritebackError('')
    setWritebackForm((current) => ({
      ...current,
      eventType,
      targetType: eventType === 'dwell' ? 'zone' : 'poi',
      targetId:
        eventType === 'dwell'
          ? current.zoneId || result?.primary_zone_id || current.targetId
          : activePoi?.id || current.targetId || result?.primary_poi_id,
      intensity: current.intensity,
    }))
  }, [activePoi?.id, result?.primary_poi_id, result?.primary_zone_id, setWritebackError, setWritebackForm])

  const submitWriteback = useCallback(async () => {
    setWritebackSubmitting(true)
    setWritebackError('')
    setWritebackResult(null)

    const targetType = writebackForm.eventType === 'dwell' ? 'zone' : writebackForm.targetType
    const targetId =
      writebackForm.eventType === 'dwell'
        ? writebackForm.zoneId || result?.primary_zone_id || writebackForm.targetId
        : writebackForm.targetId

    const event = {
      event_type: writebackForm.eventType,
      player_id: writebackForm.playerId,
      visibility: writebackForm.visibility,
      target: {
        target_type: targetType,
        target_id: targetId,
        slice_id: writebackForm.sliceId,
      },
      payload:
        writebackForm.eventType === 'mark'
          ? {
              tag: writebackForm.tag,
              note: writebackForm.note,
            }
          : writebackForm.eventType === 'observe'
            ? {
                intensity: clampObserveIntensity(writebackForm.intensity),
                note: writebackForm.note,
              }
            : {
                zone_id: writebackForm.zoneId,
                note: writebackForm.note,
              },
      source: {
        client: 'web',
        surface: 'react_writeback_panel',
        version: 'v0.1',
      },
      context: {
        current_zone_id: writebackForm.zoneId,
        nearest_poi_id: resolvedActivePoi?.id || writebackForm.targetId,
      },
    }

    try {
      const payload = await api.submitWorldEvent(event)
      setWritebackResult(payload)
      setWritebackForm((current) => ({
        ...current,
        targetType,
        targetId,
      }))
      const poiFam = payload?.player_state?.poi_familiarity || {}
      if (Object.keys(poiFam).length > 0) {
        setFamiliarityMap((current) => ({ ...current, ...poiFam }))
      }
      setBehaviorInsights(payload?.behavior_insights || null)
      if (writebackForm.eventType === 'observe' && targetId) {
        const waypoint = { poi_id: targetId, timestamp: new Date().toISOString(), action_state: 'observe' }
        pendingWaypointsRef.current = [...pendingWaypointsRef.current, waypoint]
        if (pendingWaypointsRef.current.length >= 3) {
          const waypoints = pendingWaypointsRef.current
          pendingWaypointsRef.current = []
          api.postGhostTrace({
            player_id: writebackForm.playerId,
            waypoints,
            mood_arc: ['curious'],
            visibility: writebackForm.visibility || 'local_public',
          }).then((data) => {
            if (data?.trace_id) {
              setGhostTraces((current) => [...current, data])
            }
          }).catch(() => {})
        }
      }
    } catch (error) {
      setWritebackError(`写回失败：${error.message || String(error)}`)
    } finally {
      setWritebackSubmitting(false)
    }
  }, [
    api,
    pendingWaypointsRef,
    resolvedActivePoi?.id,
    result?.primary_zone_id,
    setBehaviorInsights,
    setFamiliarityMap,
    setGhostTraces,
    setWritebackError,
    setWritebackForm,
    setWritebackResult,
    setWritebackSubmitting,
    writebackForm,
  ])

  const loadGhostTraces = useCallback(async (playerId) => {
    if (!result?.world_id || !playerId) {
      return
    }

    setGhostTracesLoading(true)
    try {
      const data = await api.getGhostTraces(playerId)
      setGhostTraces(data?.traces || [])
    } catch {
      // ignore ghost trace load failures in UI flow
    } finally {
      setGhostTracesLoading(false)
    }
  }, [api, result?.world_id, setGhostTraces])

  return {
    applyWritebackAction,
    ghostTracesLoading,
    handlePoiClick,
    loadGhostTraces,
    submitWriteback,
  }
}
