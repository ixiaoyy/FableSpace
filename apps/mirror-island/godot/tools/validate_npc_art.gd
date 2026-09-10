extends SceneTree
## 原图四向帧和居民投影窄检查；不新建农场、不访问玩家存档。

## 检查真实图集范围、步伐差异及停止/暂停时的站立恢复，并输出隔离联系图。
func _initialize() -> void:
	var assets:=FarmAssets.new()
	var sheet:=Image.create(192,256,false,Image.FORMAT_RGBA8)
	sheet.fill(Color("e8dec7"))
	var failures: Array[String]=[]
	var row:=0
	var identities: Dictionary={}
	for id: String in assets.media.regions.farm.npc.frames:
		var standing:=assets.npc_texture(id,"down",1) as AtlasTexture
		var identity:=str(standing.region.position)
		if identities.has(identity): failures.append(id+" 与 "+str(identities[identity])+" 共用角色分组")
		identities[identity]=id
		for region: Dictionary in assets.media.regions.values():
			if region.has("npc") and region.npc.frames[id]!=assets.media.regions.farm.npc.frames[id]: failures.append(id+" 区域外观映射不一致")
		var direction_index:=0
		for direction: String in ["down","left","right","up"]:
			var samples: Array=[]
			for column in range(3):
				var texture:=assets.npc_texture(id,direction,column) as AtlasTexture
				if not Rect2(Vector2.ZERO,texture.atlas.get_size()).encloses(texture.region): failures.append(id+" 图集越界")
				var image:=texture.get_image()
				samples.append(image.get_data())
				sheet.blit_rect(image,Rect2i(0,0,16,32),Vector2i(direction_index*48+column*16,row*32))
			if samples[0]==samples[1] and samples[1]==samples[2]: failures.append(id+" "+direction+" 无步伐差异")
			direction_index+=1
		var sprite:=FarmNpcSprite.new()
		var npc: Dictionary={"npcId":id,"x":100,"y":100,"motion":"walking","facing":"left","opacity":0.6}
		sprite.project(npc,assets,false)
		if sprite.animation_column!=1: failures.append(id+" 出生跳步")
		if sprite.scale!=Vector2(1.5,1.5) or sprite.position!=Vector2(100,100): failures.append(id+" 显示比例改变了脚底位置")
		if sprite.offset+Vector2(sprite.texture.get_width()/2.0,sprite.texture.get_height())!=Vector2.ZERO: failures.append(id+" 纹理脚底锚点未归零")
		sprite.project(npc,assets,false)
		if sprite.animation_column!=1: failures.append(id+" 无位移重复投影跳步")
		npc.x+=8; sprite.project(npc,assets,false)
		if sprite.animation_column!=2 or sprite.position!=Vector2(108,100): failures.append(id+" 未按位移切帧")
		npc.motion="waiting"; sprite.project(npc,assets,false)
		if sprite.animation_column!=1 or sprite.rotation!=0 or sprite.flip_h: failures.append(id+" 停步未恢复真实朝向")
		npc.motion="walking"; npc.x+=8; sprite.project(npc,assets,true)
		if sprite.animation_column!=1 or not is_equal_approx(sprite.modulate.a,float(npc.opacity)): failures.append(id+" 暂停或渐隐错误")
		sprite.free(); row+=1
	sheet.resize(768,1024,Image.INTERPOLATE_NEAREST)
	sheet.save_png(ProjectSettings.globalize_path("res://../../../artifacts/art-fix-npcs-2026-09-09/directions-and-steps.png"))
	if failures.is_empty(): print("NPC art: 8 mappings / 96 frames, movement, standing, pause and opacity PASS")
	else:
		for message: String in failures: push_error(message)
	quit(0 if failures.is_empty() else 1)
