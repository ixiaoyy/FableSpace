class_name FarmLegacyFixture
extends RefCounted
## 只给冻结历史样本补当前检查所需的零值字段；绝不用于玩家存档解码或迁移。

## 返回测试样本副本，保留已有品质/肥料；只补历史样本的零值字段，不改玩法期望。
static func current(value: Variant) -> Variant:
	if value is Array:
		var result: Array=[]
		for entry: Variant in value: result.append(current(entry))
		return result
	if value is Dictionary:
		var result: Dictionary={}
		for key: String in value: result[key]=current(value[key])
		if result.has("itemId") and result.has("quantity") and not result.has("quality"): result.quality=0
		if result.has("cropId") and result.has("phase") and not result.has("fertilizer"): result.fertilizer=0
		if result.has("skills") and result.skills is Dictionary and not result.skills.has("fishing"): result.skills.fishing={"xp":0,"level":0,"reportedLevel":0}
		if result.has("skills") and result.skills is Dictionary and not result.has("professions"):
			result.professions={}
			for skill: String in result.skills: result.professions[skill]=[]
		if result.has("professions") and result.professions is Dictionary and not result.professions.has("fishing"): result.professions.fishing=[]
		if result.has("skillUpgrades") and result.has("recipeUnlocks") and not result.has("professionChoices"): result.professionChoices=[]
		return result
	return value
