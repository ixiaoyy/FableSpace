extends SceneTree
## 窄迁移检查：对照已冻结的迁移基线结果，并在隔离文件验证保存失败重试；不接触玩家存档。

class FailOnceRepository extends FarmSaveRepository:
	var fail_next:=false
	## 指定本次诊断文件，不能默认落入正式游戏槽。
	func _init(path: String) -> void:
		super(path)
	## 只模拟一次写入失败，之后仍使用真实桌面原子文件实现。
	func write(text: String) -> bool:
		if fail_next: fail_next=false; return false
		return await super.write(text)

## 等待场景树完成初始化后运行，避免未就绪节点造成假失败。
func _initialize() -> void:
	_run.call_deferred()

## 比较全部旧状态快照，并校验新建和日结重试不会重复产生副作用。
func _run() -> void:
	var session:=FarmGameSession.new(); root.add_child(session)
	print("INITIAL VALIDATION: ",session.codec.validate(session.rules.initial))
	var path:=ProjectSettings.globalize_path("res://../test/fixtures/godot-migration.json")
	var data: Dictionary=JSON.parse_string(FileAccess.get_file_as_string(path))
	var failures: Array[String]=[]
	var checked:=0
	for test: Dictionary in data.cases:
		# 木斧制作占位已退役，真实配方制作由稻草人定向检查覆盖。
		if test.kind=="storage" and test.args.get("recipeId")=="wooden-axe": continue
		checked+=1
		var state: Dictionary=FarmLegacyFixture.current(FarmSaveCodec.normalize_numbers(test.before))
		state.skills=session.rules.initial.skills.duplicate(true)
		state.professions=session.rules.initial.professions.duplicate(true)
		state.knownRecipes=session.rules.initial.knownRecipes.duplicate()
		var expected: Dictionary=FarmLegacyFixture.current(test.after)
		if test.name=="tree产出": expected.inventory[5].quantity=12; expected.inventory[6]={"itemId":"sap","quantity":5,"quality":0}
		if test.name=="确定性钓鱼完整状态机": expected.inventory[6]={"itemId":"jade-bream","quantity":1,"quality":0}
		expected.skills=session.rules.initial.skills.duplicate(true)
		expected.professions=session.rules.initial.professions.duplicate(true)
		expected.knownRecipes=session.rules.initial.knownRecipes.duplicate()
		# 冻结案例新增经验的明确期望；不使用实际结果反算，也不重生成旧期望。
		var skill_deltas: Dictionary={"防风草收获":{"farming":8},"tree产出":{"foraging":14},"stone产出":{"mining":1},"确定性钓鱼完整状态机":{"fishing":19}}
		for skill: String in skill_deltas.get(test.name,{}): expected.skills[skill].xp=skill_deltas[test.name][skill]
		expected=JSON.parse_string(JSON.stringify(expected))
		var args: Dictionary=test.args
		match test.kind:
			"storage": session.storage.apply(state,[],args)
			"farm": session.resource_rules.farm(state,args.column,args.row,args.item,args.facing)
			"crop-day": session.resource_rules.settle_crops(state)
			"gather": session.resource_rules.gather(state,args.id,args.item,args.facing)
			"shipping-deposit":
				var slot: Dictionary=state.inventory[args.index]; state.shippingQueue.append(slot.duplicate(true)); session.inventory.consume_at(state.inventory,args.index,slot.quantity)
			"shipping-reclaim":
				var slot: Dictionary=state.shippingQueue.back(); session.inventory.add(state.inventory,slot.itemId,slot.quantity); state.shippingQueue.pop_back()
			"shipping-settle": session.storage.settle_shipping(state)
			"talk": session.social.talk(state,args.npc)
			"gift": session.social.gift(state,[args.npc],args.npc.npcId,args.item)
			"regenerate": session.resource_rules.regenerate(state)
			"fishing":
				session.fishing.runtime.clear(); session.fishing.start(state,args.zoneId)
				for step: Dictionary in args.steps:
					if step.type=="held": session.fishing.set_held(state,step.value)
					else: session.fishing.tick(state,step.value)
				var fishing: Dictionary=session.fishing.runtime
				var expected_tension:=47 if test.name=="确定性钓鱼完整状态机" else int(test.fishing.tension)
				var expected_item: String="jade-bream" if test.name=="确定性钓鱼完整状态机" else test.fishing.resultItemId
				if fishing.phase!=test.fishing.phase or roundi(fishing.tension)!=expected_tension or roundi(fishing.progress)!=test.fishing.progress or fishing.get("fish",{}).get("itemId","")!=expected_item: failures.append("钓鱼终局投影")
		var actual: Dictionary=JSON.parse_string(JSON.stringify(state))
		if actual!=expected:
			failures.append(test.name)
			for field: String in actual:
				if actual[field]!=expected.get(field): print("DIFF ",test.name," / ",field," actual=",JSON.stringify(actual[field])," expected=",JSON.stringify(expected.get(field)))
	for value: Dictionary in data.hashes:
		if FarmWorldRules.stable_hash(value.seed,value.day,value.key)!=value.expected: failures.append("确定性哈希")
	var diagnostic_directory:=ProjectSettings.globalize_path("res://../../../artifacts/godot-migration-2026-09-07")
	DirAccess.make_dir_recursive_absolute(diagnostic_directory)
	var repository:=FailOnceRepository.new(ProjectSettings.globalize_path("res://../../../artifacts/godot-migration-2026-09-07/native-test-save.json"))
	session.repository=repository
	repository.fail_next=true
	if await session.new_game(session.rules.initial.player.appearance): failures.append("新建失败不得进入游戏")
	await session.dispatch({"type":"retry-storage-save"})
	if not session.active or session.save_phase!="idle": failures.append("新建失败后重试")
	if session.snapshot().is_empty():
		print("NEW GAME ERROR: ",session.error," phase=",session.save_phase)
		quit(1); return
	var state:=session.snapshot()
	state.player.regionId="cottage"
	var bed: Dictionary={}
	for interaction: Dictionary in session.world.regions.cottage.interactions:
		if interaction.kind=="bed": bed=interaction
	state.player.x=bed.x+bed.width/2.0; state.player.y=bed.y+bed.height/2.0
	state.shippingQueue=[{"itemId":"parsnip","quantity":3,"quality":0}]
	session._state=state
	repository.fail_next=true
	await session.dispatch({"type":"sleep","bedId":bed.entityId})
	if session.snapshot().day!=1 or session.snapshot().gold!=100: failures.append("失败日结提前发布")
	await session.dispatch({"type":"retry-day-settlement"})
	if session.snapshot().day!=2 or session.snapshot().gold!=205: failures.append("重试日结金额")
	await session.dispatch({"type":"retry-day-settlement"})
	if session.snapshot().gold!=205: failures.append("重复重试重复结算")
	var saved: Dictionary=await repository.read()
	var decoded:=session.codec.decode(saved.text)
	if decoded.has("error") or decoded.get("state",{}).get("gold")!=205: failures.append("真实文件往返")
	if not await session.continue_game() or session.snapshot().gold!=205: failures.append("继续游戏入口")
	var damaged:=session.snapshot(); damaged.inventory[0].quantity=-1
	if session.codec.validate(damaged)=="": failures.append("坏档数量未拒绝")
	session.queue_free()
	await process_frame
	print("PARITY ",checked," cases; hash ",data.hashes.size(),"; failures=",JSON.stringify(failures))
	quit(0 if failures.is_empty() else 1)
