import {
  buildSliceHighlights,
  buildSliceAtmosphere,
  buildWritebackResidue,
  buildWritebackRevisitSummary,
  buildWritebackTimeline,
  getWritebackTargetSummary,
  pickPresetMeta,
} from './appDisplay'

export function resolveActivePoi({
  activePoi,
  activePoiId,
  lastWritebackPoiId,
  worldPois,
  writebackForm,
}) {
  if (!worldPois.length) {
    return activePoi
  }

  const candidateIds = [activePoiId, activePoi?.id, lastWritebackPoiId, writebackForm.targetId].filter(Boolean)
  for (const candidateId of candidateIds) {
    const matchedPoi = worldPois.find((poi) => poi.id === candidateId)
    if (matchedPoi) {
      return matchedPoi
    }
  }

  return activePoi
}

export function buildWorldSessionViewState({
  activePoi,
  activePoiId,
  form,
  locationPresets,
  result,
  visibilityOptions,
  writebackActions,
  writebackForm,
  writebackResult,
  familiarityMap,
}) {
  const presetMeta = pickPresetMeta(form, locationPresets)
  const previewUrl = result?.preview_url || ''
  const worldPois = result?.world?.pois || []
  const recentEchoes = writebackResult?.place_state?.recent_echoes || []
  const recentMarks = writebackResult?.place_state?.marks || []
  const placeLegend = writebackResult?.place_state?.place_legend || null
  const honorBoard = writebackResult?.place_state?.honor_board || []
  const playerState = writebackResult?.player_state || null
  const feedback = writebackResult?.world_feedback || null
  const writebackTimeline = buildWritebackTimeline(writebackResult)
  const writebackResidues = buildWritebackResidue(writebackResult?.place_state)
  const selectedActionMeta = writebackActions.find((item) => item.eventType === writebackForm.eventType) || writebackActions[0]
  const selectedVisibilityMeta = visibilityOptions.find((item) => item.value === writebackForm.visibility) || visibilityOptions[0]
  const lastWritebackPoiId =
    writebackResult?.event?.target?.target_type === 'poi'
      ? writebackResult?.event?.target?.target_id || null
      : null
  const resolvedActivePoi = resolveActivePoi({
    activePoi,
    activePoiId,
    lastWritebackPoiId,
    worldPois,
    writebackForm,
  })
  const writebackTargetSummary = getWritebackTargetSummary(resolvedActivePoi, writebackForm)
  const revisitSummary = buildWritebackRevisitSummary(result, writebackResult, familiarityMap, writebackForm)
  const sliceHighlights = buildSliceHighlights(result)
  const sliceAtmosphere = buildSliceAtmosphere(result)

  return {
    feedback,
    honorBoard,
    lastWritebackPoiId,
    placeLegend,
    playerState,
    presetMeta,
    previewUrl,
    recentEchoes,
    recentMarks,
    resolvedActivePoi,
    revisitSummary,
    selectedActionMeta,
    selectedVisibilityMeta,
    sliceAtmosphere,
    sliceHighlights,
    worldPois,
    writebackResidues,
    writebackTargetSummary,
    writebackTimeline,
  }
}
