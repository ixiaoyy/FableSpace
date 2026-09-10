class_name FarmNpcSprite
extends Sprite2D
## 居民位置来自日程快照；仅用真实位移选择原图步伐，不维护路径或修改交谈资格。

var initialized:=false
var walk_distance:=0.0
var animation_column:=1
const DISPLAY_SCALE := 1.5

## 投影四向步行、站立和区域渐隐；暂停时站稳，首帧不把出生点距离当成行走距离。
func project(npc: Dictionary, library: FarmAssets, paused: bool) -> void:
	var next:=FarmWorldRules.point(npc)
	if not initialized or npc.motion!="walking" or paused:
		walk_distance=0.0; animation_column=1
	elif not position.is_equal_approx(next):
		walk_distance=fposmod(walk_distance+position.distance_to(next),16.0)
		animation_column=[0,1,2,1][int(walk_distance/4.0)%4]
	texture=library.npc_texture(npc.npcId,npc.facing,animation_column)
	scale=Vector2.ONE*DISPLAY_SCALE
	centered=false; offset=Vector2(-texture.get_width()/2.0,-texture.get_height())
	position=next; modulate.a=npc.opacity; initialized=true
