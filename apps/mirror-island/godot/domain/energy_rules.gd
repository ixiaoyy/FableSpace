class_name FarmEnergyRules
extends RefCounted
## 统一基础体力与已接入技能熟练度；疲劳和永久上限成长仍由后续批次处理。

const MAX_STAMINA := 270.0
const LOW_STAMINA := 20.0
const TOOL_COSTS := {"hoe":2.0,"axe":2.0,"pickaxe":2.0,"watering-can":2.0,"fishing-rod":8.0}
const LATE_PENALTIES := [0.0,0.025,0.05,0.075,0.10,0.125,0.25,0.275,0.30,0.325,0.35,0.375,0.50]

## 返回给定已知工具的单次成本；只读取技能表映射，未映射的工具保持基础耗能。
static func unit_cost(state: Dictionary, tool: String) -> float:
	var skill: String=FarmSkillRules.TOOL_SKILLS.get(tool,"")
	return float(TOOL_COSTS[tool])-(0.0 if skill=="" else 0.1*int(state.skills[skill].level))

## 按已知工具和正次数扣除候选体力；不足时返回 false 且不修改，本批不进入负体力。
static func spend(state: Dictionary, tool: String, count: int=1) -> bool:
	if count<=0: return false
	var cost: float=unit_cost(state,tool)*count
	if state.stamina<cost: return false
	state.stamina=float(state.stamina)-cost
	return true

## 按入睡分钟返回正常/晚睡恢复值，保留小数与较高睡前余量；不在此结算金币或推进日期。
static func after_sleep(current: float, minute: int) -> float:
	var index:=clampi(ceili((float(minute)-1440.0)/10.0),0,12)
	var restored:=MAX_STAMINA*(1.0-float(LATE_PENALTIES[index]))
	return maxf(current,restored)
