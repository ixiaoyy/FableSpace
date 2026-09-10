extends SceneTree
## 作物表现窄检查：使用内存候选逐日生长，不读取或写入玩家存档。

var failures: Array[String]=[]

## 延迟到场景树可用后检查真实领域生长与纹理投影。
func _initialize() -> void: _run.call_deferred()

## 记录条件失败，最终以非零退出码报告。
func _expect(condition: bool, label: String) -> void:
	if not condition: failures.append(label)

## 比较纹理内容，确保检查实际帧变化而非仅检查资源实例。
func _same(left: Texture2D, right: Texture2D) -> bool:
	return left.get_image().get_data()==right.get_image().get_data()

## 六种作物逐日投影，并验证未浇水不变、成熟边界和豆架复收的状态优先级。
func _run() -> void:
	var session:=FarmGameSession.new()
	root.add_child(session)
	var assets:=FarmAssets.new()
	for crop: Dictionary in session.rules.crops:
		var id: String=crop.cropId
		var definition: Dictionary=assets.media.crops[id]
		var tile: Dictionary={"id":"farm:26:17","column":26,"row":17,"phase":"growing","cropId":id,"growthDays":0,"watered":false,"plantedDay":1,"harvestCount":0,"fertilizer":0}
		var state: Dictionary={"farmTiles":{tile.id:tile}}
		var texture:=assets.crop_texture(tile)
		var stage:=0
		var boundary:=int(definition.stageDays[0])
		for day in range(1,int(crop.growthDays)+1):
			tile.watered=false; session.resource_rules.settle_crops(state)
			_expect(_same(texture,assets.crop_texture(tile)),id+" 漏浇保持原帧")
			tile.watered=true; session.resource_rules.settle_crops(state)
			var next:=assets.crop_texture(tile)
			_expect(_same(texture,next)==(day!=boundary),id+" 第 %d 天阶段边界"%day)
			if day==boundary:
				stage+=1
				if stage<definition.stageDays.size(): boundary+=int(definition.stageDays[stage])
			texture=next
		_expect(tile.phase=="mature",id+" 领域确认成熟")
		if crop.has("harvestItems"):
			for output: String in crop.harvestItems: _expect(assets.icon(output)!=null,id+" 混合产物图标 "+output)
			_expect(assets.badge(crop.seedId)==null,id+" 混合种子不伪装成单一产物")
		else:
			_expect(not _same(texture,assets.icon(id)),id+" 收获图标与植株分离")
			_expect(assets.badge(crop.seedId)==assets.icon(id),id+" 种子徽记复用收获图标")
		if id=="green-bean":
			var mature:=texture
			tile.phase="growing"; tile.harvestCount=1; tile.growthDays=7
			var regrowing:=assets.crop_texture(tile)
			_expect(not _same(mature,regrowing),"采收后移除豆荚")
			_expect(regrowing.get_height()==32,"复收保留完整豆架高度")
			for day in range(3):
				tile.watered=true; session.resource_rules.settle_crops(state)
				_expect(_same(assets.crop_texture(tile),mature if day==2 else regrowing),"三天复收纹理")
	if failures.is_empty(): print("Crop art: seven daily growth sequences, dry days, badges and bean regrowth PASS")
	else:
		for failure: String in failures: push_error(failure)
	quit(0 if failures.is_empty() else 1)
