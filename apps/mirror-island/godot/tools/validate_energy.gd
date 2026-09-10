extends SceneTree
## S0 体力检查：真实会话使用内存仓库，文件往返只写 artifacts 中的固定诊断文件。

class MemoryRepository extends FarmSaveRepository:
	var payload: String=""
	var fail_next:=false
	var writes:=0
	## 返回测试进程内记录，不访问玩家槽。
	func read() -> Dictionary: return {"ok":true,"text":payload}
	## 可拒绝一次写入，验证候选不提前发布；成功才替换内存记录。
	func write(text: String) -> bool:
		writes+=1
		if fail_next: fail_next=false; return false
		payload=text; return true

var failures: Array[String]=[]

## 延迟至场景树可用后运行，无图形窗口和声音。
func _initialize() -> void: _run.call_deferred()

## 汇总窄验证失败，不以脚本退出码零掩盖不符合预期的结果。
func _expect(condition: bool, label: String) -> void:
	if not condition: failures.append(label)

## 重置隔离会话到给定合法测试起点；不清理真实存档，也不推进时间。
func _reset(session: FarmGameSession, state: Dictionary) -> void:
	session._state=state.duplicate(true); session._pending.clear(); session.fishing.runtime.clear()
	session.busy=false; session.save_phase="idle"; session.error=""; session.day_summary={}; session.active=true
	session.npcs.reset(session._state)

