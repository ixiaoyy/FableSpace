class_name FarmWorldRules
extends RefCounted
## 共享地图、确定性选择与占用规则；调用者只传入当前会话或隔离候选状态。

const FarmFenceRules = preload("res://domain/fence_rules.gd")
const LIMIT := 9007199254740991
const VECTORS := {"up":Vector2.UP, "down":Vector2.DOWN, "left":Vector2.LEFT, "right":Vector2.RIGHT}
var regions: Dictionary = {}
var resources: Dictionary = {}
var interactions: Dictionary = {}
var zones: Dictionary = {}
var crops: Dictionary = {}

## 索引地图与作物定义，供农田和碰撞共用；保留地图稳定 ID，不从场景推断权限。
func _init(catalog: Dictionary, crop_definitions: Array) -> void:
	for crop: Dictionary in crop_definitions: crops[crop.cropId]=crop
	for region: Dictionary in catalog.regions:
		regions[region.id] = region
		for resource: Dictionary in region.resources: resources[resource.entityId] = resource
		for interaction: Dictionary in region.interactions: interactions[interaction.entityId] = interaction
		for zone: Dictionary in region.fishingZones: zones[zone.id] = zone

## 复现 TS 的无符号 FNV 选择器；所有命名空间由项目控制，结果不依赖刷新。
static func stable_hash(seed: int, day: int, content_key: String) -> int:
	var hash_value := (2166136261 ^ seed ^ day) & 0xffffffff
	for code in range(content_key.length()):
		hash_value = ((hash_value ^ content_key.unicode_at(code)) * 16777619) & 0xffffffff
	return hash_value

## 根据原春季规则生成天气，Day 1 晴、Day 3 雨。
static func weather_at(seed: int, day: int) -> String:
	if day == 1: return "sunny"
	if day == 3: return "rain"
	var roll := stable_hash(seed, day, "weather") % 100
	return "rain" if roll < 20 else "wind" if roll < 38 else "sunny"

## 将位置记录转换为游戏像素向量；不接受屏幕坐标。
static func point(value: Dictionary) -> Vector2:
	return Vector2(value.x, value.y)

## 按当前像素偏移解析朝向，零向量保留原朝向。
static func facing(delta: Vector2, fallback: String = "down") -> String:
	if delta.is_zero_approx(): return fallback
	return ("right" if delta.x > 0 else "left") if absf(delta.x) >= absf(delta.y) else ("down" if delta.y > 0 else "up")

## 当前四段日程使用固定时间分界，不在引擎迁移中修改。
static func phase(minute: int) -> String:
	return "morning" if minute < 540 else "day" if minute < 1020 else "evening" if minute < 1260 else "night"

## 判断目标是否在角色前方扇区，保留原镰刀方向限制。
static func in_sector(origin: Vector2, target: Vector2, direction: String) -> bool:
	var delta := target - origin
	var vector: Vector2 = VECTORS.get(direction, Vector2.DOWN)
	var forward := delta.dot(vector)
	var side := absf(delta.x * vector.y - delta.y * vector.x)
	return forward > 0.0 and side <= forward

## 查询稳定对象 ID；找不到时返回空字典，不创建替代物。
static func object_by_id(state: Dictionary, id: String) -> Dictionary:
	for object: Dictionary in state.worldObjects:
		if object.id == id: return object
	return {}

## 查询指定格子的持久对象；找不到时返回空字典，不合并打开的大门通行规则。
static func object_at_cell(state: Dictionary, region: String, column: int, row: int, ignored: String = "") -> Dictionary:
	for object: Dictionary in state.worldObjects:
		if object.id == ignored or object.regionId != region or object.row != row: continue
		if column >= object.column and column < object.column + (2 if object.kind == "shipping-bin" else 1): return object
	return {}

