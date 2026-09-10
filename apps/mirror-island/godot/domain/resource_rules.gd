class_name FarmResourceRules
extends RefCounted
## 采集与农田规则的 GDScript 实现；不包含动画、输入和保存。

var world: FarmWorldRules
var inventory: FarmInventory
var rules: Dictionary
var crops: Dictionary = {}
var seeds: Dictionary = {}

## 绑定共享库存、地图与内容，复用世界作物并索引种子；内容只读，不复制另一份玩法状态。
func _init(world_rules: FarmWorldRules, inventory_rules: FarmInventory, content: Dictionary) -> void:
	world=world_rules
	inventory=inventory_rules
	rules=content
	crops=world.crops
	for crop: Dictionary in crops.values():
		seeds[crop.seedId]=crop

## 判断当前角色是否位于相邻格且处于四十二像素范围内。
func near_tile(state: Dictionary, column: int, row: int) -> bool:
	return column>=0 and row>=0 and absi(floori(state.player.x/16.0)-column)<=1 and absi(floori(state.player.y/16.0)-row)<=1 and FarmWorldRules.point(state.player).distance_to(Vector2(column*16+8,row*16+8))<=42

## 对候选农田使用工具、种子或空手，返回结果码；actors 为当前居民，架子不得种在角色脚下。
func farm(state: Dictionary, column: int, row: int, item_id: String, direction: String, actors: Array = []) -> String:
	if state.player.regionId!="farm" or not near_tile(state,column,row): return "too-far"
	if item_id!="" and inventory.quantity(state.inventory,item_id)<1: return "no-effect"
	if FarmWorldRules.covers(state,"farm",column,row): return "no-effect"
	var id := "farm:%d:%d"%[column,row]
	if not state.farmTiles.has(id):
		if item_id!="hoe": return "missing-tile"
		if not world.mask("farm","tillableTiles",column,row): return "missing-tile"
		for spawn: Dictionary in world.regions.farm.resources:
			if floori(spawn.x/16.0)==column and floori(spawn.y/16.0)==row and state.resources.has(spawn.entityId) and state.resources[spawn.entityId].phase!="cleared": return "missing-tile"
		if not FarmEnergyRules.spend(state,"hoe"): return "insufficient-stamina"
		state.farmTiles[id]={"id":id,"column":column,"row":row,"phase":"tilled","cropId":"","growthDays":0,"watered":state.weather.current=="rain","plantedDay":0,"harvestCount":0,"fertilizer":0}
		return "tilled"
	var tile: Dictionary=state.farmTiles[id]
	if item_id in ["basic-fertilizer","basic-retaining-soil"]:
		if tile.fertilizer!=0: return "already-fertilized"
		if item_id=="basic-fertilizer" and tile.phase!="tilled" and (tile.phase!="growing" or tile.growthDays>=crops[tile.cropId].seedStageDays): return "fertilizer-too-late"
		if not inventory.consume(state.inventory,item_id,1): return "missing-item"
		tile.fertilizer=1 if item_id=="basic-fertilizer" else 2
		return "fertilized" if tile.fertilizer==1 else "retaining-soil-applied"
	if seeds.has(item_id) and tile.phase=="tilled":
		if seeds[item_id].get("isRaised",false):
			var cell:=Vector2i(column,row)
			if FarmWorldRules.feet_overlap(FarmWorldRules.point(state.player),cell,Vector2(5,4)): return "trellis-occupied"
			for actor: Dictionary in actors:
				if actor.regionId=="farm" and FarmWorldRules.feet_overlap(FarmWorldRules.point(actor),cell,Vector2(5,3)): return "trellis-occupied"
		if not inventory.consume(state.inventory,item_id,1): return "no-effect"
		tile.merge({"phase":"growing","cropId":seeds[item_id].cropId,"growthDays":0,"watered":tile.watered or state.weather.current=="rain","plantedDay":state.day,"harvestCount":0},true)
		return "planted"
	if item_id=="axe" and crops.get(tile.cropId,{}).get("isRaised",false):
		if not FarmEnergyRules.spend(state,"axe"): return "insufficient-stamina"
		tile.merge({"phase":"tilled","cropId":"","growthDays":0,"plantedDay":0,"harvestCount":0},true)
		return "crop-cleared"
	if item_id=="watering-can" and tile.phase in ["growing","tilled"]:
		var eligible: Array=[]
		var vector: Vector2=FarmWorldRules.VECTORS.get(direction,Vector2.DOWN)
		for offset in range(3 if state.wateringCanLevel==2 and direction!="" else 1):
			var x := column+int(vector.x)*offset
			var y := row+int(vector.y)*offset
			var key := "farm:%d:%d"%[x,y]
			if not world.mask("farm","tillableTiles",x,y) or FarmWorldRules.covers(state,"farm",x,y) or not state.farmTiles.has(key): break
			var candidate: Dictionary=state.farmTiles[key]
			if candidate.phase!="mature" and not candidate.watered: eligible.append(candidate)
		if eligible.is_empty(): return "waiting"
		var energy_uses:=floori(float(state.stamina)/FarmEnergyRules.unit_cost(state,"watering-can"))
		var affordable := mini(eligible.size(),mini(int(state.wateringCanWater),energy_uses))
		if affordable<=0: return "empty-watering-can" if state.wateringCanWater<=0 else "insufficient-stamina"
		# Lv2 仍逐格计水和熟练度耗能，不能当作原作铜壶蓄力。
		if not FarmEnergyRules.spend(state,"watering-can",affordable): return "insufficient-stamina"
		for index in range(affordable): eligible[index].watered=true
		state.wateringCanWater-=affordable
		return "watered"
	if item_id=="" and tile.phase=="mature":
		var crop: Dictionary=crops[tile.cropId]
		if crop.get("harvestTool","")=="scythe": return "requires-scythe"
		var output:=harvest_item_id(state,tile,crop)
		var amount:=harvest_amount(state,tile,crop)
		var quality:=harvest_quality(state,tile,crop)
		var slots: Array=state.inventory.duplicate(true)
		if not inventory.add(slots,output,1,quality): return "inventory-full"
		if amount>1 and not inventory.add(slots,output,amount-1,quality if crop.has("harvestItems") else 0): return "inventory-full"
		state.inventory=slots
		_finish_harvest(state,tile,crop,amount)
		return "harvested-double" if crop.has("harvestItems") and amount==2 else "harvested"
	return "no-effect"

