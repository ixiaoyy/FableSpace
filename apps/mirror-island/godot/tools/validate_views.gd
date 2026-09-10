extends SceneTree
## 有界场景接线检查：只用内存存档实例化十二张地图和现有菜单，不读取或改写玩家槽。

class MemoryRepository extends FarmSaveRepository:
	var payload: String=""
	## 仅为诊断提供内存读回，不触碰文件或 IndexedDB。
	func read() -> Dictionary:
		return {"ok":true,"text":payload}
	## 只记录本次检查的候选文本，真实文件原子性由 validate_migration 单独验证。
	func write(text: String) -> bool:
		payload=text; return true

## 延迟到场景树可用时启动一次检查。
func _initialize() -> void:
	_run.call_deferred()

## 逐项实例化地图和菜单，运行错误必须导致外部日志检查失败。
func _run() -> void:
	var scene: Node=load("res://scenes/game.tscn").instantiate()
	var session: FarmGameSession=scene.get_node("Session")
	session.repository=MemoryRepository.new()
	root.add_child(scene)
	await process_frame
	if not await session.new_game(session.rules.initial.player.appearance): print("VIEW CHECK FAILED: new game"); quit(1); return
	var count:=0
	for region_id: String in session.world.regions:
		var region: Dictionary=session.world.regions[region_id]
		var spawn: Dictionary=region.spawns[region.defaultSpawnId]
		session._state.player.regionId=region_id; session._state.player.x=spawn.x; session._state.player.y=spawn.y
		scene._project()
		await process_frame
		if scene.display_region!=region_id: print("VIEW CHECK FAILED: region ",region_id); quit(1); return
		count+=1
	var state: Dictionary=session.snapshot()
	state.player.regionId="farm"; state.player.x=304; state.player.y=256
	session._state=state; scene._project()
	var menus: Array[String]=["inventory","crafting","skills","menu","social","calendar","requests","adoption","appearance","audio","building","backpack-upgrade","credits"]
	for mode: String in menus:
		scene.ui.inspect_id="seed-shop-backpack-display"
		scene.ui._open(mode)
		await process_frame
		if not scene.ui.dialog.visible: print("VIEW CHECK FAILED: menu ",mode); quit(1); return
		if mode=="skills" and not scene.ui.body.find_children("*","Label",true,false).any(func(node:Node)->bool:return node.text.begins_with("钓鱼 · 0 级")): print("VIEW CHECK FAILED: fishing skill label"); quit(1); return
		count+=1
	var fixture_path:=ProjectSettings.globalize_path("res://../test/fixtures/godot-migration.json")
	var fixtures: Dictionary=JSON.parse_string(FileAccess.get_file_as_string(fixture_path))
	for fixture: Dictionary in fixtures.cases:
		if fixture.name=="摆放普通箱":
			session._state=FarmLegacyFixture.current(FarmSaveCodec.normalize_numbers(fixture.after)); scene._project(); scene.ui.open_container("world-1"); await process_frame; count+=1
	scene.ui.open_container("farm-shipping-bin-default"); await process_frame; count+=1
	scene.ui.show_dialogue({"npcId":"seed-keeper","dialogueId":"activity:seed-keeper:day:0","shopAvailable":true}); await process_frame; count+=1
	scene.ui.request_placement({"type":"build-shipping-bin","interactionId":"town-house-west-carpenter-counter"}); await process_frame; scene.ui.close(); await process_frame; count+=1
	session._state.unacknowledgedShippingReport={"settledDay":1,"categories":[],"totalGold":0,"skillUpgrades":[{"skill":"fishing","from":0,"to":1}],"recipeUnlocks":[],"professionChoices":[],"crows":{"scared":0,"lost":[]}}; scene.ui._open("report"); await process_frame
	if not scene.ui.body.find_children("*","Label",true,false).any(func(node:Node)->bool:return node.text=="钓鱼提升：0 → 1 级"): print("VIEW CHECK FAILED: fishing report label"); quit(1); return
	count+=1
	session._state.unacknowledgedShippingReport=null
	session.fishing.runtime={"phase":"casting","zoneId":"lakeshore-old-dock-fishing","held":false,"elapsedMs":0.0,"biteAtMs":2000,"castPower":0.0,"tension":50.0,"progress":0.0,"fish":null,"attempt":1,"failureReason":null}
	scene.ui.show_fishing(); await process_frame; count+=1
	session.fishing.runtime.clear(); scene.ui.mode=""
	session._state.weather.current="rain"; scene._project(); await process_frame; count+=1
	scene.ui._open("inventory"); await process_frame
	root.size=Vector2i(390,844)
	await process_frame; await process_frame
	if scene.ui.dialog.size.x>root.get_visible_rect().size.x:
		print("VIEW CHECK FAILED: inventory resize ",scene.ui.dialog.size); quit(1); return
	count+=1
	scene.queue_free(); await process_frame
	# 等待音频后端处理 stop 队列，不把下一次混音前的引用误报为泄漏。
	await create_timer(0.1).timeout
	print("VIEWS ",count," checks completed")
	quit(0)
