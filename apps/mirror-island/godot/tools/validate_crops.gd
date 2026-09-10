extends SceneTree
## S1-B 窄检查：只用内存会话验证架子占用、复收与失败重试，不访问玩家槽。

class MemoryRepository extends FarmSaveRepository:
	var payload: String=""
	var fail_next:=false
	## 返回内存记录，接口与游戏仓库一致，不访问文件。
	func read() -> Dictionary: return {"ok":true,"text":payload}
	## 写入完整候选；可拒绝下一次写入，用于验证不提前发布。
	func write(text: String) -> bool:
		if fail_next: fail_next=false; return false
		payload=text; return true

var failures: Array[String]=[]

## 场景树就绪后启动无窗口检查。
func _initialize() -> void: _run.call_deferred()

## 记录断言失败，由结束时统一返回非零退出码。
func _expect(value: bool, label: String) -> void:
	if not value: failures.append(label)

## 在内存会话验证真实命令、领域生长和严格解码；不推进用户农场。
func _run() -> void:
	var session:=FarmGameSession.new()
	var repository:=MemoryRepository.new(); session.repository=repository
	root.add_child(session)
	_expect(await session.new_game(session.rules.initial.player.appearance),"新建")
	var state:=session.snapshot()
	var id: String="farm:26:17"
	state.player.x=424; state.player.y=280
	state.inventory[5]={"itemId":"bean-starter","quantity":6,"quality":0}
	state.farmTiles[id]={"id":id,"column":26,"row":17,"phase":"tilled","cropId":"","growthDays":0,"watered":false,"plantedDay":0,"harvestCount":0,"fertilizer":0}
	session._state=state
	var plant: Dictionary={"type":"use-item-on-tile","itemId":"bean-starter","column":26,"row":17,"facing":"right"}
	var result:=await session.dispatch(plant)
	_expect(result.code=="trellis-occupied" and session.snapshot().inventory[5].quantity==6,"脚下播种不扣种子")
	session._state.player.x=408; repository.fail_next=true
	await session.dispatch(plant)
	_expect(session.snapshot().farmTiles[id].cropId=="" and session.snapshot().inventory[5].quantity==6,"失败播种不提前发布")
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	state=session.snapshot()
	_expect(state.farmTiles[id].cropId=="green-bean" and state.inventory[5].quantity==5,"重试只播种一次")
	_expect(session.world.blocked(state,"farm",Vector2(424,280)),"幼苗架子阻挡")
	var overlapping:=state.duplicate(true); overlapping.player.x=424
	_expect(session.codec.validate(overlapping)!="","拒绝角色架子重叠档")
	session.resource_rules.settle_crops(state)
	_expect(state.farmTiles[id].growthDays==0,"漏浇不生长")
	for day in range(9):
		state.farmTiles[id].watered=true; session.resource_rules.settle_crops(state)
	_expect(state.farmTiles[id].phase=="growing","九天未成熟")
	state.farmTiles[id].watered=true; session.resource_rules.settle_crops(state)
	_expect(state.farmTiles[id].phase=="mature" and session.world.blocked(state,"farm",Vector2(424,280)),"十天成熟仍阻挡")
	session._state=state
	result=await session.dispatch({"type":"use-item-on-tile","itemId":"","column":26,"row":17})
	state=session.snapshot()
	_expect(result.code=="harvested" and state.farmTiles[id].growthDays==7 and state.farmTiles[id].harvestCount==1,"收获进入三天复收")
	_expect(session.world.blocked(state,"farm",Vector2(424,280)),"复收仍阻挡")
	for day in range(3):
		state.farmTiles[id].watered=true; session.resource_rules.settle_crops(state)
	_expect(state.farmTiles[id].phase=="mature","三天复收成熟")
	session._state=state; repository.fail_next=true
	var stamina: float=state.stamina
	var amount: int=session.inventory.quantity(state.inventory,"green-bean")
	await session.dispatch({"type":"use-item-on-tile","itemId":"axe","column":26,"row":17})
	_expect(session.snapshot().farmTiles[id].cropId=="green-bean" and session.snapshot().stamina==stamina,"清除失败不扣体力")
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	state=session.snapshot()
	_expect(state.farmTiles[id].phase=="tilled" and state.stamina==stamina-2,"清除保留耕地且只扣一次")
	_expect(not session.world.blocked(state,"farm",Vector2(424,280)) and session.inventory.quantity(state.inventory,"green-bean")==amount,"清除释放通路不发收获物")
	_expect(not session.codec.decode(repository.payload).has("error"),"同版本恢复")
	await _check_scythe(session,repository)
	await _check_potato(session,repository)
	await _check_skills(session,repository)
	await _check_scarecrow(session,repository)
	session.queue_free(); await process_frame
	print("CROPS S1-B failures=",JSON.stringify(failures)); quit(0 if failures.is_empty() else 1)