## 返回本次成熟作物的实际物品 ID；季节野种按世界、地块与播种日稳定等概率选择，普通作物仍返回 cropId。
func harvest_item_id(state: Dictionary, tile: Dictionary, crop: Dictionary) -> String:
	var outputs: Array=crop.get("harvestItems",[])
	if outputs.is_empty(): return crop.cropId
	var key: String="%s:%d:wild-seed-output"%[tile.id,tile.plantedDay]
	return outputs[FarmWorldRules.stable_hash(state.worldSeed,tile.plantedDay,key)%outputs.size()]

## 按收获前技能与土壤计算首个产物品质；野种使用采集等级并忽略肥料，复收用独立稳定序号。
func harvest_quality(state: Dictionary, tile: Dictionary, crop: Dictionary) -> int:
	var forage: bool=crop.has("harvestItems")
	var level: int=state.skills["foraging" if forage else "farming"].level
	return FarmQualityRules.roll(state.worldSeed,tile.plantedDay,"%s:%d:harvest"%[tile.id,tile.harvestCount],level,1 if tile.fertilizer==1 else 0,forage)

## 返回本次完整产量；土豆使用有界几何分布，收集者对野生种子独立判定双份。
func harvest_amount(state: Dictionary, tile: Dictionary, crop: Dictionary) -> int:
	var chance: float=crop.get("extraHarvestChance",0.0)
	var amount:=1
	if chance>0.0:
		var key: String="%s:%d:%d:crop-extra"%[tile.id,tile.plantedDay,tile.harvestCount]
		var value: int=FarmWorldRules.stable_hash(state.worldSeed,tile.plantedDay,key)
		# 半个步长使均匀值严格位于 (0,1)，避免 log(0)；当前可信内容仅有土豆 0.2。
		var uniform: float=(float(value)+0.5)/4294967296.0
		amount+=floori(log(uniform)/log(chance))
	if crop.has("harvestItems") and gatherer_double(state,tile.plantedDay,"%s:%d:wild-harvest"%[tile.id,tile.harvestCount]): amount*=2
	return amount

