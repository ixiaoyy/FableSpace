import { useEffect, useMemo, useState } from 'react'
import {
  formatTavernDistance,
  getTavernAccessDescription,
  getTavernAccessIcon,
  getTavernAccessLabel,
  getTavernAccessTone,
  getTavernStatusColor,
  getTavernStatusLabel,
} from './services/tavernService'
import { buildMapAnchorCardCopy, buildMapAnchorSummaryCopy } from './mapAnchorCopy'
import { inferTavernPlayMode } from './tavernPlayModes'
import { buildShortDramaTeaser } from '../lib/short-drama-teasers.js'

const ACCESS_OPTIONS = [
  { value: 'all', label: '全部入口' },
  { value: 'public', label: '公开' },
  { value: 'password', label: '需要密码' },
  { value: 'private', label: '私人' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'open', label: '营业中' },
  { value: 'closed', label: '歇业中' },
]

const SORT_OPTIONS = [
  { value: 'distance', label: '离我最近' },
  { value: 'name', label: '名称排序' },
  { value: 'visits', label: '访问最多' },
  { value: 'characters', label: '角色最多' },
]

const DISCOVERY_BATCH_SIZE = 12

function getCharacterCount(tavern) {
  return Array.isArray(tavern?.characters) ? tavern.characters.length : 0
}

function getTavernDescription(tavern) {
  return tavern?.description || tavern?.scene_prompt || buildMapAnchorCardCopy(tavern).descriptionFallback
}

function getDistanceLabel(tavern) {
  return tavern?._distance == null ? '距离待定位' : formatTavernDistance(tavern._distance)
}

function SkeletonTavernCard() {
  return (
    <div className="tavern-discovery-card tavern-discovery-card--skeleton">
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--text" />
      <div className="skeleton-line skeleton-line--meta" />
    </div>
  )
}

function ShimmerLoader() {
  return (
    <div className="tavern-discovery-shimmer">
      <div className="shimmer-line shimmer-line--short" />
      <div className="shimmer-line shimmer-line--medium" />
      <div className="shimmer-line shimmer-line--long" />
    </div>
  )
}

function LoadingOverlay() {
  return (
    <div className="tavern-discovery-loading-overlay" aria-live="polite">
      <ShimmerLoader />
      <span className="loading-text">正在寻找附近亮起的灯牌</span>
    </div>
  )
}

