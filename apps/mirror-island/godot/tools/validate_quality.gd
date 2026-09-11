extends SceneTree
## 品质与肥料的窄回归检查：只使用内存仓库，不读取玩家槽。

class MemoryRepository extends FarmSaveRepository:
	var payload: String=""
	var fail_next:=false
	var writes:=0
	## 返回进程内记录，接口与正式仓库一致。
	func read() -> Dictionary: return {"ok":true,"text":payload}
	## 模拟一次失败；成功才替换已保存文本，返回写入结果。
	func write(text: String) -> bool:
		writes+=1
		if fail_next: fail_next=false; return false
		payload=text; return true

var failures: Array[String]=[]
var checks:=0

## 在场景树就绪后开始验证。
func _initialize() -> void: _run.call_deferred()

## 累计检查结果并记录可定位标签。
func expect(value: bool, label: String) -> void:
	checks+=1
	if not value: failures.append(label)

## 构造当前品质堆叠，供准确选择与交换用例使用。
func stack(id: String, amount: int, quality: int=0) -> Dictionary:
	return {"itemId":id,"quantity":amount,"quality":quality}

## 为真实农田入口构造一块空耕地；不在UI或库存里授予经验。
func tile() -> Dictionary:
	return {"id":"farm:26:17","column":26,"row":17,"phase":"tilled","cropId":"","growthDays":0,"watered":false,"plantedDay":0,"harvestCount":0,"fertilizer":0}

## 重置隔离会话候选与暂停状态，保留同一个内存仓库。
func reset(session: FarmGameSession, state: Dictionary) -> void:
	session._state=state.duplicate(true); session._pending.clear(); session.active=true
	session.busy=false; session.save_phase="idle"; session.day_summary={}
	session.npcs.reset(session._state)

