import { useEffect, useRef } from 'react'

export function useScrollToWorldStage({ result, stageRef }) {
  const previousResultIdRef = useRef(null)

  useEffect(() => {
    previousResultIdRef.current = result?.slice_id ?? null
  }, [])

  useEffect(() => {
    const currentResultId = result?.slice_id ?? null
    const previousResultId = previousResultIdRef.current

    if (currentResultId && currentResultId !== previousResultId) {
      let cancelled = false
      let attempt = 0
      let timerId = null

      const scrollToMapViewport = () => {
        if (cancelled) {
          return
        }

        const mapViewport = stageRef.current?.querySelector('.world-map-wrap, .map-empty')

        if (mapViewport || attempt >= 8) {
          ;(mapViewport || stageRef.current)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          })
          return
        }

        attempt += 1
        timerId = window.setTimeout(scrollToMapViewport, 80)
      }

      timerId = window.setTimeout(scrollToMapViewport, 0)

      return () => {
        cancelled = true
        if (timerId) {
          window.clearTimeout(timerId)
        }
      }
    }

    previousResultIdRef.current = currentResultId
  }, [result, stageRef])
}
