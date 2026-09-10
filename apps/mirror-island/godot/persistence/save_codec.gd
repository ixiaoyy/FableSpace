class_name FarmSaveCodec
extends RefCounted
## 独立 Godot 存档合同，严格拒绝旧版本、坏字段与不一致世界，不回填或静默覆盖。

const VERSION := 12
const STATE_VERSION := 24
const MAX_BYTES := 8 * 1024 * 1024
var rules: Dictionary
var dialogues: Dictionary
var world: FarmWorldRules
var inventory: FarmInventory

## Godot JSON 将所有数字读成 float；将安全范围内的整数规范为 int，保持 JSON 数字语义并避免枚举成员类型不匹配。
static func normalize_numbers(value: Variant) -> Variant:
	if value is Dictionary:
		var result: Dictionary={}
		for key: Variant in value: result[key]=normalize_numbers(value[key])
		return result
	if value is Array:
		var result: Array=[]
		for entry: Variant in value: result.append(normalize_numbers(entry))
		return result
	if typeof(value)==TYPE_FLOAT and is_finite(value) and absf(value)<=FarmWorldRules.LIMIT and value==floorf(value): return int(value)
	return value

## 使用已发布的规则与地图验证动态状态，不将存档中的 ID 当作资源路径。
func _init(content: Dictionary, lines: Dictionary, catalog: FarmWorldRules) -> void:
	rules=content; dialogues=lines; world=catalog; inventory=FarmInventory.new(content.items)

## 解码唯一当前版本，返回 state/error；无存档由仓库单独表达，不与解析失败混用。
func decode(text: String) -> Dictionary:
	if text.to_utf8_buffer().size()>MAX_BYTES: return {"error":"存档体积超过上限。"}
	var json:=JSON.new()
	if json.parse(text)!=OK or not json.data is Dictionary: return {"error":"存档格式损坏，原记录已保留。"}
	if not _bounded_json(json.data,0,[1000000]): return {"error":"存档结构超过允许范围。"}
	var envelope: Dictionary=normalize_numbers(json.data)
	if envelope.get("engine")!="godot" or envelope.get("version")!=VERSION: return {"error":"此开发存档版本不兼容，原记录已保留。"}
	if not number(envelope.get("updatedAt"),0,FarmWorldRules.LIMIT): return {"error":"存档时间无效。"}
	var error:=validate(envelope.get("state"))
	return {"state":envelope.state.duplicate(true)} if error=="" else {"error":error}

## 在规范化前限制未知存档的嵌套和节点数，避免坏档造成递归耗尽。
static func _bounded_json(value: Variant, depth: int, budget: Array) -> bool:
	budget[0]-=1
	if depth>24 or budget[0]<0: return false
	if value is Dictionary:
		for child: Variant in value.values():
			if not _bounded_json(child,depth+1,budget): return false
	elif value is Array:
		for child: Variant in value:
			if not _bounded_json(child,depth+1,budget): return false
	return true

## 创建完整版本封套；调用者必须先完成字段校验再写入。
static func encode(state: Dictionary) -> String:
	return JSON.stringify({"engine":"godot","version":VERSION,"updatedAt":int(Time.get_unix_time_from_system()*1000),"state":state})

## 验证一个有限数值且不强制转换字符串、布尔或 null，默认要求整数。
static func number(value: Variant, minimum: float, maximum: float, integer: bool = true) -> bool:
	return (typeof(value)==TYPE_INT or typeof(value)==TYPE_FLOAT) and is_finite(float(value)) and value>=minimum and value<=maximum and (not integer or float(value)==floorf(float(value)))

## 校验库存槽位数组及堆叠约束；空物品只允许零数量。
func slots(value: Variant, size: int) -> bool:
	if not value is Array or value.size()!=size: return false
	for slot: Variant in value:
		if not slot is Dictionary: return false
		if not FarmQualityRules.valid(rules.items.get(slot.get("itemId"),{}),slot.get("quality")): return false
		if slot.get("itemId")=="" and slot.get("quantity")==0: continue
		if not rules.items.has(slot.get("itemId")) or not number(slot.get("quantity"),1,rules.items[slot.itemId].maxStack): return false
	return true