## 检查品质跨层传递、实际消费金额、肥料门禁和保存原子性；失败返回非零。
func _run() -> void:
	var session:=FarmGameSession.new(); var repo:=MemoryRepository.new(); session.repository=repo
	root.add_child(session)
	expect(await session.new_game(session.rules.initial.player.appearance),"新建当前品质档")
	var base:=session.snapshot(); var inv:=session.inventory
	expect(base.version==25 and FarmSaveCodec.VERSION==13,"版本25/13")
	var slots:=FarmInventory.empty_slots(12)
	for q: int in [0,1,2,4]: expect(inv.add(slots,"parsnip",3,q),"创建品质"+str(q))
	expect(slots.slice(0,4).map(func(s:Dictionary)->int:return s.quality)==[0,1,2,4],"四品质独立堆叠")
	expect(FarmQualityRules.price(35,1)==43 and FarmQualityRules.price(35,2)==52 and FarmQualityRules.price(35,4)==70,"品质价格向下取整")
	expect(FarmQualityRules.energy(session.rules.items["wild-horseradish"],1)==18 and FarmQualityRules.energy(session.rules.items["wild-horseradish"],4)==33,"原始食用值避免二次舍入")
	var before: Variant=slots.duplicate(true)
	expect(not inv.transfer(slots,0,slots,1,"half") and slots==before,"跨品质半组不合并")
	expect(inv.transfer(slots,0,slots,1,"stack") and slots[0].quality==1 and slots[1].quality==0,"跨品质整组交换")
	expect(inv.transfer(slots,0,slots,5,"half") and slots[5]==stack("parsnip",2,1) and slots[0].quantity==1,"半组向上取整且品质保留")
	inv.sort_slots(slots)
	expect(slots[0]==stack("parsnip",3) and slots[1]==stack("parsnip",3,1),"整理分别合并品质")
	expect(inv.consume(slots,"parsnip",4) and inv.quantity(slots,"parsnip",0)==0 and inv.quantity(slots,"parsnip",1)==2,"制作材料低品质优先")
	expect(slots[0]==stack("",0),"清空重置品质")
	var old:=base.duplicate(true); old.version=21
	var old_text:=JSON.stringify({"engine":"godot","version":9,"updatedAt":1,"state":old})
	repo.payload=old_text; var writes:=repo.writes
	expect(not await session.continue_game() and repo.payload==old_text and repo.writes==writes,"旧开发档拒绝且不改写")
	for bad: Variant in [-1,3,5,"1",null]:
		var damaged:=base.duplicate(true); damaged.inventory[5]=stack("parsnip",1); damaged.inventory[5].quality=bad
		expect(session.codec.validate(damaged)!="","非法品质拒绝"+str(bad))
	var damaged:=base.duplicate(true); damaged.inventory[0].quality=4
	expect(session.codec.validate(damaged)!="","工具不能铱品质")
	damaged=base.duplicate(true); damaged.inventory[5].erase("quality")
	expect(session.codec.validate(damaged)!="","缺品质拒绝，不回填")
	var state:=base.duplicate(true); state.inventory[5]=stack("parsnip",2,1); state.inventory[6]=stack("parsnip",2,2); state.stamina=100
	reset(session,state); repo.fail_next=true
	await session.dispatch({"type":"eat-item","itemId":"parsnip","quality":2})
	expect(session.snapshot()==state,"食用保存失败不扣金品质")
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	expect(session.snapshot().stamina==145 and session.snapshot().inventory[5].quantity==2 and session.snapshot().inventory[6].quantity==1,"只食用金品质一次恢复45")
	state=base.duplicate(true); state.inventory[5]=stack("parsnip",2,1); state.inventory[6]=stack("parsnip",2,4)
	var keeper: Dictionary={"npcId":"seed-keeper","regionId":"farm","x":state.player.x,"y":state.player.y,"interactionType":"shop"}
	expect(session._shop(state,[keeper],{"type":"sell-item","itemId":"parsnip","quality":4})=="sold" and state.gold==170 and state.inventory[6].quantity==1 and state.inventory[5].quantity==2,"店内准确出售铱品质70")
	state=base.duplicate(true); state.inventory[5]=stack("cauliflower",2,1); state.inventory[6]=stack("cauliflower",2,2)
	expect(session.social.gift(state,[keeper],"seed-keeper","cauliflower",2)=="gift-liked" and state.friendships["seed-keeper"].points==56 and state.inventory[6].quantity==1 and state.inventory[5].quantity==2,"喜欢的金礼物56好感且准确扣除")
	expect(FarmQualityRules.friendship(20,4)==20 and FarmQualityRules.friendship(-20,4)==-20 and FarmQualityRules.friendship(-40,4)==-40,"中性负向礼物无品质加成")
	state=base.duplicate(true); state.player.x=376; state.player.y=232
	state.inventory[5]=stack("parsnip",2,1); state.inventory[6]=stack("parsnip",1,4)
	var ship: Dictionary={"type":"ship-item","objectId":"farm-shipping-bin-default","sourceIndex":5,"quantity":"stack"}
	expect(session.storage.apply(state,[],ship)=="shipped" and state.shippingQueue[0]==stack("parsnip",2,1),"出货保持银品质")
	session.storage.apply(state,[],{"type":"ship-item","objectId":"farm-shipping-bin-default","sourceIndex":6,"quantity":"stack"})
	expect(session.storage.apply(state,[],{"type":"reclaim-last-shipment","objectId":"farm-shipping-bin-default"})=="reclaimed" and inv.quantity(state.inventory,"parsnip",4)==1,"最后一笔撤回保留铱品质")
	state.shippingQueue.append(stack("parsnip",1,4)); inv.consume(state.inventory,"parsnip",1,4)
	var bed: Dictionary=session.world.interactions.values().filter(func(x:Dictionary)->bool:return x.kind=="bed")[0]
	state.player.regionId="cottage"; state.player.x=bed.x+bed.width/2.0; state.player.y=bed.y+bed.height/2.0
	reset(session,state); repo.fail_next=true; await session.dispatch({"type":"sleep","bedId":bed.entityId})
	expect(session.snapshot()==state,"品质出货日结失败不发布")
	await session.dispatch({"type":"retry-day-settlement"}); await session.dispatch({"type":"retry-day-settlement"})
	var report: Dictionary=session.snapshot().unacknowledgedShippingReport
	expect(report.totalGold==156 and report.categories[0].entries.size()==2 and session.snapshot().gold==256,"同物品按品质分组2银+1铱=156")
	expect(not session.codec.decode(repo.payload).has("error"),"品质报告恢复")
	damaged=session.snapshot(); damaged.unacknowledgedShippingReport.categories[0].entries[0].quality=2
	expect(session.codec.validate(damaged)!="","篡改报告品质金额拒绝")
	var chest: Dictionary={"id":"world-1","kind":"chest","regionId":"farm","column":20,"row":16,"colorId":"default","slots":FarmInventory.empty_slots(36)}
	state=base.duplicate(true); state.player.x=328; state.player.y=264; state.worldObjects.append(chest); state.nextWorldEntitySequence=2
	state.inventory[5]=stack("parsnip",2,2); chest.slots[0]=stack("parsnip",2,1); chest.slots[1]=stack("parsnip",2,2)
	expect(session.storage.apply(state,[],{"type":"add-to-existing-stacks","objectId":"world-1"})=="changed" and chest.slots[0].quantity==2 and chest.slots[1].quantity==4 and state.inventory[5]==stack("",0),"补堆只匹配金品质")
	expect(session.storage.apply(state,[],{"type":"transfer-container-item","objectId":"world-1","direction":"from-chest","sourceIndex":1,"targetIndex":6,"amount":"half"})=="changed" and state.inventory[6]==stack("parsnip",2,2),"箱子半组取回保留品质")
	state.worldDrops.append({"id":"world-2","regionId":"farm","originX":328,"originY":264,"stack":stack("parsnip",1,4)})
	expect(session.storage.apply(state,[],{"type":"collect-world-drop","dropId":"world-2"})=="collected" and inv.quantity(state.inventory,"parsnip",4)==1,"持久掉落保留铱品质")
	state=base.duplicate(true); state.player.x=408; state.player.y=280; state.farmTiles["farm:26:17"]=tile(); state.inventory[5]=stack("basic-fertilizer",2)
	reset(session,state); repo.fail_next=true
	await session.dispatch({"type":"use-item-on-tile","itemId":"basic-fertilizer","column":26,"row":17})
	expect(session.snapshot()==state,"施肥保存失败不提前扣肥料")
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	state=session.snapshot()
	expect(state.farmTiles["farm:26:17"].fertilizer==1 and state.inventory[5].quantity==1,"施肥重试一次")
	before=state.duplicate(true)
	expect(session.resource_rules.farm(state,26,17,"basic-fertilizer","")=="already-fertilized" and state==before,"重复施肥不消耗")
	state.farmTiles["farm:26:17"].fertilizer=0; state.inventory[6]=stack("parsnip-seed",1)
	session.resource_rules.farm(state,26,17,"parsnip-seed","")
	expect(session.resource_rules.farm(state,26,17,"basic-fertilizer","")=="fertilized","未发芽允许施肥")
	state.farmTiles["farm:26:17"].fertilizer=0; state.farmTiles["farm:26:17"].growthDays=1; state.inventory[5]=stack("basic-fertilizer",1)
	expect(session.resource_rules.farm(state,26,17,"basic-fertilizer","")=="fertilizer-too-late","发芽后拒绝施肥")
	var recipe: Dictionary=session.rules.recipes["basic-fertilizer"]
	expect(recipe.ingredients==[{"itemId":"sap","quantity":2}] and recipe.skill=="farming" and recipe.level==1,"基础肥料2树液与种植1级")
	state=base.duplicate(true); state.inventory[5]=stack("sap",2)
	expect(session.storage.craft(state,"basic-fertilizer",1,6)=="unknown-recipe","未学会不能制作")
	state.skills.farming={"xp":100,"level":1,"reportedLevel":0}
	state.player.regionId="cottage"; state.player.x=bed.x+bed.width/2.0; state.player.y=bed.y+bed.height/2.0
	reset(session,state); await session.dispatch({"type":"sleep","bedId":bed.entityId})
	expect("basic-fertilizer" in session.snapshot().unacknowledgedShippingReport.recipeUnlocks and "basic-fertilizer" not in session.snapshot().knownRecipes,"肥料日结待学")
	await session.dispatch({"type":"dismiss-day-settlement"}); await session.dispatch({"type":"craft-item","recipeId":"basic-fertilizer","quantity":1,"targetIndex":6})
	expect(inv.quantity(session.snapshot().inventory,"sap")==0 and inv.quantity(session.snapshot().inventory,"basic-fertilizer")==1,"确认学习后制作一肥料")
	state=base.duplicate(true); var spawn: Dictionary=session.world.resources["farm-tree-001"]
	state.player.x=spawn.x; state.player.y=spawn.y
	session.resource_rules.gather(state,spawn.entityId,"axe","")
	expect(inv.quantity(state.inventory,"sap")==5,"树倒5树液")
	session.resource_rules.gather(state,spawn.entityId,"axe","")
	expect(inv.quantity(state.inventory,"sap")==6,"树桩再得1树液")
	var fertilized_gold:=0; var plain_gold:=0; var forage_high:=0
	for seed in range(1000):
		if FarmQualityRules.roll(seed,1,"plot",5,1,false)==2: fertilized_gold+=1
		if FarmQualityRules.roll(seed,1,"plot",5,0,false)==2: plain_gold+=1
		if FarmQualityRules.roll(seed,1,"forage",10,0,true)>0: forage_high+=1
	expect(fertilized_gold>plain_gold and plain_gold>50 and forage_high>400,"品质公式抽样肥料提高金率与采集等级生效")
	expect(FarmQualityRules.roll(12,2,"wild",5,1,true)==FarmQualityRules.roll(12,2,"wild",5,0,true),"野种忽略肥料")
	state=base.duplicate(true); state.player.x=408; state.player.y=280
	state.farmTiles["farm:26:17"]=tile(); var t: Dictionary=state.farmTiles["farm:26:17"]
	t.merge({"cropId":"potato","phase":"mature","plantedDay":1,"growthDays":6,"fertilizer":1},true)
	state.skills.farming={"xp":15000,"level":10,"reportedLevel":10}
	var potato: Dictionary=session.world.crops.potato; var found:=false
	for seed in range(1000):
		state.worldSeed=seed
		if session.resource_rules.harvest_quality(state,t,potato)>0 and session.resource_rules.harvest_amount(state,t,potato)>1: found=true; break
	expect(found,"找到多产有品质土豆案例")
	var q:=session.resource_rules.harvest_quality(state,t,potato); var amount:=session.resource_rules.harvest_amount(state,t,potato)
	reset(session,state); repo.fail_next=true; await session.dispatch({"type":"use-item-on-tile","column":26,"row":17,"itemId":""})
	expect(session.snapshot()==state,"品质收获保存失败无变化")
	await session.dispatch({"type":"retry-storage-save"}); await session.dispatch({"type":"retry-storage-save"})
	state=session.snapshot()
	expect(inv.quantity(state.inventory,"potato",q)==1 and inv.quantity(state.inventory,"potato",0)==amount-1,"土豆首个带品质，额外普通")
	expect(state.farmTiles["farm:26:17"].fertilizer==1 and state.farmTiles["farm:26:17"].phase=="tilled","收获保留土壤肥料")
	expect(not session.codec.decode(repo.payload).has("error"),"品质作物档可恢复")
	state=base.duplicate(true); state.player.x=408; state.player.y=280; state.skills.foraging={"xp":1000,"level":3,"reportedLevel":3}
	t=tile(); t.merge({"phase":"mature","cropId":"spring-forage","plantedDay":1,"growthDays":7,"fertilizer":1},true); state.farmTiles[t.id]=t
	var wild: Dictionary=session.world.crops["spring-forage"]
	q=session.resource_rules.harvest_quality(state,t,wild); var output:=session.resource_rules.harvest_item_id(state,t,wild)
	session.resource_rules.farm(state,26,17,"","")
	expect(inv.quantity(state.inventory,output,q)==1 and state.skills.farming.xp==3 and state.skills.foraging.xp==1002,"春季野种带品质并保留3/2经验")
	state=base.duplicate(true); state.skills.foraging={"xp":15000,"level":10,"reportedLevel":10}
	var forage: Dictionary=session.world.active_forage(state,"town").filter(func(x:Dictionary)->bool:return x.kind=="daffodil")[0]
	state.player.regionId="town"; state.player.x=forage.x; state.player.y=forage.y
	q=FarmQualityRules.roll(state.worldSeed,state.day,forage.entityId+":forage",10,0,true)
	session.resource_rules.gather(state,forage.entityId,"","")
	expect(inv.quantity(state.inventory,"daffodil",q)==1 and state.skills.foraging.xp==15007,"真实地面野采品质与7经验")
	state=base.duplicate(true); state.gold=200
	expect(session._shop(state,[keeper],{"type":"buy-item","itemId":"basic-fertilizer"})=="unavailable-item","春15前肥料未售")
	state.day=15
	expect(session._shop(state,[keeper],{"type":"buy-item","itemId":"basic-fertilizer"})=="bought" and state.gold==100,"春15肥料售价100")
	state=base.duplicate(true); state.inventory[5]=stack("wood",996)
	for i in range(6,12): state.inventory[i]=stack("stone",999)
	spawn=session.world.resources["farm-tree-001"]; state.player.x=spawn.x; state.player.y=spawn.y; before=state.duplicate(true)
	expect(session.resource_rules.gather(state,spawn.entityId,"axe","")=="inventory-full" and state==before,"木材可放但树液无格整次不变")
	state=base.duplicate(true); state.inventory[5]=stack("parsnip",1,4); before=state.duplicate(true)
	expect(session.social.gift(state,[keeper],"seed-keeper","parsnip",3)=="invalid-quality" and state==before,"非法品质命令不消费")
	for failure: String in failures: push_error(failure)
	session.queue_free(); await process_frame
	print("Quality checks: %d/%d passed"%[checks-failures.size(),checks]); quit(0 if failures.is_empty() else 1)
