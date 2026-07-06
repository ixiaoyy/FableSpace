import { useMemo, useState } from 'react'
import {
  getPoiFactionLabel,
  getPoiTypeLabel,
  matchesPoiSearch,
  normalizeSearchText,
} from '../services/appDisplay'

export function usePoiFilters({ worldPois, familiarityMap }) {
  const [poiSearch, setPoiSearch] = useState('')
  const [poiTypeFilter, setPoiTypeFilter] = useState('all')
  const [poiFactionFilter, setPoiFactionFilter] = useState('all')
  const [poiOnlyFamiliar, setPoiOnlyFamiliar] = useState(false)

  const normalizedPoiSearch = normalizeSearchText(poiSearch)

  const poiTypeOptions = useMemo(
    () => Array.from(new Set(worldPois.map((poi) => getPoiTypeLabel(poi)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [worldPois]
  )

  const poiFactionOptions = useMemo(
    () => Array.from(new Set(worldPois.map((poi) => getPoiFactionLabel(poi)).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [worldPois]
  )

  const filteredWorldPois = useMemo(() => {
    return worldPois.filter((poi) => {
      const matchesQuery = matchesPoiSearch(poi, normalizedPoiSearch)
      const matchesType = poiTypeFilter === 'all' || getPoiTypeLabel(poi) === poiTypeFilter
      const matchesFaction = poiFactionFilter === 'all' || getPoiFactionLabel(poi) === poiFactionFilter
      const familiarity = familiarityMap?.[poi.id] ?? 0
      const matchesFamiliarity = !poiOnlyFamiliar || familiarity > 0
      return matchesQuery && matchesType && matchesFaction && matchesFamiliarity
    })
  }, [familiarityMap, normalizedPoiSearch, poiFactionFilter, poiOnlyFamiliar, poiTypeFilter, worldPois])

  const poiSearchSummary = worldPois.length
    ? `当前匹配 ${filteredWorldPois.length} / ${worldPois.length} 个地点`
    : '生成切片后可按名称、势力与类型筛选地点'

  return {
    filteredWorldPois,
    poiFactionFilter,
    poiFactionOptions,
    poiOnlyFamiliar,
    poiSearch,
    poiSearchSummary,
    poiTypeFilter,
    poiTypeOptions,
    setPoiFactionFilter,
    setPoiOnlyFamiliar,
    setPoiSearch,
    setPoiTypeFilter,
  }
}
