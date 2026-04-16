export const FANTASY_TYPE_TO_ICON = {
  whispering_grove: 'echo',
  healing_sanctum: 'home',
  supply_outpost: 'shop',
  judgement_tower: 'boss',
  ember_parlor: 'shop',
  lore_academy: 'quest',
  debt_cathedral: 'boss',
  feast_hall: 'shop',
  refuel_station: 'event',
  memory_archive: 'echo',
  spirit_sanctum: 'echo',
  dormant_lot: 'event',
  remedy_post: 'home',
  labor_forge: 'boss',
  contract_spire: 'boss',
}

// 奇幻地点类型 -> 建筑 sprite 键名映射
// 优先用最能体现语义的建筑形态；无匹配时返回 null（回退到向量绘制）
export const FANTASY_TYPE_TO_BUILDING = {
  whispering_grove: 'sanctum',
  healing_sanctum: 'sanctum',
  supply_outpost: 'shop',
  judgement_tower: 'tower',
  ember_parlor: 'shop',
  lore_academy: 'house',
  debt_cathedral: 'sanctum',
  feast_hall: 'shop',
  refuel_station: 'shop',
  memory_archive: 'sanctum',
  spirit_sanctum: 'sanctum',
  dormant_lot: null,
  remedy_post: 'house',
  labor_forge: 'tower',
  contract_spire: 'tower',
}

// 奇幻地点类型 -> 环境装饰 sprite 键名（可选，null 表示不添加装饰）
export const FANTASY_TYPE_TO_DECORATION = {
  whispering_grove: 'tree',
  healing_sanctum: 'tree',
  supply_outpost: 'lamp',
  judgement_tower: null,
  ember_parlor: 'lamp',
  lore_academy: 'tree',
  debt_cathedral: null,
  feast_hall: 'lamp',
  refuel_station: 'lamp',
  memory_archive: null,
  spirit_sanctum: 'tree',
  dormant_lot: null,
  remedy_post: 'tree',
  labor_forge: null,
  contract_spire: null,
}

export function getAssetIconKey(fantasyType) {
  return FANTASY_TYPE_TO_ICON[fantasyType] || null
}

export function getBuildingKey(fantasyType) {
  if (!fantasyType || !(fantasyType in FANTASY_TYPE_TO_BUILDING)) return null
  return FANTASY_TYPE_TO_BUILDING[fantasyType]
}

export function getDecorationKey(fantasyType) {
  if (!fantasyType || !(fantasyType in FANTASY_TYPE_TO_DECORATION)) return null
  return FANTASY_TYPE_TO_DECORATION[fantasyType]
}