## 构造隔离混合目标，检查临时范围、总上限和联合容量；只移动内存地图中的一株杂草。
func _check_scythe(session: FarmGameSession, repository: MemoryRepository) -> void:
	var state: Dictionary=session.rules.initial.duplicate(true)
	state.player.x=408; state.player.y=280
	var weed: Dictionary={}
	for spawn: Dictionary in session.world.regions.farm.resources:
		if spawn.kind=="weed":
			state.resources[spawn.entityId].phase="cleared"
			if weed.is_empty(): weed=spawn
	if weed.is_empty(): _expect(false,"地图存在杂草检查入口"); return
	var old_position:=Vector2(weed.x,weed.y)
	weed.x=424; weed.y=264
	state.resources[weed.entityId].phase="standing"
	for seed in range(16):
		if FarmWorldRules.stable_hash(seed,state.day,"weed-fiber:"+weed.entityId)%2==0:
			state.worldSeed=seed; break
	_expect(FarmWorldRules.stable_hash(state.worldSeed,state.day,"weed-fiber:"+weed.entityId)%2==0,"本例杂草固定掉纤维")
	for cell: Vector2i in [Vector2i(26,17),Vector2i(27,17),Vector2i(27,18)]:
		var id: String="farm:%d:%d"%[cell.x,cell.y]
		state.farmTiles[id]={"id":id,"column":cell.x,"row":cell.y,"phase":"mature","cropId":"kale","growthDays":6,"watered":false,"plantedDay":1,"harvestCount":0,"fertilizer":0}
	_expect(session.codec.validate(state)=="","混合目标起点有效")
	session._state=state.duplicate(true)
	var result:=await session.dispatch({"type":"use-item-on-tile","itemId":"","column":26,"row":17})
	_expect(result.code=="requires-scythe" and session.snapshot()==state,"空手不收获羽衣甘蓝")
	result=await session.dispatch({"type":"sweep-scythe","facing":"invalid"})
	_expect(result.code=="wrong-direction" and session.snapshot()==state,"非法方向无变化")
	_expect(session.resource_rules.gather(state,weed.entityId,"axe","right")=="wrong-tool","旧杂草入口不绕过工具")
	_expect(session.resource_rules.gather(state,weed.entityId,"scythe","down")=="wrong-direction","旧杂草入口不绕过方向")
	# 一个空格能放全部甘蓝，却不能同时放纤维；不能先清理近处作物。
	for index in range(6,state.inventory.size()): state.inventory[index]={"itemId":"stone","quantity":999,"quality":0}
	session._state=state.duplicate(true)
	result=await session.dispatch({"type":"sweep-scythe","facing":"right"})
	_expect(result.code=="inventory-full" and session.snapshot()==state,"联合容量不足整次无变化")
	state.inventory[6]={"itemId":"","quantity":0,"quality":0}; session._state=state.duplicate(true)
	repository.fail_next=true
	await session.dispatch({"type":"sweep-scythe","facing":"right"})
	_expect(session.save_phase=="failed" and session.snapshot()==state,"挥镰刀保存失败不提前发布")
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	var after:=session.snapshot()
	_expect(session.inventory.quantity(after.inventory,"kale")==2 and session.inventory.quantity(after.inventory,"fiber")==1,"重试仅发两株作物与一株纤维")
	_expect(after.skills.farming.xp==34,"镰刀按成功收获株数给经验")
	_expect(after.resources[weed.entityId].phase=="cleared" and after.farmTiles["farm:27:18"].phase=="mature","混合总上限三个且按距离选择")
	_expect(after.stamina==state.stamina and not session.codec.decode(repository.payload).has("error"),"零耗能及保存恢复")
	result=await session.dispatch({"type":"sweep-scythe","facing":"left"})
	_expect(result.code=="no-effect" and session.snapshot()==after,"背后目标不命中")
	session._state.player.x=320
	result=await session.dispatch({"type":"sweep-scythe","facing":"right"})
	_expect(result.code=="no-effect","四十二像素外不命中")
	session._state=after.duplicate(true)
	session._state.farmTiles["farm:27:18"].phase="growing"; session._state.farmTiles["farm:27:18"].growthDays=5
	result=await session.dispatch({"type":"sweep-scythe","facing":"right"})
	_expect(result.code=="no-effect" and session.snapshot().farmTiles["farm:27:18"].growthDays==5,"未成熟植株不被镰刀破坏")
	weed.x=old_position.x; weed.y=old_position.y

