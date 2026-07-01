import { useState, useEffect } from 'react'
import {
  AVAILABLE_CROPS,
  PREMIUM_CROPS,
  FARM_DAILY_STEAL_LIMIT,
  PURCHASE_ITEMS,
  DAILY_LOGIN_BONUS,
  RANK_METRICS,
  calculatePlanting,
  calculateFarmSale,
  calculateFarmSteal,
  calculatePurchase,
  formatFarmCurrency,
  getCropDef,
  getFarmMarketRows,
  getFarmStealRows,
  getInventoryCount,
  checkDailyLoginBonus,
  getVisitorStatsFromProgress,
  getVisitorRankForMetric,
  getAllCropDefs,
} from './spaceFarmModes'

export default function GardenFarmPanel({ enabled, progress, sending, onAction }) {
  const [now, setNow] = useState(Date.now())
  const [showShop, setShowShop] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!enabled) return null

  const safeProgress = progress || {}
  const plots = Array.isArray(safeProgress.plots) ? safeProgress.plots : []
  const inventory = safeProgress.inventory || {}
  const inventoryCount = getInventoryCount(inventory)
  const marketRows = getFarmMarketRows(safeProgress)
  const stealRows = getFarmStealRows(safeProgress)
  const stealsRemaining = stealRows[0]?.stealsRemaining ?? FARM_DAILY_STEAL_LIMIT
  const wallet = Number.isFinite(Number(safeProgress.wallet)) ? Number(safeProgress.wallet) : 0
  const visitorStats = getVisitorStatsFromProgress(safeProgress)
  const bonusCheck = checkDailyLoginBonus(safeProgress)
  const allCropDefs = getAllCropDefs()
  const unlockedItems = safeProgress.unlockedItems || []

  function renderPlot(plot) {
    if (plot.status === 'empty') {
      return (
        <div key={plot.id} className="farm-plot is-empty">
          <div className="farm-plot-title">空地</div>
          <div className="farm-plot-meta">选择一种种子开始种植</div>
          <div className="farm-plot-actions">
            {allCropDefs.map((crop) => {
              if (crop.locked && !unlockedItems.includes('premium_seed_pack')) {
                return null
              }
              const planting = calculatePlanting(safeProgress, crop.id)
              return (
                <button
                  key={crop.id}
                  type="button"
                  disabled={sending || !planting.canPlant}
                  title={planting.canPlant ? '' : `余额不足，需要 ${formatFarmCurrency(planting.seedCost)}`}
                  onClick={() => onAction('plant', { plotId: plot.id, cropId: crop.id })}
                >
                  种{crop.icon} {crop.name} · {formatFarmCurrency(planting.seedCost)}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    const crop = getCropDef(plot.cropId)
    const elapsed = Math.floor((now - plot.plantedAt) / 1000)
    const remaining = Math.max(0, crop.growthTime - elapsed)
    const isMature = remaining <= 0

    return (
      <div key={plot.id} className={`farm-plot ${isMature ? 'is-mature' : 'is-growing'}`}>
        <div className="farm-plot-title">
          {crop.icon} {crop.name} {isMature ? '(成熟)' : ''}
        </div>
        <div className="farm-plot-meta">
          {isMature ? (
            <span>可以收获了！</span>
          ) : (
            <span>剩余: {Math.ceil(remaining / 60)}分钟</span>
          )}
          <span>水量: {plot.waterLevel}/10</span>
        </div>
        <div className="farm-plot-actions">
          {!isMature && (
            <button type="button" disabled={sending || plot.waterLevel >= 10} onClick={() => onAction('water', { plotId: plot.id })}>
              浇水
            </button>
          )}
          {isMature && (
            <button type="button" className="btn-harvest" disabled={sending} onClick={() => onAction('harvest', { plotId: plot.id })}>
              收获
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <section className="guild-quest-panel farm-panel" aria-label="菜园、仓库、交易所与邻田">
      <div className="guild-quest-panel__header">
        <div>
          <span className="guild-kicker">🌱 菜园酒馆</span>
          <h4>我的小菜园</h4>
          <p>种植、收获，再把库存拿到 NPC 管家的交易所看行情。</p>
        </div>
        <div className="guild-header-actions">
          <button type="button" className="guild-status-btn" onClick={() => onAction('status')} disabled={sending}>
            查看状态
          </button>
          <button type="button" className="guild-status-btn" onClick={() => onAction('market')} disabled={sending}>
            行情播报
          </button>
          <button type="button" className="guild-status-btn" onClick={() => onAction('steal-status', { progress: safeProgress })} disabled={sending}>
            邻田机会
          </button>
          <button type="button" className="guild-status-btn" onClick={() => setShowShop(true)}>
            🛒 商店
          </button>
        </div>
      </div>

      <div className="guild-progress-row">
        <span>空地 <strong>{plots.filter(p => p.status === 'empty').length}</strong></span>
        <span>生长中 <strong>{plots.filter(p => p.status === 'planted' && (now - p.plantedAt) / 1000 < getCropDef(p.cropId).growthTime).length}</strong></span>
        <span>可收获 <strong>{plots.filter(p => p.status === 'planted' && (now - p.plantedAt) / 1000 >= getCropDef(p.cropId).growthTime).length}</strong></span>
        <span>仓库藏品 <strong>{inventoryCount}</strong></span>
        <span>收益 <strong>{formatFarmCurrency(wallet)}</strong></span>
        <span>偷菜剩余 <strong>{stealsRemaining}/{FARM_DAILY_STEAL_LIMIT}</strong></span>
      </div>

      {/* Visitor Stats & Bonus Row */}
      <div className="farm-visitor-stats-row">
        <div className="farm-stats-cards">
          {RANK_METRICS.map((metric) => {
            const value = visitorStats[metric.key] || 0
            const rank = getVisitorRankForMetric(metric.key, value)
            return (
              <div key={metric.key} className="farm-stat-card">
                <span className="farm-stat-icon">{metric.icon}</span>
                <span className="farm-stat-label">{metric.label}</span>
                <span className="farm-stat-value">{value}</span>
              </div>
            )
          })}
        </div>
        {bonusCheck.eligible ? (
          <button
            type="button"
            className="farm-bonus-btn"
            disabled={sending}
            onClick={() => onAction('claim-bonus')}
          >
            🎁 每日登录 +{formatFarmCurrency(DAILY_LOGIN_BONUS)}
          </button>
        ) : (
          <span className="farm-bonus-claimed">✓ 今日已领</span>
        )}
      </div>

      <div className="farm-plots-grid">
        {plots.map(renderPlot)}
      </div>

      <div className="farm-inventory">
        <strong>📦 仓库</strong>
        {inventoryCount > 0 ? (
          <div className="farm-inventory-list">
            {Object.entries(inventory).map(([cropId, count]) => {
              if (count <= 0) return null
              const crop = getCropDef(cropId)
              return (
                <div key={cropId} className="inventory-item">
                  {crop.icon} {crop.name} x{count}
                </div>
              )
            })}
          </div>
        ) : (
          <span className="farm-empty-note">仓库还没有作物。先种植并等成熟后收获，再来交易所出售。</span>
        )}
      </div>

      <div className="farm-market-panel" aria-label="菜园交易所行情">
        <div className="farm-market-header">
          <div>
            <strong>📈 菜园交易所</strong>
            <span>西瓜固定锚定 {formatFarmCurrency(100)}，其它作物按今日需求浮动。</span>
          </div>
        </div>
        <div className="farm-market-grid">
          {marketRows.map((row) => {
            const canSell = row.inventory > 0
            const oneSale = calculateFarmSale(safeProgress, row.cropId, 1)
            const allSale = calculateFarmSale(safeProgress, row.cropId, 'all')
            return (
              <div key={row.cropId} className={`farm-market-card trend-${row.trend}`}>
                <div className="farm-market-card__top">
                  <strong>{row.crop.icon} {row.crop.name}</strong>
                  <span>{row.deltaLabel}</span>
                </div>
                <div className="farm-market-price">{formatFarmCurrency(row.price)}</div>
                <p>{row.note}</p>
                <div className="farm-market-meta">
                  <span>库存 {row.inventory}</span>
                  <span>{row.trendLabel}</span>
                </div>
                <div className="farm-market-actions">
                  <button
                    type="button"
                    disabled={sending || !canSell}
                    onClick={() => onAction('sell', { cropId: row.cropId, quantity: 1 })}
                  >
                    卖 1 个{canSell ? ` · ${formatFarmCurrency(oneSale.revenue)}` : ''}
                  </button>
                  <button
                    type="button"
                    disabled={sending || row.inventory <= 1}
                    onClick={() => onAction('sell', { cropId: row.cropId, quantity: 'all' })}
                  >
                    全卖{row.inventory > 1 ? ` · ${formatFarmCurrency(allSale.revenue)}` : ''}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="farm-steal-panel" aria-label="菜园邻田偷菜">
        <div className="farm-market-header">
          <div>
            <strong>🥷 邻田成熟作物</strong>
            <span>每日最多顺手摘 {FARM_DAILY_STEAL_LIMIT} 次；管家会给被摘的院主留通知，不做公开社交墙。</span>
          </div>
        </div>
        <div className="farm-steal-grid">
          {stealRows.map((row) => {
            const theft = calculateFarmSteal(safeProgress, row.id)
            return (
              <div key={row.id} className={`farm-steal-card ${row.canSteal ? 'is-ready' : 'is-locked'}`}>
                <div className="farm-market-card__top">
                  <strong>{row.crop.icon} {row.ownerName}</strong>
                  <span>{row.statusLabel}</span>
                </div>
                <p>{row.note}</p>
                <div className="farm-market-meta">
                  <span>成熟 {row.matureCount}</span>
                  <span>今日剩余 {row.stealsRemaining}</span>
                </div>
                <div className="farm-market-actions">
                  <button
                    type="button"
                    disabled={sending || !row.canSteal}
                    onClick={() => onAction('steal', { plotId: row.id })}
                  >
                    顺手摘 1 个{theft.canSteal ? ` · ${row.crop.name}` : ''}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Shop Modal */}
      {showShop && (
        <div className="farm-shop-overlay" role="dialog" aria-modal="true" aria-label="农场商店">
          <div className="farm-shop-modal">
            <div className="farm-shop-header">
              <h4>🛒 农场商店</h4>
              <button
                type="button"
                className="farm-shop-close"
                onClick={() => setShowShop(false)}
                aria-label="关闭商店"
              >
                ✕
              </button>
            </div>
            <div className="farm-shop-balance">
              <span>💎 我的余额：{formatFarmCurrency(wallet)}</span>
            </div>
            <div className="farm-shop-items">
              {PURCHASE_ITEMS.map((item) => {
                const purchase = calculatePurchase(safeProgress, item.id)
                const owned = unlockedItems.includes(item.id)
                const canBuy = purchase.canBuy && !owned
                return (
                  <div key={item.id} className={`farm-shop-item ${owned ? 'is-owned' : canBuy ? 'is-affordable' : 'is-locked'}`}>
                    <div className="farm-shop-item__icon">{item.icon}</div>
                    <div className="farm-shop-item__info">
                      <strong>{item.name}</strong>
                      <p>{item.description}</p>
                    </div>
                    <div className="farm-shop-item__action">
                      {owned ? (
                        <span className="farm-owned-tag">已拥有</span>
                      ) : (
                        <button
                          type="button"
                          disabled={sending || !canBuy}
                          onClick={() => {
                            onAction('buy', { itemId: item.id })
                            setShowShop(false)
                          }}
                        >
                          {formatFarmCurrency(item.price)}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
