class_name FarmAssets
extends RefCounted
## 同一资源索引供场景与界面使用，所有图片和声音只来自校验后的本地媒体包。

var media: Dictionary
var paths: Dictionary
var icons: Dictionary={}
var textures: Dictionary={}

## 读取已迁移的图集定义和不可变对象路径，不在游戏中下载或生成外部资源。
func _init() -> void:
	media=JSON.parse_string(FileAccess.get_file_as_string("res://data/media.json"))
	paths=JSON.parse_string(FileAccess.get_file_as_string("res://generated/asset-paths.json"))

## 从原同源 URL 解析已登记对象，版本查询串只用于源记录，不参与本地路径。
func path_for(url: String) -> String:
	var key:=url.split("?")[0]
	if key.begins_with("/game-media/v1/"): key=key.trim_prefix("/game-media/v1/")
	elif key.contains("/game/media/v1/"): key=key.split("/game/media/v1/")[1]
	return paths.get(key,"")

## 加载并缓存已登记纹理；缺失立即报告，不用占位图掩盖素材问题。
func texture(url: String) -> Texture2D:
	if textures.has(url): return textures[url]
	var path:=path_for(url)
	if url in ["res://media/cottage-woodwork.runtime.png","res://media/shop-interiors.runtime.png"]: path=url
	if path=="": push_error("素材未登记："+url); return null
	var image:=load(path) as Texture2D
	textures[url]=image
	return image

## 创建图集帧引用，不裁剪或改写原图；返回供 Sprite2D/TextureRect 共用的资源。
func frame(url: String, rectangle: Dictionary) -> Texture2D:
	var key: String="%s:%d:%d:%d:%d"%[url,rectangle.x,rectangle.y,rectangle.width,rectangle.height]
	if textures.has(key): return textures[key]
	var atlas:=AtlasTexture.new()
	atlas.atlas=texture(url)
	atlas.region=Rect2(rectangle.x,rectangle.y,rectangle.width,rectangle.height)
	textures[key]=atlas
	return atlas

## 按当前媒体定义返回共用物品图标；像素矩阵物品仍按既有调色板重建。
func icon(id: String) -> Texture2D:
	if icons.has(id): return icons[id]
	var definition: Variant=media.items.get(id)
	if definition==null: return null
	var result: Texture2D
	if definition.kind=="atlas": result=frame(definition.url,definition)
	else: result=_pixel_texture(definition.art.rows,definition.art.palette)
	icons[id]=result
	return result

## 将等宽像素行和调色板转换为透明纹理；调用方负责缓存，未知符号保持透明。
func _pixel_texture(rows: Array, palette: Dictionary) -> Texture2D:
	var image:=Image.create(rows[0].length(),rows.size(),false,Image.FORMAT_RGBA8)
	image.fill(Color.TRANSPARENT)
	for y in range(rows.size()):
		for x in range(rows[y].length()):
			var symbol: String=rows[y][x]
			if palette.has(symbol): image.set_pixel(x,y,Color.html(palette[symbol]))
	return ImageTexture.create_from_image(image)

## 根据已完成的生长天数选取植株纹理；成熟与复收优先读取真实状态，不据外观推断收获资格。
func crop_texture(tile: Dictionary) -> Texture2D:
	var definition: Dictionary=media.crops[tile.cropId]
	var stage:=0
	var days:=int(tile.growthDays)
	while stage<definition.stageDays.size() and days>=int(definition.stageDays[stage]):
		days-=int(definition.stageDays[stage]); stage+=1
	if tile.phase=="mature": stage=definition.stages.size()-1
	else: stage=mini(stage,definition.stages.size()-2)
	var regrowing: bool=tile.phase!="mature" and tile.harvestCount>0 and definition.has("regrowing")
	var key: String="crop:%s:%s"%[tile.cropId,"regrowing" if regrowing else str(stage)]
	if not textures.has(key): textures[key]=_pixel_texture(definition.regrowing if regrowing else definition.stages[stage],media.cropPalette)
	return textures[key]

## 返回乌鸦指定姿态的原生像素纹理；姿态由临时动画选择，缓存不包含任何玩法状态。
func crow_texture(pose: String) -> Texture2D:
	var key: String="crow:"+pose
	if not textures.has(key): textures[key]=_pixel_texture(media.wildlife.crow.frames[pose],media.wildlife.crow.palette)
	return textures[key]

## 种子袋徽记复用对应收获物图标；其它既有徽记继续使用登记的图集帧。
func badge(id: String) -> Texture2D:
	var definition: Variant=media.badges.get(id)
	if definition==null: return null
	if definition.kind=="item": return icon(definition.itemId)
	return frame(definition.url,definition)

## 将旧纹理 key 转为图集 URL；只接受明确映射的 VectoRaith 键。
func entity_frame(texture_key: String, rectangle: Dictionary) -> Texture2D:
	var suffix:=texture_key.trim_prefix("vectoraith-")
	if media.textures.has(suffix): return frame(media.textures[suffix],rectangle)
	if texture_key.begins_with("item-original-"): return icon(texture_key.trim_prefix("item-original-"))
	push_error("实体纹理未迁移："+texture_key)
	return null

## 从既有角色所在的三列四向图块选择帧；保留角色映射，方向顺序为下、左、右、上。
func npc_texture(id: String, facing: String="down", column: int=1) -> Texture2D:
	var definition: Dictionary=media.regions.farm.npc
	var original: Dictionary=definition.frames[id]
	var width:=int(original.width); var height:=int(original.height)
	var rectangle: Dictionary={"x":floori(float(original.x)/(width*3))*width*3+clampi(column,0,2)*width,"y":floori(float(original.y)/(height*4))*height*4+int({"down":0,"left":1,"right":2,"up":3}[facing])*height,"width":width,"height":height}
	return entity_frame(definition.textureKey,rectangle)

## 按原宠物四向帧和休息帧返回纹理，动画索引始终在已登记图集内。
func pet_texture(pet: Dictionary, elapsed: float) -> Texture2D:
	var profile: Dictionary=media.pets[pet.species]
	var index: int=profile.idle[pet.facing]
	if pet.motion=="walking": index=profile.walk[pet.facing][int(elapsed/0.16)%4]
	elif pet.motion=="resting": index=profile.rest["left" if pet.facing=="left" else "right"]
	return frame(profile.url,{"x":index%16*32,"y":floori(float(index)/16)*32,"width":32,"height":32})