## 校验原三层外观的封闭枚举，禁止由存档指定纹理 URL。
static func appearance(value: Variant) -> bool:
	if not value is Dictionary: return false
	var options: Dictionary={"gender":["male","female"],"head":["short","bob","ponytail"],"top":["shirt","overalls","jacket"],"bottom":["trousers","shorts","skirt"],"skinTone":["peach","tan","umber"],"hairColor":["chestnut","black","gold"],"topColor":["mint","cream","coral","sky"],"bottomColor":["denim","sand","forest"]}
	for key: String in options:
		if value.get(key) not in options[key]: return false
	return true

## 逐层校验当前完整状态，首次不一致即返回中文错误，数据不会被补齐。
func validate(raw: Variant) -> String:
	if not raw is Dictionary: return "存档缺少游戏状态。"
	var state: Dictionary=raw
	for key: String in rules.initial:
		if not state.has(key): return "存档缺少字段："+key
	if state.version!=STATE_VERSION or not number(state.day,1,FarmWorldRules.LIMIT-2): return "存档日期或规则版本无效。"
	if not number(state.minuteOfDay,360,1560) or int(state.minuteOfDay)%10!=0: return "存档时间无效。"
	for key: String in ["gold","fishingCastCount","nextWorldEntitySequence"]:
		if not number(state[key],1 if key=="nextWorldEntitySequence" else 0,FarmWorldRules.LIMIT): return "存档计数无效："+key
	if not number(state.worldSeed,0,4294967295) or not number(state.stamina,0,FarmEnergyRules.MAX_STAMINA,false): return "世界种子或体力无效。"
	if not state.skills is Dictionary or state.skills.size()!=FarmSkillRules.NAMES.size(): return "技能集合无效。"
	for id: String in FarmSkillRules.NAMES:
		var skill: Variant=state.skills.get(id)
		if not skill is Dictionary or not number(skill.get("xp"),0,FarmWorldRules.LIMIT) or not number(skill.get("level"),0,10) or skill.level!=FarmSkillRules.level_for(int(skill.xp)) or not number(skill.get("reportedLevel"),0,skill.level): return "技能经验与等级不一致。"
	if not state.professions is Dictionary or state.professions.size()!=FarmSkillRules.NAMES.size(): return "职业集合无效。"
	for id: String in FarmSkillRules.NAMES:
		var selected: Variant=state.professions.get(id)
		if not selected is Array or selected.size()>1: return "职业集合无效。"
		for profession: Variant in selected:
			if not profession is String or profession not in FarmSkillRules.PROFESSION_DETAILS or id!="foraging": return "职业重复或未知。"
		if not selected.is_empty() and state.skills[id].reportedLevel<5: return "职业等级条件不满足。"
	if not state.knownRecipes is Array or state.knownRecipes.size()>rules.recipes.size(): return "已知配方集合无效。"
	var known: Dictionary={}
	for id: Variant in state.knownRecipes:
		if not id is String or not rules.recipes.has(id) or known.has(id): return "配方重复或未知。"
		var recipe: Dictionary=rules.recipes[id]
		if not recipe.knownByDefault and state.skills[recipe.skill].level<recipe.level: return "配方技能条件不满足。"
		known[id]=true
	for id: String in rules.recipes:
		if rules.recipes[id].knownByDefault and not known.has(id): return "默认配方缺失。"
	for key: String in ["lateWarningDay","lastSurfaceStoneRefreshDay","lastSurfaceWeedRefreshDay"]:
		if not number(state[key],0 if key=="lateWarningDay" else 1,state.day): return "资源日期标记无效。"
	if state.inventoryCapacity not in [12,24,36] or state.wateringCanLevel not in [1,2] or not slots(state.inventory,int(state.inventoryCapacity)): return "背包或工具等级无效。"
	if not number(state.wateringCanWater,0,20 if state.wateringCanLevel==1 else 40): return "水壶余量无效。"
	if not _position(state.player) or not appearance(state.player.get("appearance")) or state.player.get("appearanceId") not in ["farmer-original","islander-spring","islander-rain","islander-stone","islander-sunset","islander-pine","islander-lake","islander-lantern","islander-camellia"]: return "角色数据无效。"
	if not state.weather is Dictionary or state.weather.get("day")!=state.day or state.weather.get("current") not in ["sunny","rain","wind"] or state.weather.get("next") not in ["sunny","rain","wind"]: return "天气记录无效。"
	if not state.resources is Dictionary or state.resources.size()!=rules.initial.resources.size(): return "资源集合无效。"
	for id: String in rules.initial.resources:
		var resource: Variant=state.resources.get(id)
		if not resource is Dictionary or resource.get("id")!=id or resource.get("kind")!=rules.initial.resources[id].kind or resource.get("phase") not in ["standing","stump","cleared"] or not resource.has("regrowOnDay"): return "资源记录无效。"
		if resource.kind!="tree" and (resource.phase=="stump" or resource.regrowOnDay!=null): return "地表资源状态不一致。"
		if resource.regrowOnDay!=null and (resource.phase!="cleared" or not number(resource.regrowOnDay,1,FarmWorldRules.LIMIT)): return "树木恢复日期无效。"
	if not state.farmTiles is Dictionary or state.farmTiles.size()>world.regions.farm.collision.blocked.size(): return "农田集合无效。"
	for id: String in state.farmTiles:
		var tile: Variant=state.farmTiles[id]
		if not tile is Dictionary or not number(tile.get("column"),0,world.regions.farm.collision.columns-1) or not number(tile.get("row"),0,world.regions.farm.collision.rows-1): return "农田坐标无效。"
		if id!="farm:%d:%d"%[tile.column,tile.row] or tile.get("id")!=id or tile.get("phase") not in ["tilled","growing","mature"] or not tile.get("watered") is bool: return "农田状态无效。"
		if not world.mask("farm","tillableTiles",tile.column,tile.row): return "农田越出可耕范围。"
		if not number(tile.get("growthDays"),0,FarmWorldRules.LIMIT) or not number(tile.get("plantedDay"),0,state.day) or not number(tile.get("harvestCount"),0,FarmWorldRules.LIMIT): return "作物计数无效。"
		if not number(tile.get("fertilizer"),0,2): return "农田肥料无效。"
		var crop: Dictionary={}
		for definition: Dictionary in rules.crops:
			if definition.cropId==tile.get("cropId"): crop=definition; break
		if crop.get("isRaised",false) and state.player.regionId=="farm" and FarmWorldRules.feet_overlap(FarmWorldRules.point(state.player),Vector2i(tile.column,tile.row),Vector2(5,4)): return "角色与作物架子重叠。"
		if tile.phase=="tilled":
			if tile.get("cropId")!="" or tile.growthDays!=0 or tile.plantedDay!=0 or tile.harvestCount!=0: return "空耕地含有作物数据。"
		elif crop.is_empty() or tile.plantedDay<1 or tile.growthDays>crop.growthDays or (tile.phase=="growing" and tile.growthDays>=crop.growthDays) or (tile.phase=="mature" and tile.growthDays!=crop.growthDays) or (not crop.has("regrowDays") and tile.harvestCount!=0): return "作物生长状态不一致。"
	if not state.friendships is Dictionary or state.friendships.size()!=rules.profiles.size() or not state.npcDialogue is Dictionary or state.npcDialogue.size()!=rules.profiles.size(): return "居民集合无效。"
	for profile: Dictionary in rules.profiles:
		var friend: Variant=state.friendships.get(profile.npcId)
		if not friend is Dictionary or friend.get("npcId")!=profile.npcId or not number(friend.get("points"),0,2500) or not number(friend.get("lastTalkedDay"),0,state.day) or not number(friend.get("lastGiftDay"),0,state.day) or not number(friend.get("giftWeekIndex"),0,floorf(state.day/7.0)) or not number(friend.get("giftsThisWeek"),0,2): return "居民好感记录无效。"
		if friend.lastGiftDay==0 and (friend.giftsThisWeek!=0 or friend.giftWeekIndex!=0): return "礼物日期不一致。"
		if friend.lastGiftDay>0 and (friend.giftsThisWeek<1 or friend.giftWeekIndex!=floorf(friend.lastGiftDay/7.0)): return "礼物周计数不一致。"
		var memory: Variant=state.npcDialogue.get(profile.npcId)
		if not memory is Dictionary or memory.get("acknowledgedStage") not in ["stranger","familiar","friendly"] or not memory.get("recent") is Array or memory.recent.size()>12: return "对话记忆无效。"
		var used: Dictionary={}
		for entry: Variant in memory.recent:
			if not entry is Dictionary or not dialogues.has(entry.get("dialogueId")) or used.has(entry.dialogueId) or not number(entry.get("day"),maxf(1,state.day-3),state.day): return "对话历史无效。"
			used[entry.dialogueId]=true
	if not state.dailyForage is Dictionary or state.dailyForage.get("day")!=state.day or not state.dailyForage.get("collectedIds") is Array or state.dailyForage.collectedIds.size()>world.resources.size(): return "野采日期无效。"
	var collected: Dictionary={}
	for id: Variant in state.dailyForage.collectedIds:
		if not world.resources.has(id) or collected.has(id) or world.resources[id].kind not in ["wild-horseradish","daffodil","leek","dandelion","fallen-branch"]: return "野采记录无效。"
		collected[id]=true
	if state.day==1:
		if state.dailyRequest!=null: return "首日委托无效。"
	else:
		var request: Dictionary=rules.requests[(int(state.day)-2)%(8 if state.day<=9 else rules.requests.size())]
		if not state.dailyRequest is Dictionary or state.dailyRequest.get("day")!=state.day or state.dailyRequest.get("requestId")!=request.requestId or not state.dailyRequest.get("completed") is bool: return "每日委托不一致。"
	if not state.seenEventIds is Array or state.seenEventIds.size()>rules.events.size(): return "事件记录无效。"
	var events: Dictionary={}
	for id: Variant in state.seenEventIds:
		if id not in rules.events or events.has(id): return "事件记录重复或未知。"
		events[id]=true
	if state.pet!=null and not _pet(state.pet,state.day): return "伙伴存档无效。"
	var storage_error:=_storage(state)
	if storage_error!="": return storage_error
	return ""