## 检查一个格子是否被箱子/建筑占用；移动时可允许打开的大门通行。
static func covers(state: Dictionary, region: String, column: int, row: int, ignored: String = "", open_gate_blocks: bool = true) -> bool:
	var object := object_at_cell(state, region, column, row, ignored)
	if object.is_empty(): return false
	return open_gate_blocks or not FarmFenceRules.is_gate(str(object.kind)) or not bool(object.get("open", false))

## 从地图掩码读取一个合法格子，越界统一返回 false。
func mask(region_id: String, name: String, column: int, row: int) -> bool:
	if not regions.has(region_id): return false
	var region: Dictionary = regions[region_id]
	if column < 0 or row < 0 or column >= region.collision.columns or row >= region.collision.rows: return false
	var data: Array = region.collision.blocked if name == "blocked" else region.get(name, [])
	var index := row * int(region.collision.columns) + column
	return index < data.size() and data[index] == true

## 查询角色脚点实际位于的出口，保持矩形与源数据一致。
func exit_at(region_id: String, position: Vector2) -> Dictionary:
	for exit: Dictionary in regions[region_id].exits:
		if position.x >= exit.x and position.x <= exit.x + exit.width and position.y >= exit.y and position.y <= exit.y + exit.height: return exit
	return {}

## 脚底碰撞复用原地图、资源和对象格占用；NPC 为当前运行位置而非目的地。
func blocked(state: Dictionary, region_id: String, position: Vector2, half_size: Vector2 = Vector2(5,4), ignored: String = "", npcs: Array = []) -> bool:
	if not regions.has(region_id): return true
	var region: Dictionary = regions[region_id]
	if position.x - half_size.x < 0 or position.y - half_size.y < 0 or position.x + half_size.x >= region.widthPixels or position.y + half_size.y >= region.heightPixels: return true
	for row in range(floori((position.y-half_size.y)/16), floori((position.y+half_size.y)/16)+1):
		for column in range(floori((position.x-half_size.x)/16), floori((position.x+half_size.x)/16)+1):
			if mask(region_id,"blocked",column,row) or covers(state,region_id,column,row,ignored,false): return true
			if region_id=="farm":
				var tile: Dictionary=state.farmTiles.get("farm:%d:%d"%[column,row],{})
				if crops.get(tile.get("cropId",""),{}).get("isRaised",false): return true
			for spawn: Dictionary in region.resources:
				if floori(spawn.x/16.0) == column and floori(spawn.y/16.0) == row and state.resources.has(spawn.entityId) and state.resources[spawn.entityId].phase != "cleared": return true
	for npc: Dictionary in npcs:
		if npc.regionId == region_id and absf(npc.x-position.x)<half_size.x+5 and absf(npc.y-position.y)<half_size.y+3: return true
	return false

## 复现有符号 Math.imul 后的每日野采选择，避免与无符号天气哈希混用。
static func forage_appears(id: String, day: int) -> bool:
	var hash_value := 2166136261
	for index in range(id.length()): hash_value = ((hash_value ^ id.unicode_at(index)) * 16777619) & 0xffffffff
	if hash_value >= 0x80000000: hash_value -= 0x100000000
	return absi(hash_value + day) % 3 != 0

## 返回当前四种标准春季野采与枯枝；过滤耕地、持久对象和当日已采点。
func active_forage(state: Dictionary, region_id: String) -> Array:
	var found: Array = []
	for spawn: Dictionary in regions[region_id].resources:
		if spawn.kind not in ["wild-horseradish","daffodil","leek","dandelion","fallen-branch"]: continue
		var column := floori(spawn.x/16.0)
		var row := floori(spawn.y/16.0)
		if covers(state,region_id,column,row): continue
		if region_id == "farm" and state.farmTiles.has("farm:%d:%d"%[column,row]): continue
		var appears: bool = (forage_appears(spawn.entityId+":branch",state.day) or state.weather.current == "wind") if spawn.kind == "fallen-branch" else forage_appears(spawn.entityId,state.day)
		if appears and spawn.entityId not in state.dailyForage.collectedIds: found.append(spawn)
	return found

