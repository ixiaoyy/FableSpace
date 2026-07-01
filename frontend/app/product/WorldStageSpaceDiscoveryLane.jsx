import { useEffect, useMemo, useState } from 'react'
import {
  formatSpaceDistance,
  getSpaceAccessDescription,
  getSpaceAccessIcon,
  getSpaceAccessLabel,
  getSpaceAccessTone,
  getSpaceStatusColor,
  getSpaceStatusLabel,
} from './services/spaceService'
import { buildMapAnchorCardCopy, buildMapAnchorSummaryCopy } from './mapAnchorCopy'
import { inferSpacePlayMode } from './spacePlayModes'
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

function getCharacterCount(space) {
  return Array.isArray(space?.characters) ? space.characters.length : 0
}

function getSpaceDescription(space) {
  return space?.description || space?.scene_prompt || buildMapAnchorCardCopy(space).descriptionFallback
}

function getDistanceLabel(space) {
  return space?._distance == null ? '距离待定位' : formatSpaceDistance(space._distance)
}

function SkeletonSpaceCard() {
  return (
    <div className="space-discovery-card space-discovery-card--skeleton">
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--text" />
      <div className="skeleton-line skeleton-line--meta" />
    </div>
  )
}

function ShimmerLoader() {
  return (
    <div className="space-discovery-shimmer">
      <div className="shimmer-line shimmer-line--short" />
      <div className="shimmer-line shimmer-line--medium" />
      <div className="shimmer-line shimmer-line--long" />
    </div>
  )
}

function LoadingOverlay() {
  return (
    <div className="space-discovery-loading-overlay" aria-live="polite">
      <ShimmerLoader />
      <span className="loading-text">正在寻找附近亮起的灯牌</span>
    </div>
  )
}