## 验证土豆基础分布与真实收获重试；固定样本覆盖普通及超过三个的产量，不接入虚构运气。
func _check_potato(session: FarmGameSession, repository: MemoryRepository) -> void:
	var state: Dictionary=session.rules.initial.duplicate(true)
	state.player.x=408; state.player.y=280
	var id: String="farm:26:17"
	var tile: Dictionary={"id":id,"column":26,"row":17,"phase":"mature","cropId":"potato","growthDays":6,"watered":false,"plantedDay":1,"harvestCount":0,"fertilizer":0}
	state.farmTiles[id]=tile
	var total:=0; var singles:=0; var chosen_seed: int=-1
	for sample in range(4096):
		state.worldSeed=(sample*2654435761)&0xffffffff
		var amount:=session.resource_rules.harvest_amount(state,tile,session.world.crops.potato)
		total+=amount; singles+=int(amount==1)
		if amount>3 and chosen_seed<0: chosen_seed=state.worldSeed
	_expect(float(total)/4096>1.20 and float(total)/4096<1.30 and singles>3100 and singles<3450,"土豆基础分布接近平均1.25且八成单产")
	_expect(chosen_seed>=0,"额外产出不封顶三个")
	state.worldSeed=chosen_seed
	var amount:=session.resource_rules.harvest_amount(state,tile,session.world.crops.potato)
	for index in range(5,state.inventory.size()): state.inventory[index]={"itemId":"stone","quantity":999,"quality":0}
	session._state=state.duplicate(true)
	var command: Dictionary={"type":"use-item-on-tile","itemId":"","column":26,"row":17}
	var result:=await session.dispatch(command)
	_expect(result.code=="inventory-full" and session.snapshot()==state,"土豆满包不收获")
	state.inventory[5]={"itemId":"","quantity":0,"quality":0}; session._state=state.duplicate(true)
	_expect(session.resource_rules.harvest_amount(state,tile,session.world.crops.potato)==amount,"整理库存不重抽")
	repository.fail_next=true; await session.dispatch(command)
	_expect(session.save_phase=="failed" and session.snapshot()==state,"土豆保存失败不提前发放")
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	_expect(session.inventory.quantity(session.snapshot().inventory,"potato")==amount and session.snapshot().farmTiles[id].phase=="tilled","土豆重试按原数量发放一次")
	_expect(session.snapshot().skills.farming.xp==14,"土豆额外产物不倍增经验")
	_expect(await session.continue_game(),"土豆收获后继续")
	await session.dispatch(command)
	_expect(session.inventory.quantity(session.snapshot().inventory,"potato")==amount,"继续后原地不重复收获")
	print("POTATO sample mean=",float(total)/4096," singles=",singles)

