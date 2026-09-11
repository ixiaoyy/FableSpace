class_name FarmSkillRules
extends RefCounted
## 首批已核实劳动的累计经验、即时等级和日结升级记录；不拥有另一份会话状态。

const NAMES := {"farming":"耕种","foraging":"采集","mining":"采矿","fishing":"钓鱼"}
const THRESHOLDS := [100,380,770,1300,2150,3300,4800,6900,10000,15000]
const TOOL_SKILLS := {"hoe":"farming","watering-can":"farming","axe":"foraging","pickaxe":"mining","fishing-rod":"fishing"}
const PROFESSION_OPTIONS := {"foraging":{5:["forester","gatherer"]}}
const PROFESSION_DETAILS := {
	"forester":{"name":"护林人","description":"树木和树桩掉落的木材增加 25%。"},
	"gatherer":{"name":"收集者","description":"地面野采与野生种子收获有 20% 概率获得双份。"},
}

## 根据非负累计经验返回 0–10 级；超过十级门槛仍保留经验，不代替精通系统。
static func level_for(xp: int) -> int:
	var level:=0
	for threshold: int in THRESHOLDS:
		if xp<threshold: break
		level+=1
	return level

## 按原始品质和难度计算鱼获经验；完美捕获乘 2.4，品质提升不反向改变 XP 基数。
static func fishing_xp(quality: int, difficulty: int, perfect: bool = false) -> int:
	var base:=floori(float((quality+1)*3)+float(difficulty)/3.0)
	return floori(base*2.4) if perfect else base

## 给成功劳动的同一候选增加经验并即时升级；调用方负责完整产物检查和候选保存。
static func gain(state: Dictionary, skill: String, amount: int) -> void:
	var progress: Dictionary=state.skills[skill]
	progress.xp+=amount
	progress.level=level_for(int(progress.xp))

## 返回日结等级差并更新展示记录，不表示已领取配方或职业；结果随报告保存，重试不得再次调用。
static func settle_day(state: Dictionary) -> Array:
	var upgrades: Array=[]
	for id: String in NAMES:
		var progress: Dictionary=state.skills[id]
		if progress.level>progress.reportedLevel:
			upgrades.append({"skill":id,"from":progress.reportedLevel,"to":progress.level})
			progress.reportedLevel=progress.level
	return upgrades

## 列出已达等级但尚未学会的实际配方；仅供夜间报告，确认保存后才进入已知配方。
static func recipe_unlocks(state: Dictionary, recipes: Dictionary) -> Array:
	var result: Array=[]
	for id: String in recipes:
		var recipe: Dictionary=recipes[id]
		if id not in state.knownRecipes and not recipe.knownByDefault and state.skills[recipe.skill].level>=recipe.level: result.append(id)
	return result

## 根据当夜跨越的等级生成尚未选择的职业项；当前只开放有两条真实效果的采集 5 级。
static func profession_choices(state: Dictionary, upgrades: Array) -> Array:
	var result: Array=[]
	for upgrade: Dictionary in upgrades:
		var levels: Dictionary=PROFESSION_OPTIONS.get(upgrade.skill,{})
		for level: int in levels:
			if upgrade.from<level and upgrade.to>=level and state.professions[upgrade.skill].is_empty():
				result.append({"skill":upgrade.skill,"level":level,"options":levels[level].duplicate()})
	return result

## 在持久日结报告中确认一个合法职业；成功写入状态并移除该待选项。
static func choose_profession(state: Dictionary, skill: String, level: int, profession: String) -> bool:
	if state.unacknowledgedShippingReport==null: return false
	for choice: Dictionary in state.unacknowledgedShippingReport.professionChoices:
		if choice.skill!=skill or choice.level!=level or profession not in choice.options: continue
		if profession in state.professions[skill]: return false
		state.professions[skill].append(profession)
		state.unacknowledgedShippingReport.professionChoices.erase(choice)
		return true
	return false

## 判断当前存档是否已选择指定技能职业；调用方不从 reportedLevel 推断效果。
static func has_profession(state: Dictionary, skill: String, profession: String) -> bool:
	return state.get("professions",{}).get(skill,[]).has(profession)
