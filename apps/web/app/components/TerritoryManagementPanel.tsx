/**
 * TerritoryManagementPanel - 领地管理面板
 *
 * 让领地主人管理自己的领地：查看、更新状态、调整半径、废弃领地。
 */

import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import {
  TERRITORY_TYPE_META,
  TERRITORY_RADIUS_LIMITS,
  getTerritory,
  updateTerritory,
  deleteTerritory,
  listTerritories,
} from '../lib/territoryService.js'

const STATUS_OPTIONS = [
  { value: 'claimed', label: '建设中', color: '#f59e0b' },
  { value: 'active', label: '已开放', color: '#22c55e' },
  { value: 'paused', label: '暂停营业', color: '#ef4444' },
]

export default function TerritoryManagementPanel({
  userId,
  onTerritoryChange,
}) {
  const [territories, setTerritories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTerritory, setSelectedTerritory] = useState(null)
  const [editingRadius, setEditingRadius] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadTerritories = useCallback(async () => {
    if (!userId) return

    setLoading(true)
    setError('')

    try {
      const result = await listTerritories({ owner_id: userId, limit: 100 })
      setTerritories(result.territories || [])
    } catch (err) {
      setError(err.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadTerritories()
  }, [loadTerritories])

  const handleStatusChange = useCallback(async (territory, newStatus) => {
    setSaving(true)
    try {
      const updated = await updateTerritory(territory.id, { status: newStatus }, userId)
      setTerritories((prev) =>
        prev.map((t) => (t.id === territory.id ? { ...t, ...updated } : t))
      )
      setSelectedTerritory((prev) =>
        prev?.id === territory.id ? { ...prev, ...updated } : prev
      )
      if (onTerritoryChange) {
        onTerritoryChange(updated)
      }
    } catch (err) {
      setError(err.message || '更新失败')
    } finally {
      setSaving(false)
    }
  }, [userId, onTerritoryChange])

  const handleRadiusChange = useCallback(async (territory, newRadius) => {
    setSaving(true)
    try {
      const updated = await updateTerritory(territory.id, { radius: newRadius }, userId)
      setTerritories((prev) =>
        prev.map((t) => (t.id === territory.id ? { ...t, ...updated } : t))
      )
      setSelectedTerritory((prev) =>
        prev?.id === territory.id ? { ...prev, ...updated } : prev
      )
      setEditingRadius(null)
      if (onTerritoryChange) {
        onTerritoryChange(updated)
      }
    } catch (err) {
      setError(err.message || '更新失败')
    } finally {
      setSaving(false)
    }
  }, [userId, onTerritoryChange])

  const handleDelete = useCallback(async (territory) => {
    if (!confirm(`确定要废弃领地 "${territory.name || territory.type}" 吗？此操作不可恢复。`)) {
      return
    }

    setSaving(true)
    try {
      await deleteTerritory(territory.id, userId)
      setTerritories((prev) => prev.filter((t) => t.id !== territory.id))
      if (selectedTerritory?.id === territory.id) {
        setSelectedTerritory(null)
      }
      if (onTerritoryChange) {
        onTerritoryChange({ id: territory.id, deleted: true })
      }
    } catch (err) {
      setError(err.message || '删除失败')
    } finally {
      setSaving(false)
    }
  }, [selectedTerritory, userId, onTerritoryChange])

  if (loading) {
    return (
      <div style={panelStyle}>
        <div style={loadingStyle}>加载中…</div>
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      <h3 style={titleStyle}>我的领地</h3>

      {error && <div style={errorStyle}>{error}</div>}

      {territories.length === 0 ? (
        <div style={emptyStyle}>暂无领地</div>
      ) : (
        <div style={listStyle}>
          {territories.map((territory) => {
            const typeMeta = TERRITORY_TYPE_META[territory.type] || {}
            const isSelected = selectedTerritory?.id === territory.id
            const limits = TERRITORY_RADIUS_LIMITS[territory.type] || { min: 10, max: 500 }

            return (
              <div
                key={territory.id}
                style={{
                  ...cardStyle,
                  ...(isSelected ? cardSelectedStyle : {}),
                  opacity: territory.status === 'abandoned' ? 0.5 : 1,
                }}
                onClick={() => setSelectedTerritory(isSelected ? null : territory)}
              >
                <div style={cardHeaderStyle}>
                  <span style={typeIconStyle}>{typeMeta.icon || '📍'}</span>
                  <div style={cardTitleStyle}>
                    <div style={nameStyle}>{territory.name || typeMeta.name}</div>
                    <div style={metaStyle}>
                      <span style={statusBadgeStyle(territory.status)}>
                        {STATUS_OPTIONS.find((s) => s.value === territory.status)?.label || territory.status}
                      </span>
                      <span>半径: {territory.radius}m</span>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div style={cardDetailStyle}>
                    <div style={detailRow}>
                      <span style={detailLabel}>坐标:</span>
                      <span style={detailValue}>
                        {territory.center_lat?.toFixed(4)}, {territory.center_lon?.toFixed(4)}
                      </span>
                    </div>

                    <div style={detailRow}>
                      <span style={detailLabel}>状态:</span>
                      <select
                        value={territory.status}
                        onChange={(e) => handleStatusChange(territory, e.target.value)}
                        disabled={saving}
                        style={selectStyle}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={detailRow}>
                      <span style={detailLabel}>半径:</span>
                      {editingRadius === territory.id ? (
                        <div style={radiusEditStyle}>
                          <input
                            type="range"
                            min={limits.min}
                            max={limits.max}
                            step="10"
                            value={territory.radius}
                            onChange={(e) =>
                              setSelectedTerritory((prev) => ({
                                ...prev,
                                radius: Number(e.target.value),
                              }))
                            }
                            style={rangeStyle}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span style={radiusValue}>{territory.radius}m</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRadiusChange(territory, territory.radius)
                            }}
                            disabled={saving}
                            style={saveButtonStyle}
                          >
                            保存
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingRadius(null)
                            }}
                            style={cancelButtonStyle}
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingRadius(territory.id)
                          }}
                          style={editButtonStyle}
                        >
                          {territory.radius}m
                        </button>
                      )}
                    </div>

                    <div style={actionRow}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(territory)
                        }}
                        disabled={saving}
                        style={deleteButtonStyle}
                      >
                        废弃领地
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={footerStyle}>
        <button onClick={loadTerritories} style={refreshButtonStyle}>
          刷新
        </button>
      </div>
    </div>
  )
}

// Styles
const panelStyle: CSSProperties = {
  padding: '16px',
  background: 'rgba(15,23,42,0.95)',
  borderRadius: '8px',
  border: '1px solid rgba(148,163,184,0.2)',
  maxHeight: '500px',
  overflow: 'auto',
}

const titleStyle: CSSProperties = {
  margin: '0 0 16px 0',
  fontSize: '16px',
  fontWeight: '600',
  color: '#f8fafc',
}

const loadingStyle: CSSProperties = {
  textAlign: 'center',
  color: '#64748b',
  padding: '24px',
}

const emptyStyle: CSSProperties = {
  textAlign: 'center',
  color: '#64748b',
  padding: '24px',
}

const errorStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid rgba(239,68,68,0.5)',
  background: 'rgba(239,68,68,0.1)',
  color: '#fca5a5',
  fontSize: '13px',
  marginBottom: '12px',
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}