## 计算足矩形与物件格的严格重叠；仅边缘相接不算重叠。
static func feet_overlap(position: Vector2, tile: Vector2i, half_size: Vector2) -> bool:
	return position.x+half_size.x>tile.x*16 and position.x-half_size.x<(tile.x+1)*16 and position.y+half_size.y>tile.y*16 and position.y-half_size.y<(tile.y+1)*16

## 预检整块摆放位置，返回待清空地与宠物迁移；没有写入副作用。
func placement(state: Dictionary, kind: String, region_id: String, column: int, row: int, ignored: String = "", npcs: Array = []) -> Dictionary:
	var result := {"allowed":false,"clear":[],"pet":null,"replace":"","message":"这个位置有阻挡。"}
	if not regions.has(region_id) or ((kind in ["shipping-bin","scarecrow"] or FarmFenceRules.is_fence(kind)) and region_id != "farm"): return result
	var width := 2 if kind == "shipping-bin" else 1
	var needs_pet := false
	var forage := active_forage(state,region_id)
	for x in range(column,column+width):
		if not mask(region_id,"buildableTiles" if kind == "shipping-bin" else "placeableTiles",x,row) or mask(region_id,"blocked",x,row) or mask(region_id,"waterTiles",x,row) or not exit_at(region_id,Vector2(x*16+8,row*16+8)).is_empty(): return result
		var existing_object := object_at_cell(state,region_id,x,row,ignored)
		if not existing_object.is_empty():
			if width == 1 and FarmFenceRules.can_replace(kind,existing_object):
				result.replace = str(existing_object.id)
			else:
				return result
		for spawn: Dictionary in regions[region_id].resources:
			if floori(spawn.x/16.0)!=x or floori(spawn.y/16.0)!=row: continue
			if state.resources.has(spawn.entityId) and state.resources[spawn.entityId].phase!="cleared": return result
			if spawn in forage: return result
		var tile_id := "farm:%d:%d"%[x,row]
		if region_id=="farm" and state.farmTiles.has(tile_id):
			if state.farmTiles[tile_id].cropId!="": return result
			if kind=="shipping-bin": result.clear.append(tile_id)
		if state.player.regionId==region_id and feet_overlap(point(state.player),Vector2i(x,row),Vector2(5,4)): return result
		for npc: Dictionary in npcs:
			if npc.regionId==region_id and feet_overlap(point(npc),Vector2i(x,row),Vector2(5,3)): return result
		if state.pet!=null and state.pet.regionId==region_id and feet_overlap(point(state.pet),Vector2i(x,row),Vector2(4,3)):
			if kind in ["chest","scarecrow"]: return result
			needs_pet=true
	if needs_pet:
		var best := INF
		for y in range(regions[region_id].collision.rows):
			for x in range(regions[region_id].collision.columns):
				if y==row and x>=column and x<column+width: continue
				var destination := Vector2(x*16+8,y*16+8)
				if blocked(state,region_id,destination,Vector2(4,3),ignored,npcs) or not exit_at(region_id,destination).is_empty(): continue
				if state.player.regionId==region_id and point(state.player).distance_to(destination)<16: continue
				var distance := point(state.pet).distance_to(destination)
				if distance<best:
					best=distance
					result.pet={"regionId":region_id,"x":destination.x,"y":destination.y}
		if result.pet==null: return result
	result.allowed=true
	result.message="可以摆放。" if result.clear.is_empty() and not needs_pet and result.replace == "" else "可以摆放；将整理空耕地、移动伙伴或替换围栏。"
	return result

## 应用刚预检的建筑副作用，调用者必须在同一候选状态中收费并保存。
static func apply_placement(state: Dictionary, result: Dictionary) -> void:
	for id: String in result.clear: state.farmTiles.erase(id)
	if str(result.get("replace","")) != "":
		var object := object_by_id(state, str(result.replace))
		if not object.is_empty(): state.worldObjects.erase(object)
	if result.pet!=null:
		state.pet.merge(result.pet,true)
		state.pet.motion="idle"
		state.pet.pauseRemainingMs=1400