## 产物完整入包后按株和野采件数发经验并更新地块；失败候选不调用。
func _finish_harvest(state: Dictionary, tile: Dictionary, crop: Dictionary, amount: int = 1) -> void:
	FarmSkillRules.gain(state,"farming",int(crop.harvestXp))
	if crop.get("foragingHarvestXp",0)>0: FarmSkillRules.gain(state,"foraging",int(crop.foragingHarvestXp)*amount)
	if crop.get("regrowDays",0)>0:
		tile.harvestCount+=1
		tile.phase="growing"
		tile.growthDays=maxi(0,int(crop.growthDays)-int(crop.regrowDays))
	else:
		tile.merge({"phase":"tilled","cropId":"","growthDays":0,"plantedDay":0,"harvestCount":0},true)
	tile.watered=tile.watered or state.weather.current=="rain"

## 按朝向挥镰刀并返回结果码；暂用四十二像素、混合目标合计三个，满包整次无变化且不耗体力。
func sweep_scythe(state: Dictionary, direction: String) -> String:
	if inventory.quantity(state.inventory,"scythe")<1: return "wrong-tool"
	if not FarmWorldRules.VECTORS.has(direction): return "wrong-direction"
	var origin:=FarmWorldRules.point(state.player)
	var targets: Array[Dictionary]=[]
	for spawn: Dictionary in world.regions[state.player.regionId].resources:
		if spawn.kind=="weed" and state.resources[spawn.entityId].phase=="standing":
			var position:=FarmWorldRules.point(spawn)
			if origin.distance_to(position)<=42 and FarmWorldRules.in_sector(origin,position,direction):
				targets.append({"id":spawn.entityId,"position":position,"crop":false})
	if state.player.regionId=="farm":
		for tile: Dictionary in state.farmTiles.values():
			if tile.phase!="mature" or crops.get(tile.cropId,{}).get("harvestTool","")!="scythe": continue
			var position:=Vector2(tile.column*16+8,tile.row*16+8)
			if origin.distance_to(position)<=42 and FarmWorldRules.in_sector(origin,position,direction) and not FarmWorldRules.covers(state,"farm",tile.column,tile.row):
				targets.append({"id":tile.id,"position":position,"crop":true})
	targets.sort_custom(func(a: Dictionary,b: Dictionary)->bool:
		var da:=origin.distance_squared_to(a.position); var db:=origin.distance_squared_to(b.position)
		return a.id<b.id if is_equal_approx(da,db) else da<db)
	targets=targets.slice(0,3)
	if targets.is_empty(): return "no-effect"
	var slots: Array=state.inventory.duplicate(true)
	var harvested:=false
	for target: Dictionary in targets:
		if target.crop:
			var tile: Dictionary=state.farmTiles[target.id]
			if not inventory.add(slots,tile.cropId,1,harvest_quality(state,tile,crops[tile.cropId])): return "inventory-full"
			harvested=true
		elif FarmWorldRules.stable_hash(state.worldSeed,state.day,"weed-fiber:"+target.id)%2==0:
			if not inventory.add(slots,"fiber",1): return "inventory-full"
	state.inventory=slots
	for target: Dictionary in targets:
		if target.crop:
			var tile: Dictionary=state.farmTiles[target.id]
			_finish_harvest(state,tile,crops[tile.cropId])
		else: state.resources[target.id].phase="cleared"
	return "harvested" if harvested else "cut"

