// Orchestrator API service
export async function fetchOrchestration(sliceId, playerId, lat, lon) {
  const response = await fetch('/api/world/orchestrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slice_id: sliceId,
      player_id: playerId,
      lat,
      lon
    })
  });

  if (!response.ok) {
    throw new Error(`Orchestration failed: ${response.statusText}`);
  }

  return await response.json();
}

// Get rarity color
function getRarityColor(rarity) {
  const colors = {
    common: '#888',
    uncommon: '#4a9eff',
    rare: '#9d4eff',
    legendary: '#ff9d00'
  };
  return colors[rarity] || colors.common;
}

// Apply orchestration results to UI
export function applyOrchestration(output, callbacks) {
  const { observer_effect, broadcasts, events, relationship_strength } = output;

  // Update world density indicator
  if (observer_effect && callbacks.onDensityUpdate) {
    callbacks.onDensityUpdate({
      level: observer_effect.world_density,
      rarity: observer_effect.rarity_level,
      count: observer_effect.observer_count,
      color: getRarityColor(observer_effect.rarity_level)
    });
  }

  // Show broadcasts
  if (broadcasts && broadcasts.length > 0 && callbacks.onBroadcast) {
    broadcasts.forEach(b => {
      callbacks.onBroadcast({ text: b.text, mood: b.mood });
    });
  }

  // Trigger events
  if (events && events.length > 0 && callbacks.onEvent) {
    events.forEach(e => {
      callbacks.onEvent({ type: e.type, priority: e.priority });
    });
  }

  // Update relationship strength
  if (relationship_strength !== undefined && callbacks.onRelationshipUpdate) {
    callbacks.onRelationshipUpdate(relationship_strength);
  }
}