## 验证已接入技能的真实命令、阈值耗能与夜间记录；所有起点、坏档和失败均隔离于玩家槽。
func _check_skills(session: FarmGameSession, repository: MemoryRepository) -> void:
	for sample in [[0,0],[99,0],[100,1],[379,1],[380,2],[14999,9],[15000,10],[16000,10]]:
		_expect(FarmSkillRules.level_for(sample[0])==sample[1],"经验阈值 "+str(sample))
	var state: Dictionary=session.rules.initial.duplicate(true)
	var bad:=state.duplicate(true); bad.skills.farming.xp=100
	_expect(session.codec.validate(bad)!="","拒绝经验等级不一致")
	bad=state.duplicate(true); bad.skills.erase("mining")
	_expect(session.codec.validate(bad)!="","拒绝缺失技能")
	state.skills.farming.xp=92; state.player.x=408; state.player.y=280
	var id: String="farm:26:17"
	state.farmTiles[id]={"id":id,"column":26,"row":17,"phase":"mature","cropId":"parsnip","growthDays":4,"watered":false,"plantedDay":1,"harvestCount":0,"fertilizer":0}
	session._state=state.duplicate(true); repository.fail_next=true
	await session.dispatch({"type":"use-item-on-tile","itemId":"","column":26,"row":17})
	_expect(session.snapshot().skills.farming.xp==92,"保存失败不提前给经验")
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	_expect(session.snapshot().skills.farming.xp==100 and session.snapshot().skills.farming.level==1,"收获重试只升级一次")
	session._state.stamina=10.25
	await session.dispatch({"type":"use-item-on-tile","itemId":"watering-can","column":26,"row":17,"facing":"right"})
	_expect(is_equal_approx(session.snapshot().stamina,8.35) and session.snapshot().skills.farming.xp==100,"下一次浇水节省0.1且不给经验")
	_expect(FarmEnergyRules.unit_cost(session.snapshot(),"axe")==2.0,"种植等级不影响斧头")
	state=session.rules.initial.duplicate(true); state.skills.mining.xp=99; state.stamina=5.0
	var rock: Dictionary=session.world.resources["farm-rock-001"]
	state.player.x=rock.x; state.player.y=rock.y+16; session._state=state
	await session.dispatch({"type":"use-item-on-target","itemId":"pickaxe","targetId":rock.entityId,"facing":"up"})
	_expect(session.snapshot().skills.mining.xp==100 and session.snapshot().skills.mining.level==1 and session.snapshot().stamina==3.0,"破石动作按旧等级耗能后升级")
	var tree: Dictionary=session.world.resources["farm-tree-001"]
	session._state.skills.foraging.xp=86; session._state.stamina=20.0
	session._state.player.x=tree.x; session._state.player.y=tree.y+16
	await session.dispatch({"type":"use-item-on-target","itemId":"axe","targetId":tree.entityId,"facing":"up"})
	_expect(session.snapshot().skills.foraging.xp==100 and session.snapshot().skills.foraging.level==1,"砍倒树给14经验")
	await session.dispatch({"type":"use-item-on-target","itemId":"axe","targetId":tree.entityId,"facing":"up"})
	_expect(session.snapshot().skills.foraging.xp==102 and is_equal_approx(session.snapshot().stamina,16.1),"树桩给2经验并使用新熟练度")
	FarmSkillRules.gain(session._state,"farming",100)
	session._state.stamina=1.25; session._state.minuteOfDay=1550; session._state.player.regionId="cottage"
	var bed: Dictionary={}
	for value: Dictionary in session.world.interactions.values():
		if value.kind=="bed": bed=value; break
	session._state.player.x=bed.x+bed.width/2.0; session._state.player.y=bed.y+bed.height/2.0
	repository.fail_next=true
	await session.dispatch({"type":"sleep","bedId":bed.entityId})
	_expect(session.snapshot().day==1 and session.snapshot().skills.farming.reportedLevel==0,"日结失败不提前确认升级")
	await session.dispatch({"type":"retry-day-settlement"}); await session.dispatch({"type":"retry-day-settlement"})
	_expect(session.snapshot().day==2 and session.snapshot().stamina==270 and session.snapshot().unacknowledgedShippingReport.skillUpgrades.size()==3,"升级日结恢复满体力并只记录一次")
	_expect(await session.continue_game(),"升级报告继续恢复")
	_expect(session.snapshot().unacknowledgedShippingReport.skillUpgrades.size()==3,"报告升级列表持久化")
	bad=session.snapshot(); bad.unacknowledgedShippingReport.skillUpgrades.append(bad.unacknowledgedShippingReport.skillUpgrades[0].duplicate())
	_expect(session.codec.validate(bad)!="","拒绝重复升级报告")