## 验证区域和有限像素坐标；不会用越界位置自动传送掩盖坏档。
func _position(value: Variant) -> bool:
	return value is Dictionary and world.regions.has(value.get("regionId")) and number(value.get("x"),0,world.regions[value.regionId].widthPixels,false) and number(value.get("y"),0,world.regions[value.regionId].heightPixels,false)

## 校验伙伴的名字、日期、羁绊和运动范围。
func _pet(value: Variant, day: int) -> bool:
	if not _position(value) or value.get("species") not in ["cat","dog"] or value.get("regionId") not in ["farm","cottage"] or not value.get("name") is String: return false
	if value.name.strip_edges()!=value.name or value.name.length()<1 or value.name.length()>12: return false
	for index in range(value.name.length()):
		var code: int=value.name.unicode_at(index)
		if code<32 or (code>=127 and code<=159): return false
	return number(value.get("adoptedDay"),2,day) and number(value.get("bond"),0,100) and number(value.get("lastPettedDay"),0,day) and value.get("facing") in ["up","down","left","right"] and value.get("motion") in ["idle","walking","resting"] and number(value.get("anchorIndex"),0,2) and number(value.get("pauseRemainingMs"),0,2600,false)

## 验证世界对象/掉落唯一性和出货汇总，防止越界、重叠或恢复后重复结算。
func _storage(state: Dictionary) -> String:
	if not state.worldObjects is Array or not state.worldDrops is Array or state.worldObjects.size()>32768 or state.worldDrops.size()>32768 or not state.shippingQueue is Array: return "世界物件集合无效。"
	var ids: Dictionary={}; var cells: Dictionary={}; var bins:=0
	for entity: Variant in state.worldObjects+state.worldDrops:
		if not entity is Dictionary or not entity.get("id") is String or ids.has(entity.id) or not world.regions.has(entity.get("regionId")): return "世界物件标识无效。"
		if entity.id!="farm-shipping-bin-default":
			var suffix: String=entity.id.trim_prefix("world-")
			if not entity.id.begins_with("world-") or not suffix.is_valid_int() or str(suffix.to_int())!=suffix or suffix.to_int()<1 or suffix.to_int()>=state.nextWorldEntitySequence: return "世界物件序号无效。"
		elif entity.get("kind")!="shipping-bin": return "默认出货箱标识无效。"
		ids[entity.id]=true
	for object: Variant in state.worldObjects:
		if object.get("kind") not in ["chest","shipping-bin","scarecrow"] or not number(object.get("column"),0,world.regions[object.regionId].collision.columns-1) or not number(object.get("row"),0,world.regions[object.regionId].collision.rows-1): return "世界物件位置无效。"
		if object.kind=="scarecrow" and (object.regionId!="farm" or not number(object.get("scaredCount"),0,FarmWorldRules.LIMIT)): return "稻草人状态无效。"
		if object.kind=="chest" and (object.get("colorId") not in FarmStorageRules.COLORS or not slots(object.get("slots"),36)): return "箱子内容无效。"
		if object.kind=="shipping-bin":
			if object.regionId!="farm": return "出货箱区域无效。"
			bins+=1
		for x in range(object.column,object.column+(2 if object.kind=="shipping-bin" else 1)):
			var key: String="%s:%d:%d"%[object.regionId,x,object.row]
			if cells.has(key) or not world.mask(object.regionId,"buildableTiles" if object.kind=="shipping-bin" else "placeableTiles",x,object.row) or world.mask(object.regionId,"blocked",x,object.row) or world.mask(object.regionId,"waterTiles",x,object.row) or not world.exit_at(object.regionId,Vector2(x*16+8,object.row*16+8)).is_empty(): return "世界物件存在重叠或非法位置。"
			cells[key]=true
			if object.regionId=="farm" and state.farmTiles.get(key,{}).get("cropId","")!="": return "物件覆盖了作物。"
	if bins<1: return "农场缺少出货箱。"
	for drop: Variant in state.worldDrops:
		if not number(drop.get("originX"),0,world.regions[drop.regionId].widthPixels,false) or not number(drop.get("originY"),0,world.regions[drop.regionId].heightPixels,false) or not slots([drop.get("stack")],1) or drop.stack.itemId=="": return "掉落物记录无效。"
	for entry: Variant in state.shippingQueue:
		if not slots([entry],1) or not rules.items.get(entry.itemId,{}).get("canShip",false): return "出货队列无效。"
	var report: Variant=state.unacknowledgedShippingReport
	if report==null:
		if state.skills.foraging.reportedLevel>=5 and state.professions.foraging.is_empty(): return "采集五级职业尚未选择。"
		return ""
	if not report is Dictionary or not number(report.get("settledDay"),1,state.day-1) or not number(report.get("totalGold"),0,FarmWorldRules.LIMIT) or not report.get("categories") is Array: return "出货报告无效。"
	if not report.get("skillUpgrades") is Array or report.skillUpgrades.size()>FarmSkillRules.NAMES.size(): return "技能升级报告无效。"
	var skill_ids: Dictionary={}
	for upgrade: Variant in report.skillUpgrades:
		if not upgrade is Dictionary or not FarmSkillRules.NAMES.has(upgrade.get("skill")) or skill_ids.has(upgrade.skill): return "技能升级记录重复或未知。"
		if not number(upgrade.get("from"),0,9) or not number(upgrade.get("to"),1,10) or upgrade.from>=upgrade.to or upgrade.to!=state.skills[upgrade.skill].level or upgrade.to!=state.skills[upgrade.skill].reportedLevel: return "技能升级记录不一致。"
		skill_ids[upgrade.skill]=true
	if not report.get("recipeUnlocks") is Array or report.recipeUnlocks.size()>rules.recipes.size(): return "配方报告无效。"
	var recipe_ids: Dictionary={}
	for id: Variant in report.recipeUnlocks:
		if not id is String or not rules.recipes.has(id) or id in state.knownRecipes or recipe_ids.has(id): return "待学配方重复或未知。"
		var recipe: Dictionary=rules.recipes[id]
		if recipe.knownByDefault or state.skills[recipe.skill].level<recipe.level: return "待学配方条件不满足。"
		recipe_ids[id]=true
	if not report.get("professionChoices") is Array or report.professionChoices.size()>1: return "职业选择报告无效。"
	var pending_foraging:=false
	for choice: Variant in report.professionChoices:
		if not choice is Dictionary or choice.get("skill")!="foraging" or choice.get("level")!=5 or choice.get("options")!=FarmSkillRules.PROFESSION_OPTIONS.foraging[5]: return "职业选择报告无效。"
		if not state.professions.foraging.is_empty(): return "职业选择状态重复。"
		var crossed:=false
		for upgrade: Dictionary in report.skillUpgrades:
			if upgrade.skill=="foraging" and upgrade.from<5 and upgrade.to>=5: crossed=true
		if not crossed: return "职业选择缺少对应升级。"
		pending_foraging=true
	if state.skills.foraging.reportedLevel>=5 and state.professions.foraging.is_empty() and not pending_foraging: return "采集五级职业尚未选择。"
	var crows: Variant=report.get("crows")
	if not crows is Dictionary or not crows.get("lost") is Array or crows.lost.size()>4 or not number(crows.get("scared"),0,4-crows.lost.size()): return "乌鸦报告无效。"
	var lost_ids: Dictionary={}
	for lost: Variant in crows.lost:
		if not lost is Dictionary or not state.farmTiles.has(lost.get("tileId")) or not world.crops.has(lost.get("cropId")) or lost_ids.has(lost.tileId): return "作物损失记录无效。"
		if state.farmTiles[lost.tileId].phase!="tilled": return "损失地块状态不一致。"
		lost_ids[lost.tileId]=true
	var total:=0; var category_ids: Dictionary={}; var item_ids: Dictionary={}
	for category: Variant in report.categories:
		if not category is Dictionary or category.get("category") not in ["farming","foraging","fishing","mining","other"] or category_ids.has(category.category) or not category.get("entries") is Array: return "出货分类无效。"
		category_ids[category.category]=true
		var subtotal:=0
		for entry: Variant in category.entries:
			if not entry is Dictionary or not rules.items.has(entry.get("itemId")): return "出货物品无效。"
			if not FarmQualityRules.valid(rules.items[entry.itemId],entry.get("quality")) or rules.prices.get(entry.itemId)==null: return "出货品质无效。"
			var key: String=entry.itemId+":"+str(entry.quality)
			var price: int=FarmQualityRules.price(int(rules.prices[entry.itemId]),entry.quality)
			if item_ids.has(key) or rules.items[entry.itemId].shippingCategory!=category.category or not number(entry.get("quantity"),1,FarmWorldRules.LIMIT/maxi(1,price)) or entry.get("unitPrice")!=price or entry.get("totalGold")!=entry.quantity*price: return "出货金额不一致。"
			subtotal+=int(entry.totalGold); item_ids[key]=true
		if category.get("totalGold")!=subtotal: return "出货分类金额不一致。"
		total+=subtotal
	return "" if total==report.totalGold else "出货总金额不一致。"