export default function WorldStageSpaceDiscoveryLane({
  spaces,
  totalSpaces,
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
  activeSpaceId,
  mapMarkerCount = spaces.length,
  mapMarkerLimit = 0,
  onSpaceClick,
  onRefreshSpaces,
  onQuickStartSpace,
  quickStartLoading = false,
}) {
  const [visibleCount, setVisibleCount] = useState(DISCOVERY_BATCH_SIZE)
  const canReset = Boolean(search || accessFilter !== 'all' || statusFilter !== 'all' || sortMode !== 'distance')
  const visibleSpaces = useMemo(() => spaces.slice(0, visibleCount), [spaces, visibleCount])
  const hiddenCount = Math.max(0, spaces.length - visibleSpaces.length)
  const markerHiddenCount = Math.max(0, spaces.length - mapMarkerCount)
  const summary = buildMapAnchorSummaryCopy({ matching: spaces.length, total: totalSpaces })

  useEffect(() => {
    setVisibleCount(DISCOVERY_BATCH_SIZE)
  }, [search, accessFilter, statusFilter, sortMode, spaces.length])

  function resetFilters() {
    setSearch('')
    setAccessFilter('all')
    setStatusFilter('all')
    setSortMode('distance')
  }

  function loadMore() {
    setVisibleCount((count) => Math.min(spaces.length, count + DISCOVERY_BATCH_SIZE))
  }

  return (
    <div className="storyboard-lane space-discovery-lane">
      <div className="storyboard-lane-header">
        <span className="storyboard-category-label">空间发现</span>
        <span className="storyboard-lane-meta">{loading ? '正在扫描当前入口周围的空间' : summary}</span>
      </div>

      <div className="space-discovery-toolbar">
        <label className="space-discovery-field space-discovery-field--search">
          <span>搜索空间</span>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="门牌、灯牌、店主介绍、角色或状态"
          />
        </label>

        <label className="space-discovery-field">
          <span>门口规则</span>
          <select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value)}>
            {ACCESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-discovery-field">
          <span>状态</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="space-discovery-field">
          <span>排序</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <button type="button" className="secondary space-discovery-reset" onClick={resetFilters} disabled={!canReset}>
          清空
        </button>

        <button type="button" className="secondary space-discovery-refresh" onClick={onRefreshSpaces} disabled={loading}>
          {loading ? (
            <span className="refresh-spinner">⟳</span>
          ) : (
            '↻ 刷新'
          )}
        </button>
      </div>

      <div className="space-discovery-summary-row" aria-live="polite">
        <span>{summary}</span>
        {activeSpaceId ? <span className="space-discovery-active">已选中空间</span> : null}
        {hiddenCount ? <span>列表还有 {hiddenCount} 间未展开</span> : null}
        {markerHiddenCount ? <span>地图点亮 {mapMarkerCount} / {spaces.length} 盏灯牌</span> : null}
      </div>

      {onQuickStartSpace ? (
        <div className="space-discovery-quick-start">
          <div>
            <span className="mini-label">新手直达</span>
            <strong>先推开一扇公开的门，再决定要不要换街角。</strong>
            <p>完全开放的公共空间，NPC 会热情接待你。</p>
          </div>
          <button
            type="button"
            className="primary space-discovery-quick-btn"
            onClick={onQuickStartSpace}
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
        <div className="storyboard-placeholder-card space-discovery-empty space-discovery-empty--error">
          <span className="empty-icon">⚠️</span>
          <strong>附近空间暂时没有连通</strong>
          <p>{error}</p>
          <button type="button" className="secondary" onClick={onRefreshSpaces}>重试</button>
        </div>
      ) : loading ? (
        <div className="space-discovery-loading">
          <div className="loading-spinner">
            <div className="spinner-ring" />
          </div>
          <p>正在扫描附近空间...</p>
          <div className="skeleton-list">
            <SkeletonSpaceCard />
            <SkeletonSpaceCard />
            <SkeletonSpaceCard />
          </div>
        </div>
      ) : visibleSpaces.length ? (
        <div className="space-discovery-results">
          {visibleSpaces.map((space, index) => {
            const isActive = space.id === activeSpaceId
            const characterCount = getCharacterCount(space)
            const playMode = inferSpacePlayMode(space)
            const anchorCopy = buildMapAnchorCardCopy(space)
            const shortDramaTeaser = buildShortDramaTeaser(space)
            return (
              <button
                key={space.id}
                type="button"
                className={`space-discovery-card${isActive ? ' is-active' : ''}`}
                onClick={() => onSpaceClick?.(space.id, space)}
                aria-pressed={isActive}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="space-discovery-card__top">
                  <strong>{space.name || '未命名空间'}</strong>
                  <span className="space-discovery-status">
                    <i style={{ background: getSpaceStatusColor(space.status) }} aria-hidden="true" />
                    {getSpaceStatusLabel(space.status)}
                  </span>
                </div>
                <p>{getSpaceDescription(space)}</p>
                <div className="map-anchor-card" aria-label={`${space.name || '空间'}的真实地图锚点`}>
                  <span className="map-anchor-card__eyebrow">{anchorCopy.eyebrow}</span>
                  <strong>{anchorCopy.anchorLine}</strong>
                  <small>{anchorCopy.statusLine} · {anchorCopy.accessLine}</small>
                </div>
                {shortDramaTeaser ? (
                  <div className="space-short-drama-teaser" aria-label="短剧入口提示">
                    <span>{shortDramaTeaser.kicker}</span>
                    <strong>{shortDramaTeaser.conflictTitle}</strong>
                    <p>{shortDramaTeaser.summary}</p>
                    <small>{shortDramaTeaser.ctaLabel} · {shortDramaTeaser.guardrail}</small>
                  </div>
                ) : null}
                <div className="space-discovery-card__meta">
                  <span
                    className={`space-access-chip space-access-chip--${getSpaceAccessTone(space.access)}`}
                    title={getSpaceAccessDescription(space.access)}
                  >
                    {getSpaceAccessIcon(space.access)} {getSpaceAccessLabel(space.access)}
                  </span>
                  <span>{getDistanceLabel(space)}</span>
                  <span>{characterCount} 位角色</span>
                  <span>{playMode.icon} {playMode.label}</span>
                  <span>{space.visit_count || 0} 次访问</span>
                </div>
                <div className="space-discovery-card__footer">
                  <span>{anchorCopy.statusLine}</span>
                  <span>{anchorCopy.accessLine}</span>
                </div>
              </button>
            )
          })}
          {hiddenCount ? (
            <button type="button" className="space-discovery-load-more" onClick={loadMore}>
              <strong>加载更多空间</strong>
              <span>再显示 {Math.min(DISCOVERY_BATCH_SIZE, hiddenCount)} 间；地图最多点亮 {mapMarkerLimit || mapMarkerCount} 盏灯牌</span>
            </button>
          ) : null}
        </div>
      ) : (
        <div className="storyboard-placeholder-card space-discovery-empty">
          <span className="empty-icon">🏮</span>
          <strong>{totalSpaces ? '没有匹配的灯牌' : '这片街区还没有灯牌亮起'}</strong>
          <p>{totalSpaces ? '可以放宽搜索词、门口规则或营业状态。' : '切换入口位置或扩大半径，再看看附近有没有人开店。'}</p>
          {onQuickStartSpace ? (
            <button
              type="button"
              className="primary space-discovery-empty-action"
              onClick={onQuickStartSpace}
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