const cardStyle: CSSProperties = {
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid rgba(148,163,184,0.2)',
  background: 'rgba(30,41,59,0.6)',
  cursor: 'pointer',
  transition: 'all 0.15s',
}

const cardSelectedStyle: CSSProperties = {
  borderColor: 'rgba(59,130,246,0.5)',
  background: 'rgba(59,130,246,0.1)',
}

const cardHeaderStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
}

const typeIconStyle: CSSProperties = {
  fontSize: '24px',
}

const cardTitleStyle: CSSProperties = {
  flex: 1,
}

const nameStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: '500',
  color: '#f8fafc',
}

const metaStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  fontSize: '12px',
  color: '#94a3b8',
  marginTop: '2px',
}

const statusBadgeStyle = (status): CSSProperties => {
  const colors = {
    claimed: '#f59e0b',
    active: '#22c55e',
    paused: '#ef4444',
    abandoned: '#6b7280',
  }
  return {
    padding: '2px 6px',
    borderRadius: '4px',
    background: `${colors[status] || '#6b7280'}20`,
    color: colors[status] || '#6b7280',
    fontSize: '11px',
  }
}

const cardDetailStyle: CSSProperties = {
  marginTop: '12px',
  paddingTop: '12px',
  borderTop: '1px solid rgba(148,163,184,0.2)',
}

const detailRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
}

const detailLabel: CSSProperties = {
  fontSize: '12px',
  color: '#94a3b8',
  minWidth: '50px',
}

const detailValue: CSSProperties = {
  fontSize: '12px',
  color: '#e2e8f0',
}

const selectStyle: CSSProperties = {
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid rgba(148,163,184,0.3)',
  background: 'rgba(30,41,59,0.8)',
  color: '#f8fafc',
  fontSize: '12px',
}

const radiusEditStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flex: 1,
}

const rangeStyle: CSSProperties = {
  flex: 1,
  height: '4px',
  cursor: 'pointer',
}

const radiusValue: CSSProperties = {
  fontSize: '12px',
  color: '#e2e8f0',
  minWidth: '45px',
}

const editButtonStyle: CSSProperties = {
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid rgba(148,163,184,0.3)',
  background: 'transparent',
  color: '#60a5fa',
  fontSize: '12px',
  cursor: 'pointer',
}

const saveButtonStyle: CSSProperties = {
  padding: '4px 8px',
  borderRadius: '4px',
  border: 'none',
  background: '#3b82f6',
  color: '#fff',
  fontSize: '11px',
  cursor: 'pointer',
}

const cancelButtonStyle: CSSProperties = {
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid rgba(148,163,184,0.3)',
  background: 'transparent',
  color: '#94a3b8',
  fontSize: '11px',
  cursor: 'pointer',
}

const actionRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: '12px',
}

const deleteButtonStyle: CSSProperties = {
  padding: '6px 12px',
  borderRadius: '4px',
  border: '1px solid rgba(239,68,68,0.5)',
  background: 'rgba(239,68,68,0.1)',
  color: '#ef4444',
  fontSize: '12px',
  cursor: 'pointer',
}

const footerStyle: CSSProperties = {
  marginTop: '16px',
  display: 'flex',
  justifyContent: 'flex-end',
}

const refreshButtonStyle: CSSProperties = {
  padding: '6px 12px',
  borderRadius: '4px',
  border: '1px solid rgba(148,163,184,0.3)',
  background: 'transparent',
  color: '#94a3b8',
  fontSize: '12px',
  cursor: 'pointer',
}