export default function WorldStageTavernDiscoveryLane({
  taverns,
  totalTaverns,
  loading,
  error,
  search,
  setSearch,
  accessFilter,
  setAccessFilter,
  statusFilter,
  setStatusFilter,
  sortMode,
  setSortMode,
  activeTavernId,
  mapMarkerCount = taverns.length,
  mapMarkerLimit = 0,
  onTavernClick,
  onRefreshTaverns,
  onQuickStartTavern,
  quickStartLoading = false,
}) {
  const [visibleCount, setVisibleCount] = useState(DISCOVERY_BATCH_SIZE)
  const canReset = Boolean(search || accessFilter !== 'all' || statusFilter !== 'all' || sortMode !== 'distance')
  const visibleTaverns = useMemo(() => taverns.slice(0, visibleCount), [taverns, visibleCount])
  const hiddenCount = Math.max(0, taverns.length - visibleTaverns.length)
  const markerHiddenCount = Math.max(0, taverns.length - mapMarkerCount)
  const summary = buildMapAnchorSummaryCopy({ matching: taverns.length, total: totalTaverns })

  useEffect(() => {
    setVisibleCount(DISCOVERY_BATCH_SIZE)
  }, [search, accessFilter, statusFilter, sortMode, taverns.length])

  function resetFilters() {
    setSearch('')
    setAccessFilter('all')
    setStatusFilter('all')
    setSortMode('distance')
  }

  function loadMore() {
    setVisibleCount((count) => Math.min(taverns.length, count + DISCOVERY_BATCH_SIZE))
  }

  return (
    <div className="storyboard-lane tavern-discovery-lane">
      <div className="storyboard-lane-header">
        <span className="storyboard-category-label">空间发现</span>
        <span className="storyboard-lane-meta">{loading ? '正在扫描当前入口周围的空间' : summary}</span>
      </div>

      <div className="tavern-discovery-toolbar">
        <label className="tavern-discovery-field tavern-discovery-field--search">
          <span>搜索空间</span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="门牌、灯牌、店主介绍、角色或状态"
          />
        </label>

        <label className="tavern-discovery-field">
          <span>门口规则</span>
          <select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value)}>
            {ACCESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="tavern-discovery-field">
          <span>状态</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="tavern-discovery-field">
          <span>排序</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <button type="button" className="secondary tavern-discovery-reset" onClick={resetFilters} disabled={!canReset}>
          清空
        </button>

        <button type="button" className="secondary tavern-discovery-refresh" onClick={onRefreshTaverns} disabled={loading}>
          {loading ? (
            <span className="refresh-spinner">⟳</span>
          ) : (
            '↻ 刷新'
          )}
        </button>
      </div>

      <div className="tavern-discovery-summary-row" aria-live="polite">
        <span>{summary}</span>
        {activeTavernId ? <span className="tavern-discovery-active">已选中空间</span> : null}
        {hiddenCount ? <span>列表还有 {hiddenCount} 间未展开</span> : null}
        {markerHiddenCount ? <span>地图点亮 {mapMarkerCount} / {taverns.length} 盏灯牌</span> : null}
      </div>

      {onQuickStartTavern ? (
        <div className="tavern-discovery-quick-start">
          <div>
            <span className="mini-label">新手直达</span>
            <strong>先推开一扇公开的门，再决定要不要换街角。</strong>
            <p>完全开放的公共空间，NPC 会热情接待你。</p>
          </div>
          <button
            type="button"
            className="primary tavern-discovery-quick-btn"
            onClick={onQuickStartTavern}
            disabled={quickStartLoading}
          >
            {quickStartLoading ? (
              <span className="btn-loading-text">正在进入...</span>
            ) : (
              '⚡ 立即试玩'
            )}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="storyboard-placeholder-card tavern-discovery-empty tavern-discovery-empty--error">
          <span className="empty-icon">⚠️</span>
          <strong>附近空间暂时没有连通</strong>
          <p>{error}</p>
          <button type="button" className="secondary" onClick={onRefreshTaverns}>重试</button>
        </div>
      ) : loading ? (
        <div className="tavern-discovery-loading">
          <div className="loading-spinner">
            <div className="spinner-ring" />
          </div>
          <p>正在扫描附近空间...</p>
          <div className="skeleton-list">
            <SkeletonTavernCard />
            <SkeletonTavernCard />
            <SkeletonTavernCard />
          </div>
        </div>
      ) : visibleTaverns.length ? (
        <div className="tavern-discovery-results">
          {visibleTaverns.map((tavern, index) => {
            const isActive = tavern.id === activeTavernId
            const characterCount = getCharacterCount(tavern)
            const playMode = inferTavernPlayMode(tavern)
            const anchorCopy = buildMapAnchorCardCopy(tavern)
            const shortDramaTeaser = buildShortDramaTeaser(tavern)
            return (
              <button
                key={tavern.id}
                type="button"
                className={`tavern-discovery-card${isActive ? ' is-active' : ''}`}
                onClick={() => onTavernClick?.(tavern.id, tavern)}
                aria-pressed={isActive}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="tavern-discovery-card__top">
                  <strong>{tavern.name || '未命名空间'}</strong>
                  <span className="tavern-discovery-status">
                    <i style={{ background: getTavernStatusColor(tavern.status) }} aria-hidden="true" />
                    {getTavernStatusLabel(tavern.status)}
                  </span>
                </div>
                <p>{getTavernDescription(tavern)}</p>
                <div className="map-anchor-card" aria-label={`${tavern.name || '空间'}的真实地图锚点`}>
                  <span className="map-anchor-card__eyebrow">{anchorCopy.eyebrow}</span>
                  <strong>{anchorCopy.anchorLine}</strong>
                  <small>{anchorCopy.statusLine} · {anchorCopy.accessLine}</small>
                </div>
                {shortDramaTeaser ? (
                  <div className="tavern-short-drama-teaser" aria-label="短剧入口提示">
                    <span>{shortDramaTeaser.kicker}</span>
                    <strong>{shortDramaTeaser.conflictTitle}</strong>
                    <p>{shortDramaTeaser.summary}</p>
                    <small>{shortDramaTeaser.ctaLabel} · {shortDramaTeaser.guardrail}</small>
                  </div>
                ) : null}
                <div className="tavern-discovery-card__meta">
                  <span
                    className={`tavern-access-chip tavern-access-chip--${getTavernAccessTone(tavern.access)}`}
                    title={getTavernAccessDescription(tavern.access)}
                  >
                    {getTavernAccessIcon(tavern.access)} {getTavernAccessLabel(tavern.access)}
                  </span>
                  <span>{getDistanceLabel(tavern)}</span>
                  <span>{characterCount} 位角色</span>
                  <span>{playMode.icon} {playMode.label}</span>
                  <span>{tavern.visit_count || 0} 次访问</span>
                </div>
                <div className="tavern-discovery-card__footer">
                  <span>{anchorCopy.statusLine}</span>
                  <span>{anchorCopy.accessLine}</span>
                </div>
              </button>
            )
          })}
          {hiddenCount ? (
            <button type="button" className="tavern-discovery-load-more" onClick={loadMore}>
              <strong>加载更多空间</strong>
              <span>再显示 {Math.min(DISCOVERY_BATCH_SIZE, hiddenCount)} 间；地图最多点亮 {mapMarkerLimit || mapMarkerCount} 盏灯牌</span>
            </button>
          ) : null}
        </div>
      ) : (
        <div className="storyboard-placeholder-card tavern-discovery-empty">
          <span className="empty-icon">🏮</span>
          <strong>{totalTaverns ? '没有匹配的灯牌' : '这片街区还没有灯牌亮起'}</strong>
          <p>{totalTaverns ? '可以放宽搜索词、门口规则或营业状态。' : '切换入口位置或扩大半径，再看看附近有没有人开店。'}</p>
          {onQuickStartTavern ? (
            <button
              type="button"
              className="primary tavern-discovery-empty-action"
              onClick={onQuickStartTavern}
              disabled={quickStartLoading}
            >
              {quickStartLoading ? '正在进入新手体验空间...' : '先进入新手体验空间'}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )
}