## 水源补水无体力消耗，仍要求拥有喷壶和相邻范围。
func refill(state: Dictionary, column: int, row: int) -> String:
	if inventory.quantity(state.inventory,"watering-can")<1 or not world.mask(state.player.regionId,"waterTiles",column,row): return "no-effect"
	if not near_tile(state,column,row): return "too-far"
	var capacity := 20 if state.wateringCanLevel==1 else 40
	if state.wateringCanWater>=capacity: return "no-effect"
	state.wateringCanWater=capacity
	return "refilled"

## 按目标 ID、手持物品和方向处理资源，返回结果码；树木联合预检木材与可选种子后才扣体力和发经验。
func gather(state: Dictionary, target_id: String, item_id: String, direction: String) -> String:
	var spawn: Dictionary=world.resources.get(target_id,{})
	if spawn.is_empty() or spawn.regionId!=state.player.regionId: return "missing-target"
	if FarmWorldRules.point(state.player).distance_to(FarmWorldRules.point(spawn))>42: return "too-far"
	if spawn.kind in ["wild-horseradish","daffodil","leek","dandelion","fallen-branch"]:
		if spawn not in world.active_forage(state,spawn.regionId): return "inactive"
		if spawn.kind=="fallen-branch":
			if item_id!="axe" or inventory.quantity(state.inventory,"axe")<1: return "requires-axe"
			if not inventory.can_add(state.inventory,"wood",1): return "inventory-full"
			if not FarmEnergyRules.spend(state,"axe"): return "insufficient-stamina"
			inventory.add(state.inventory,"wood",1)
			state.dailyForage.collectedIds.append(target_id)
			FarmSkillRules.gain(state,"foraging",1)
			return "branch-chopped"
		if item_id!="": return "inactive"
		var output: String=spawn.kind
		var quality:=FarmQualityRules.roll(state.worldSeed,state.day,spawn.entityId+":forage",state.skills.foraging.level,0,true)
		var amount:=2 if gatherer_double(state,state.day,spawn.entityId+":ground-forage") else 1
		if not inventory.add(state.inventory,output,amount,quality): return "inventory-full"
		state.dailyForage.collectedIds.append(target_id)
		FarmSkillRules.gain(state,"foraging",7*amount)
		return "collected-double" if amount==2 else "collected"
	var resource: Dictionary=state.resources.get(target_id,{})
	if resource.is_empty() or resource.phase=="cleared": return "depleted"
	var tool: String={"tree":"axe","stone":"pickaxe","weed":"scythe"}[spawn.kind]
	if item_id!=tool or inventory.quantity(state.inventory,tool)<1: return "wrong-tool"
	if spawn.kind=="weed":
		if not FarmWorldRules.in_sector(FarmWorldRules.point(state.player),FarmWorldRules.point(spawn),direction): return "wrong-direction"
		return sweep_scythe(state,direction)
	var standing_tree: bool=spawn.kind=="tree" and resource.phase=="standing"
	var amount := (12 if standing_tree else 5) if spawn.kind=="tree" else 1
	if spawn.kind=="tree" and FarmSkillRules.has_profession(state,"foraging","forester"): amount=floori(amount*1.25)
	var output := "wood" if spawn.kind=="tree" else "stone"
	var seed_id:=tree_seed_drop(state,spawn,resource)
	var candidate: Array=state.inventory.duplicate(true)
	if not inventory.add(candidate,output,amount): return "inventory-full"
	if seed_id!="" and not inventory.add(candidate,seed_id,1): return "inventory-full"
	if spawn.kind=="tree" and not inventory.add(candidate,"sap",5 if standing_tree else 1): return "inventory-full"
	if not FarmEnergyRules.spend(state,tool): return "insufficient-stamina"
	FarmSkillRules.gain(state,"mining" if spawn.kind=="stone" else "foraging",1 if spawn.kind=="stone" else 14 if standing_tree else 2)
	resource.phase="stump" if standing_tree else "cleared"
	resource.regrowOnDay=state.day+7 if spawn.kind=="tree" and resource.phase=="cleared" and spawn.regionId!="farm" else null
	state.inventory=candidate
	return "mined" if spawn.kind=="stone" else ("chopped-with-seed" if seed_id!="" else "chopped") if resource.phase=="stump" else "stump-cleared"