## 验证首个真实配方的学习、制作、物件回收、煤炭柜台与乌鸦保存，全部使用内存起点。
func _check_scarecrow(session: FarmGameSession, repository: MemoryRepository) -> void:
	var state: Dictionary=session.rules.initial.duplicate(true)
	state.skills.farming={"xp":100,"level":1,"reportedLevel":0}
	state.inventory[5]={"itemId":"wood","quantity":50,"quality":0}; state.inventory[6]={"itemId":"fiber","quantity":20,"quality":0}; state.inventory[7]={"itemId":"coal","quantity":1,"quality":0}
	session._state=state.duplicate(true)
	var craft: Dictionary={"type":"craft-item","recipeId":"scarecrow","quantity":1,"targetIndex":8}
	var result:=await session.dispatch(craft)
	_expect(result.code=="unknown-recipe" and session.snapshot()==state,"升级当日不能提前制作")
	var bed: Dictionary={}
	for value: Dictionary in session.world.interactions.values():
		if value.kind=="bed": bed=value; break
	session._state.player.regionId="cottage"; session._state.player.x=bed.x+bed.width/2.0; session._state.player.y=bed.y+bed.height/2.0
	await session.dispatch({"type":"sleep","bedId":bed.entityId})
	_expect(session.snapshot().unacknowledgedShippingReport.recipeUnlocks==["scarecrow","basic-fertilizer"] and "scarecrow" not in session.snapshot().knownRecipes,"报告含待学配方")
	repository.fail_next=true; await session.dispatch({"type":"dismiss-day-settlement"})
	_expect("scarecrow" not in session.snapshot().knownRecipes,"确认保存失败不提前学会")
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	_expect(session.snapshot().knownRecipes==["chest","scarecrow","basic-fertilizer"],"确认重试只学习一次")
	session._state.inventory[5].quantity=49; state=session.snapshot()
	result=await session.dispatch(craft)
	_expect(result.code=="requirements-not-met" and session.snapshot()==state,"材料不足不部分扣除")
	session._state.inventory[5].quantity=50; state=session.snapshot(); repository.fail_next=true
	await session.dispatch(craft)
	_expect(session.snapshot()==state,"制作失败不提前扣料")
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	_expect(session.inventory.quantity(session.snapshot().inventory,"scarecrow")==1 and session.inventory.quantity(session.snapshot().inventory,"wood")==0,"配方准确扣料并只产出一次")
	session._state.player.regionId="farm"; session._state.player.x=408; session._state.player.y=280
	result=await session.dispatch({"type":"place-world-object","inventoryIndex":8,"column":26,"row":17})
	_expect(result.code=="placed","稻草人正常摆放")
	var object: Dictionary=session.snapshot().worldObjects.back()
	if object.kind!="scarecrow": _expect(false,"已生成稻草人对象"); return
	var covered:=0
	for y in range(-9,10):
		for x in range(-9,10): covered+=int(FarmCropProtection.protects(object,object.column+x,object.row+y))
	_expect(covered==249 and FarmCropProtection.protects(object,34,21) and not FarmCropProtection.protects(object,34,22),"249格保护边界")
	for index in range(5,session._state.inventory.size()): session._state.inventory[index]={"itemId":"stone","quantity":999,"quality":0}
	state=session.snapshot(); result=await session.dispatch({"type":"recover-scarecrow","objectId":object.id,"itemId":"axe"})
	_expect(result.code=="inventory-full" and session.snapshot()==state,"满包不移除稻草人")
	session._state.inventory[5]={"itemId":"","quantity":0,"quality":0}; session._state.worldObjects.back().scaredCount=5
	await session.dispatch({"type":"recover-scarecrow","objectId":object.id,"itemId":"axe"})
	await session.dispatch({"type":"place-world-object","inventoryIndex":5,"column":26,"row":17})
	_expect(session.snapshot().worldObjects.back().scaredCount==0,"回收重新摆放重置计数")
	state=session.snapshot(); result=await session.dispatch({"type":"buy-coal"})
	_expect(result.code=="not-at-smith-counter" and session.snapshot()==state,"离柜拒绝买煤")
	session._state.player.regionId="blacksmith"; session._state.player.x=280; session._state.player.y=128; session._state.minuteOfDay=1020; session._state.gold=1000
	state=session.snapshot(); repository.fail_next=true; await session.dispatch({"type":"buy-coal"})
	_expect(session.snapshot()==state,"煤炭保存失败不扣钱")
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	_expect(session.snapshot().gold==850 and session.inventory.quantity(session.snapshot().inventory,"coal")==1 and session.coal_price(113)==250,"屋内晚间交易与年度价格")
	for door: Dictionary in session.world.regions.town.exits:
		if door.targetRegionId!="blacksmith": continue
		session._state.player.regionId="town"; session._state.player.x=door.x+door.width/2.0; session._state.player.y=door.y+door.height/2.0
		result=await session.dispatch({"type":"transition-region","exitId":door.id})
		_expect(result.code=="blacksmith-closed","关门后不能新进入")
		session._state.minuteOfDay=600; result=await session.dispatch({"type":"transition-region","exitId":door.id})
		_expect(result.code=="transitioned","营业时可进入")
		break
	await _check_crows(session,repository,bed)

