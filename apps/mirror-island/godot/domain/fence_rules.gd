class_name FarmFenceRules
extends RefCounted

const WOOD_FENCE := "wood-fence"
const STONE_FENCE := "stone-fence"
const GATE := "gate"
const KINDS := [WOOD_FENCE, STONE_FENCE, GATE]
const DURABILITY_DAYS := {
	WOOD_FENCE: [48, 52],
	STONE_FENCE: [106, 109],
	GATE: [360, 360],
}


## 判断世界对象或物品 ID 是否属于围栏体系。
## kind 为对象 kind 或物品 ID，返回 true 表示可按围栏规则处理。
static func is_fence(kind: String) -> bool:
	return kind in KINDS


## 判断世界对象或物品 ID 是否为大门。
## kind 为对象 kind 或物品 ID，返回 true 表示该对象可开合。
static func is_gate(kind: String) -> bool:
	return kind == GATE


## 根据稳定种子计算一个围栏对象的寿命天数。
## state 提供 worldSeed，object 提供 id、kind、placedDay；返回包含端点的寿命天数。
static func durability_days(state: Dictionary, object: Dictionary) -> int:
	var kind := str(object.get("kind", ""))
	var span: Array = DURABILITY_DAYS.get(kind, [0, 0])
	var low := int(span[0])
	var high := int(span[1])
	if high <= low:
		return low
	var placed_day := int(object.get("placedDay", 1))
	var key := "%s:%s:%s" % [kind, str(object.get("id", "")), placed_day]
	return low + int(FarmWorldRules.stable_hash(int(state.get("worldSeed", 0)), placed_day, key) % (high - low + 1))


## 给刚放置的围栏对象写入耐久状态。
## object 会被原地修改；state 提供当前天数；大门额外写入 closed 状态。
static func apply_placed_fields(object: Dictionary, state: Dictionary) -> void:
	object.placedDay = int(state.get("day", 1))
	object.damaged = false
	if is_gate(str(object.get("kind", ""))):
		object.open = false


## 判断本次放置是否可替换已有围栏。
## incoming_kind 为新物品 ID，existing_object 为同格世界对象；损坏围栏可被任一围栏替换，大门可替换未损坏的普通围栏。
static func can_replace(incoming_kind: String, existing_object: Dictionary) -> bool:
	var existing_kind := str(existing_object.get("kind", ""))
	if not is_fence(incoming_kind) or not is_fence(existing_kind):
		return false
	if bool(existing_object.get("damaged", false)):
		return true
	return incoming_kind == GATE and existing_kind != GATE


## 推进新一天的围栏老化状态。
## state 会被原地修改；返回 damaged 与 vanished 数量，供结算界面显示。
static func settle_day(state: Dictionary) -> Dictionary:
	var events := {"damaged": 0, "vanished": 0}
	for object: Dictionary in state.worldObjects.duplicate():
		var kind := str(object.get("kind", ""))
		if not is_fence(kind):
			continue
		var lifespan := durability_days(state, object)
		var placed_day := int(object.get("placedDay", int(state.get("day", 1))))
		var age := int(state.get("day", 1)) - placed_day + 1
		if bool(object.get("damaged", false)):
			if age > lifespan + 1:
				state.worldObjects.erase(object)
				events.vanished += 1
			continue
		if age > lifespan:
			object.damaged = true
			events.damaged += 1
	return events
