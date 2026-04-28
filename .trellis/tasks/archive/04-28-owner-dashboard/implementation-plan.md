# Owner Dashboard Implementation Plan

## Task: 04-28-owner-dashboard

## Current State Analysis

### Existing Backend Implementation
- **Endpoint**: `GET /api/v1/taverns/{tavern_id}/metrics`
- **Location**: `backend/src/fablemap_api/core/tavern.py:1908`
- **Returns**:
  - `token_usage`: Total tokens consumed
  - `visitor_stats`: total_visits, unique_visitors
  - `npc_rankings`: Message count per character
  - `sessions`: Chat session info

### Existing Frontend Implementation
- **Dashboard**: `frontend/app/routes/owner.tsx`
- **Data Sources**: `listTaverns`, `listGlobalChatSessions`, `listTavernVisitors`
- **Summary Builder**: `frontend/app/lib/owner-summary.js`
- **API Client**: `getTavernMetrics` exists but not used by owner page

### Gap Analysis

| PRD Feature | Current Status | Gap |
|-------------|---------------|-----|
| 访客统计 | ✅ Covered | - |
| Token 用量统计 | ⚠️ Partial | Missing time-series breakdown |
| NPC 互动排行 | ✅ Covered | - |
| 热门时段 | ❌ Missing | Need to implement |
| 访客反馈 | ❌ Missing | Lower priority |

## Implementation Plan

### Phase 1: Enhance Backend Metrics API

#### 1.1 Add Time-Series Token Usage
**File**: `backend/src/fablemap_api/core/tavern.py`

```python
# In get_tavern_metrics(), enhance token tracking:
- Add daily token breakdown (last 7/30 days)
- Track token consumption per NPC character
- Store token_usage_history: List[Dict[str, Any]]
```

#### 1.2 Add Peak Hours Analysis
**File**: `backend/src/fablemap_api/core/tavern.py`

```python
# Extract from chat sessions:
- Analyze session timestamps
- Compute hour distribution (0-23)
- Return peak_hours: List[int] (sorted by activity)
```

### Phase 2: Frontend Integration

#### 2.1 Update TypeScript Types
**File**: `frontend/app/lib/taverns.ts`

```typescript
// Enhance TavernMetrics type:
export type TokenUsageEntry = {
  date: string
  tokens: number
}

export type TavernMetricsResponse = {
  tavern_id: string
  visitors: number
  total_visits: number
  total_messages: number
  total_tokens: number
  token_history: TokenUsageEntry[]
  top_characters: { character_id: string; character_name: string; message_count: number; token_usage: number }[]
  peak_hours: { hour: number; message_count: number }[]
}
```

#### 2.2 Integrate Metrics API into Owner Dashboard
**File**: `frontend/app/routes/owner.tsx`

Changes:
1. Import `getTavernMetrics` from `taverns.ts`
2. Add metrics loader for each tavern
3. Display token usage chart
4. Display peak hours visualization
5. Show NPC interaction breakdown

#### 2.3 Create Token Usage Chart Component
**New File**: `frontend/app/components/TokenUsageChart.tsx`

Display:
- Bar chart showing daily token consumption
- Toggle: 7 days / 30 days
- Highlight peak usage days

#### 2.4 Create Peak Hours Visualization
**New File**: `frontend/app/components/PeakHoursChart.tsx`

Display:
- 24-hour radial or bar chart
- Color gradient by activity level
- Show best operating hours

## Files to Modify

| File | Changes |
|------|---------|
| `backend/src/fablemap_api/core/tavern.py` | Enhance `get_tavern_metrics` with time-series and peak hours |
| `frontend/app/lib/taverns.ts` | Update `getTavernMetrics` return type |
| `frontend/app/routes/owner.tsx` | Integrate new metrics data |
| `frontend/app/lib/owner-summary.js` | Add token and peak hours processing |

## Files to Create

| File | Purpose |
|------|---------|
| `frontend/app/components/TokenUsageChart.tsx` | Token usage bar chart |
| `frontend/app/components/PeakHoursChart.tsx` | 24-hour activity visualization |

## Verification

1. **Backend**: `curl http://localhost:8000/api/v1/taverns/{id}/metrics` returns enhanced data
2. **Frontend**: `npm run typecheck` passes
3. **Frontend**: `npm run build` succeeds
4. **Manual**: Owner dashboard shows token chart and peak hours

## Priority

- P1: Backend enhancement (token time-series, peak hours)
- P1: Frontend type updates
- P2: Owner dashboard integration
- P3: Chart components (can use simple ASCII/div-based charts first)

## Notes

- Keep existing functionality intact - this is an enhancement, not a rewrite
- Use existing UI patterns from owner.tsx (Card, MetricCard components)
- Token chart can be simple div-based bars before adding a chart library
- Peak hours can be displayed as a horizontal bar chart with 24 segments