## 用固定种子搜索一次真实乌鸦机会，比较保护与无保护，并验证日结失败不重抽。
func _check_crows(session: FarmGameSession, repository: MemoryRepository, bed: Dictionary) -> void:
	var state: Dictionary=session.rules.initial.duplicate(true)
	for y in range(13,22):
		for x in range(22,31):
			if state.farmTiles.size()>=16: break
			if (x==26 and y==17) or not session.world.mask("farm","tillableTiles",x,y) or session.world.blocked(state,"farm",Vector2(x*16+8,y*16+8)): continue
			var id: String="farm:%d:%d"%[x,y]
			state.farmTiles[id]={"id":id,"column":x,"row":y,"phase":"mature","cropId":"parsnip","growthDays":4,"watered":false,"plantedDay":1,"harvestCount":0,"fertilizer":0}
	_expect(state.farmTiles.size()==16,"乌鸦检查有16株合法作物")
	var seed_found: int=-1; var loss_count:=0
	for seed in range(256):
		var candidate:=state.duplicate(true); candidate.worldSeed=seed
		var report:=FarmCropProtection.settle(candidate,session.world)
		if not report.lost.is_empty(): seed_found=seed; loss_count=report.lost.size(); break
	_expect(seed_found>=0,"找到确定性乌鸦机会")
	state.worldSeed=seed_found
	var protected:=state.duplicate(true)
	protected.worldObjects.append({"id":FarmStorageRules.allocate(protected),"kind":"scarecrow","regionId":"farm","column":26,"row":17,"scaredCount":0})
	var visual_events: Array=[]
	var report:=FarmCropProtection.settle(protected,session.world,visual_events)
	_expect(report.lost.is_empty() and report.scared>0 and protected.worldObjects.back().scaredCount==report.scared,"稻草人真实阻止损失并计数")
	_expect(visual_events.size()==report.scared and visual_events[0].outcome=="scared","驱赶表现来自实际保护落点")
	var without_visuals:=state.duplicate(true); var with_visuals:=state.duplicate(true); var losses: Array=[]
	_expect(FarmCropProtection.settle(without_visuals,session.world)==FarmCropProtection.settle(with_visuals,session.world,losses) and without_visuals==with_visuals,"采集表现事件不改变随机结果与候选")
	_expect(losses.size()==loss_count and losses[0].outcome=="lost","损失表现与真实损失一致")
	var few:=state.duplicate(true); few.farmTiles.erase(few.farmTiles.keys()[0])
	_expect(FarmCropProtection.settle(few,session.world)=={"lost":[],"scared":0},"少于16株不产生乌鸦")
	var young:=state.duplicate(true)
	for tile: Dictionary in young.farmTiles.values(): tile.phase="growing"; tile.growthDays=1
	_expect(FarmCropProtection.settle(young,session.world).lost.is_empty(),"紧接种子的阶段不被吃")
	state.player.regionId="cottage"; state.player.x=bed.x+bed.width/2.0; state.player.y=bed.y+bed.height/2.0
	session._state=state.duplicate(true); repository.fail_next=true
	var summary_before:=session.day_summary.duplicate(true)
	await session.dispatch({"type":"sleep","bedId":bed.entityId})
	_expect(session.snapshot()==state,"日结失败不提前损失作物")
	_expect(session.day_summary==summary_before,"失败保存不发布乌鸦表现")
	await session.dispatch({"type":"retry-day-settlement"}); await session.dispatch({"type":"retry-day-settlement"})
	_expect(session.snapshot().day==2 and session.snapshot().unacknowledgedShippingReport.crows.lost.size()==loss_count,"乌鸦日结重试不重抽")
	_expect(session.day_summary.crowEvents==losses and not repository.payload.contains("crowEvents"),"成功重试发布同一落点且临时事件不入存档")
	_expect(not session.codec.decode(repository.payload).has("error"),"含损失报告的存档可恢复")