## 使用职业确认后的状态与独立稳定键判定 20% 双份；失败重试和同日同来源不会重抽。
func gatherer_double(state: Dictionary, day: int, key: String) -> bool:
	return FarmSkillRules.has_profession(state,"foraging","gatherer") and FarmWorldRules.stable_hash(state.worldSeed,day,key+":gatherer")%5==0

## 返回本次砍倒树木掉落的对应种子 ID；需已确认采集 1 级，75% 稳定概率确保失败重试不重抽。
func tree_seed_drop(state: Dictionary, spawn: Dictionary, resource: Dictionary) -> String:
	if spawn.kind!="tree" or resource.phase!="standing" or state.skills.foraging.reportedLevel<1: return ""
	var species: String=rules.treeSpeciesById.get(spawn.entityId,"")
	var item_id: String=rules.treeSeedItems.get(species,"")
	if item_id=="": return ""
	var threshold:=roundi(float(rules.treeSeedOnChopChance)*10000.0)
	var roll:=FarmWorldRules.stable_hash(state.worldSeed,state.day,spawn.entityId+":seed-on-chop")%10000
	return item_id if roll<threshold else ""

## 先按当日水分结算生长，再抽取保水；日期尚未递增，次日雨水由会话覆盖。
func settle_crops(state: Dictionary) -> void:
	for tile: Dictionary in state.farmTiles.values():
		if tile.phase=="growing" and tile.watered:
			tile.growthDays+=1
			if tile.growthDays>=crops[tile.cropId].growthDays: tile.phase="mature"
		tile.watered=tile.watered and tile.fertilizer==2 and FarmWorldRules.stable_hash(state.worldSeed,state.day,tile.id+":retain-water")%3==0

## 在已递增的日期恢复原数量资源；建筑占用不累积补偿名额。
func regenerate(state: Dictionary) -> void:
	for resource: Dictionary in state.resources.values():
		var spawn: Dictionary=world.resources[resource.id]
		if resource.kind=="tree" and resource.phase=="cleared" and resource.regrowOnDay!=null and resource.regrowOnDay<=state.day and not FarmWorldRules.covers(state,spawn.regionId,floori(spawn.x/16.0),floori(spawn.y/16.0)):
			resource.phase="standing"; resource.regrowOnDay=null
	for rule in [["stone","foothills",2,"surface-stone:"],["weed","farm",1,"surface-weed:"],["weed","foothills",2,"surface-weed:"],["weed","lakeshore",1,"surface-weed:"]]:
		var field := "lastSurfaceStoneRefreshDay" if rule[0]=="stone" else "lastSurfaceWeedRefreshDay"
		if state[field]==state.day: continue
		var candidates: Array=[]
		for spawn: Dictionary in world.regions[rule[1]].resources:
			if spawn.kind!=rule[0] or state.resources[spawn.entityId].phase!="cleared": continue
			var x:=floori(spawn.x/16.0); var y:=floori(spawn.y/16.0)
			if FarmWorldRules.covers(state,rule[1],x,y) or (rule[0]=="weed" and rule[1]=="farm" and state.farmTiles.has("farm:%d:%d"%[x,y])): continue
			candidates.append(spawn)
		candidates.sort_custom(func(a: Dictionary,b: Dictionary)->bool:
			var ha:=FarmWorldRules.stable_hash(state.worldSeed,state.day,rule[3]+a.entityId); var hb:=FarmWorldRules.stable_hash(state.worldSeed,state.day,rule[3]+b.entityId)
			return a.entityId<b.entityId if ha==hb else ha<hb)
		for spawn: Dictionary in candidates.slice(0,rule[2]): state.resources[spawn.entityId].phase="standing"
	state.lastSurfaceStoneRefreshDay=state.day
	state.lastSurfaceWeedRefreshDay=state.day
