import {
  getPoiFactionLabel,
  getPoiTypeLabel,
} from './services/appDisplay'

export default function WorldStagePoiFilterLane({
  filteredWorldPois,
  familiarityMap,
  handlePoiClick,
  poiFactionFilter,
  poiFactionOptions,
  poiOnlyFamiliar,
  poiSearch,
  poiSearchSummary,
  poiTypeFilter,
  poiTypeOptions,
  resolvedActivePoi,
  result,
  setPoiFactionFilter,
  setPoiOnlyFamiliar,
  setPoiSearch,
  setPoiTypeFilter,
}) {
  const canResetFilters = Boolean(poiSearch || poiTypeFilter !== 'all' || poiFactionFilter !== 'all' || poiOnlyFamiliar)

  function resetFilters() {
    setPoiSearch('')
    setPoiTypeFilter('all')
    setPoiFactionFilter('all')
    setPoiOnlyFamiliar(false)
  }

  return (
    <div className="storyboard-lane poi-filter-lane">
      <div className="storyboard-lane-header">
        <span className="storyboard-category-label">地点搜索与筛选</span>
        <span className="storyboard-lane-meta">不必在地点列表里逐个试点，可以先缩小候选地点范围</span>
      </div>

      <div className="poi-filter-toolbar">
        <label className="poi-filter-field poi-filter-field--search">
          <span>搜索词</span>
          <input
            type="text"
            value={poiSearch}
            onChange={(event) => setPoiSearch(event.target.value)}
            placeholder="输入地点名、钩子、势力或地点 ID"
          />
        </label>

        <label className="poi-filter-field">
          <span>地点类型</span>
          <select value={poiTypeFilter} onChange={(event) => setPoiTypeFilter(event.target.value)}>
            <option value="all">全部类型</option>
            {poiTypeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="poi-filter-field">
          <span>所属势力</span>
          <select value={poiFactionFilter} onChange={(event) => setPoiFactionFilter(event.target.value)}>
            <option value="all">全部势力</option>
            {poiFactionOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="poi-filter-toggle">
          <input
            type="checkbox"
            checked={poiOnlyFamiliar}
            onChange={(event) => setPoiOnlyFamiliar(event.target.checked)}
          />
          <span>只看已积累熟悉度的地点</span>
        </label>

        <button
          type="button"
          className="secondary poi-filter-reset"
          onClick={resetFilters}
          disabled={!canResetFilters}
        >
          清空筛选
        </button>
      </div>

      <div className="poi-filter-summary-row">
        <span className="poi-filter-summary">{poiSearchSummary}</span>
        {resolvedActivePoi ? (
          <span className="poi-filter-summary poi-filter-summary--active">
            当前地点：{resolvedActivePoi.fantasy_name}
          </span>
        ) : null}
      </div>

      {result ? (
        filteredWorldPois.length ? (
          <div className="poi-filter-results">
            {filteredWorldPois.slice(0, 12).map((poi) => {
              const isActive = poi.id === resolvedActivePoi?.id
              const familiarity = familiarityMap?.[poi.id] ?? 0
              return (
                <button
                  key={poi.id}
                  type="button"
                  className={`poi-filter-card${isActive ? ' is-active' : ''}`}
                  onClick={() => handlePoiClick(poi.id, poi)}
                >
                  <div className="poi-filter-card-top">
                    <strong>{poi.fantasy_name || poi.real_name || poi.id}</strong>
                    <span>{getPoiTypeLabel(poi)}</span>
                  </div>
                  <p>{poi.satire_hook || poi.emotion_hook || '这个地点暂时还没有公开钩子。'}</p>
                  <div className="poi-filter-card-meta">
                    <span>{getPoiFactionLabel(poi)}</span>
                    <span>熟悉度 · {familiarity}</span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="storyboard-placeholder-card poi-filter-empty">
            <strong>没有符合条件的地点</strong>
            <p>当前搜索词或筛选条件没有匹配到地点。可以先放宽类型、势力或熟悉度限制。</p>
          </div>
        )
      ) : (
        <div className="storyboard-placeholder-card poi-filter-empty">
          <strong>等待地点切片生成</strong>
          <p>生成当前地点切片后，这里会出现可搜索、可筛选、可快速选中的地点列表。</p>
        </div>
      )}
    </div>
  )
}
