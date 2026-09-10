class_name FarmCropProtection
extends RefCounted
## 当前农场的隔夜乌鸦与稻草人保护；只操作日结候选，不自行保存或运行计时器。

## 判断目标格是否在标准稻草人范围内；格距平方小于81对应包括中心的249格。
static func protects(object: Dictionary, column: int, row: int) -> bool:
	var dx: int=column-int(object.column); var dy: int=row-int(object.row)
	return object.kind=="scarecrow" and object.regionId=="farm" and dx*dx+dy*dy<81

## 生长后返回损失和驱赶报告；可选 visual_events 收集实际落点，只用于提交成功后的表现，重试复用同一候选。
static func settle(state: Dictionary, world: FarmWorldRules, visual_events: Array=[]) -> Dictionary:
	var report: Dictionary={"lost":[],"scared":0}
	var count:=0
	var terrain: Dictionary={}
	for tile: Dictionary in state.farmTiles.values():
		terrain[tile.id]=true
		if tile.cropId!="" and world.crops[tile.cropId].get("crowVulnerable",true): count+=1
	var opportunities:=mini(4,floori(count/16.0))
	if opportunities==0: return report
	for spawn: Dictionary in world.regions.farm.resources:
		if spawn.kind=="tree" and state.resources[spawn.entityId].phase!="cleared":
			terrain["farm:%d:%d"%[floori(spawn.x/16.0),floori(spawn.y/16.0)]]=true
	var keys: Array=terrain.keys(); keys.sort()
	var rng:=RandomNumberGenerator.new(); rng.seed=FarmWorldRules.stable_hash(state.worldSeed,state.day,"farm-crows")
	for crow in range(opportunities):
		if rng.randf()>=0.3: continue
		for attempt in range(10):
			var tile: Dictionary=state.farmTiles.get(keys[rng.randi_range(0,keys.size()-1)],{})
			if tile.is_empty() or tile.cropId=="": continue
			var crop: Dictionary=world.crops[tile.cropId]
			if not crop.get("crowVulnerable",true): continue
			if tile.growthDays<crop.crowEdibleAfterDays: continue
			var protected:=false
			for object: Dictionary in state.worldObjects:
				if protects(object,tile.column,tile.row):
					object.scaredCount+=1; report.scared+=1; protected=true
					visual_events.append({"column":tile.column,"row":tile.row,"outcome":"scared","direction":-1 if tile.column<object.column else 1})
					break
			if not protected:
				report.lost.append({"tileId":tile.id,"cropId":tile.cropId})
				visual_events.append({"column":tile.column,"row":tile.row,"outcome":"lost","direction":-1 if crow%2==0 else 1})
				tile.merge({"phase":"tilled","cropId":"","growthDays":0,"plantedDay":0,"harvestCount":0},true)
			break
	return report