## 检查新档、精度、预算、失败重试、睡眠及界面；只更新本次实际涉及的行为。
func _run() -> void:
	AudioServer.set_bus_mute(0,true)
	var scene: Node=load("res://scenes/game.tscn").instantiate()
	var session: FarmGameSession=scene.get_node("Session")
	var repository:=MemoryRepository.new(); session.repository=repository
	root.add_child(scene); await process_frame; session.rules.milestones.clear()
	_expect(await session.new_game(session.rules.initial.player.appearance),"新建")
	scene.set_process(false); scene.set_physics_process(false)
	_expect(session.snapshot().stamina==270 and session.snapshot().version==24,"新档体力与状态版本")
	var base:=session.snapshot(); base.stamina=37.75
	var decoded:=session.codec.decode(FarmSaveCodec.encode(base))
	_expect(not decoded.has("error") and decoded.state.stamina==37.75,"小数封套往返")
	for bad in [-0.01,270.01,INF,NAN,"37.75",null]:
		var invalid:=base.duplicate(true); invalid.stamina=bad
		_expect(session.codec.validate(invalid)!="","拒绝非法体力 "+str(bad))
	var old:=base.duplicate(true); old.version=23
	var old_payload:=JSON.stringify({"engine":"godot","version":11,"updatedAt":1,"state":old})
	repository.payload=old_payload
	var writes_before:=repository.writes
	_expect(not await session.continue_game(),"旧版本拒绝")
	_expect(repository.payload==old_payload and repository.writes==writes_before,"旧记录不改写")
	var fixtures: Dictionary=JSON.parse_string(FileAccess.get_file_as_string(ProjectSettings.globalize_path("res://../test/fixtures/godot-migration.json")))
	var tilling: Dictionary={}; var casting: Dictionary={}
	for fixture: Dictionary in fixtures.cases:
		if fixture.name=="锄地": tilling=fixture
		if fixture.kind=="fishing": casting=fixture
	var state: Dictionary=FarmLegacyFixture.current(FarmSaveCodec.normalize_numbers(tilling.before)); state.version=FarmSaveCodec.STATE_VERSION; state.skills=base.skills.duplicate(true); state.professions=base.professions.duplicate(true); state.knownRecipes=base.knownRecipes.duplicate(); state.stamina=4.75
	_reset(session,state); repository.fail_next=true
	var command: Dictionary={"type":"use-item-on-tile","itemId":"hoe","column":26,"row":17,"facing":"up"}
	await session.dispatch(command)
	_expect(session.snapshot().stamina==4.75 and session.save_phase=="failed","保存失败不扣费")
	await process_frame
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	_expect(session.snapshot().stamina==2.75 and session.snapshot().farmTiles.has("farm:26:17"),"重试只扣一次")
	state.stamina=1.75; _reset(session,state); writes_before=repository.writes
	await session.dispatch(command)
	_expect(session.snapshot().stamina==1.75 and repository.writes==writes_before,"余额不足不扣费")
	# 同样的三块地分别受水量和体力约束；余量必须保留小数。
	state.wateringCanLevel=2
	state.player.x=408; state.player.y=280
	for column in range(26,29):
		var id: String="farm:%d:17"%column
		state.farmTiles[id]={"id":id,"column":column,"row":17,"phase":"tilled","cropId":"","growthDays":0,"watered":false,"plantedDay":0,"harvestCount":0,"fertilizer":0}
	for sample in [[5.5,10,2,1.5,8],[10.25,1,1,8.25,0],[10.25,3,3,4.25,0],[1.75,3,0,1.75,3]]:
		state.stamina=sample[0]; state.wateringCanWater=sample[1]; _reset(session,state)
		await session.dispatch({"type":"use-item-on-tile","itemId":"watering-can","column":26,"row":17,"facing":"right"})
		var result:=session.snapshot(); var watered:=0
		for tile: Dictionary in result.farmTiles.values(): watered+=int(tile.watered)
		_expect(watered==sample[2] and result.stamina==sample[3] and result.wateringCanWater==sample[4],"水量/体力独立预算 "+str(sample))
	# 旧钓鱼案例只验证领域函数；真实会话需要同时满足第七天的日历和委托校验。
	state=base.duplicate(true); state.day=7; state.weather.day=7; state.dailyForage.day=7
	state.dailyRequest={"day":7,"requestId":session.social.request_for_day(7).requestId,"completed":false}
	state.player=casting.before.player.duplicate(true); state.inventory=FarmLegacyFixture.current(FarmSaveCodec.normalize_numbers(casting.before.inventory))
	state.stamina=8.5; _reset(session,state)
	_expect(session.codec.validate(state)=="","钓鱼会话起点有效")
	await session.dispatch({"type":"start-fishing","zoneId":casting.args.zoneId})
	_expect(session.snapshot().stamina==0.5,"抛竿扣八点并保留小数")
	var cast_count: int=session.snapshot().fishingCastCount
	await session.dispatch({"type":"start-fishing","zoneId":casting.args.zoneId})
	_expect(session.snapshot().stamina==0.5 and session.snapshot().fishingCastCount==cast_count,"重复抛竿不再扣费")
	state=base.duplicate(true); state.stamina=37.75; state.inventory[5]={"itemId":"parsnip","quantity":3,"quality":0}; _reset(session,state)
	await session.dispatch({"type":"eat-item","itemId":"parsnip"})
	_expect(session.snapshot().stamina==62.75 and session.snapshot().inventory[5].quantity==2,"食用保留小数")
	session._state.stamina=269.75; await session.dispatch({"type":"eat-item","itemId":"parsnip"})
	_expect(session.snapshot().stamina==270 and session.snapshot().inventory[5].quantity==1,"食用上限")
	await session.dispatch({"type":"eat-item","itemId":"parsnip"})
	_expect(session.snapshot().inventory[5].quantity==1,"满体力不消费")
	for sample in [[100.0,1440,270.0],[100.0,1450,263.25],[100.0,1460,256.5],[100.0,1500,202.5],[100.0,1560,135.0],[260.75,1560,260.75]]:
		_expect(is_equal_approx(FarmEnergyRules.after_sleep(sample[0],sample[1]),sample[2]),"睡眠公式 "+str(sample))
	state=base.duplicate(true); state.stamina=12.75; state.minuteOfDay=1450; state.player.regionId="cottage"
	var bed: Dictionary={}
	for value: Dictionary in session.world.interactions.values():
		if value.kind=="bed": bed=value; break
	state.player.x=bed.x+bed.width/2.0; state.player.y=bed.y+bed.height/2.0
	_reset(session,state); repository.fail_next=true
	await session.dispatch({"type":"sleep","bedId":bed.entityId})
	_expect(session.snapshot().day==1 and session.snapshot().stamina==12.75,"日结失败不提前恢复")
	await process_frame
	await session.dispatch({"type":"retry-day-settlement"}); await session.dispatch({"type":"retry-day-settlement"})
	_expect(session.snapshot().day==2 and session.snapshot().stamina==263.25,"日结重试恢复一次")
	scene.ui._changed()
	_expect(scene.ui.stamina_bar.max_value==270 and scene.ui.stamina_label.text=="263","HUD 仅显示取整")
	await session.dispatch({"type":"dismiss-day-settlement"})
	scene.ui._open("skills")
	var skill_labels: Array[Node]=scene.ui.body.find_children("*","Label",true,false)
	_expect(scene.ui.title.text=="技能" and skill_labels.any(func(node:Node)->bool:return node.text.begins_with("耕种")) and skill_labels.any(func(node:Node)->bool:return node.text.begins_with("钓鱼")),"四技能页实际实例化")
	var directory:=ProjectSettings.globalize_path("res://../../../artifacts/energy-s0-2026-09-08")
	DirAccess.make_dir_recursive_absolute(directory)
	var file:=FarmSaveRepository.new(directory+"/roundtrip.json")
	_expect(await file.write(FarmSaveCodec.encode(session.snapshot())),"隔离文件写入")
	var stored:=await file.read(); decoded=session.codec.decode(stored.text)
	_expect(stored.ok and not decoded.has("error") and decoded.state.stamina==263.25,"隔离文件小数往返")
	scene.queue_free(); await process_frame
	for frame in range(30): await process_frame
	print("ENERGY S0 failures=",JSON.stringify(failures)); quit(0 if failures.is_empty() else 1)
