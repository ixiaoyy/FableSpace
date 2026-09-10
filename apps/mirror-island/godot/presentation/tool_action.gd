class_name FarmToolAction
extends Node2D
## 一次农具动作的纯表现；不调用领域、不移动人物或决定命中。

signal phase_finished
## 每项依次为手臂举起角、命中角、工具举起角、命中角、上身倾角和下压像素。
const PROFILES := {
	"hoe":[-1.9,-0.35,-0.5,1.7,0.10,1.0],
	"axe":[-2.5,-0.8,-1.0,1.1,0.14,0.5],
	"pickaxe":[-2.9,-0.6,-1.4,1.3,0.09,1.8],
	"watering-can":[-1.4,-1.1,0.0,0.8,0.035,0.2],
	"scythe":[-0.8,-1.25,-0.25,1.5,0.17,0.4]
}
var actor: CharacterBody2D
var tool: Sprite2D
var item_id: String
var direction: String
var cancelled := false
var tween: Tween
var posed := false
var recovering := false

## 固定本次工具和朝向；图标、握点与尺寸来自当前媒体，不受中途快捷栏选择影响。
func configure(islander: CharacterBody2D, library: FarmAssets, item: String, facing: String) -> void:
	actor=islander; item_id=item; direction=facing
	tool=Sprite2D.new(); add_child(tool); tool.texture=library.icon(item)
	posed=PROFILES.has(item)
	if posed:
		actor.begin_tool_pose(FarmWorldRules.VECTORS[direction])
		var definition: Dictionary=library.media.items[item]
		var grip: Dictionary=definition.get("grip",{"x":tool.texture.get_width()*0.25,"y":tool.texture.get_height()*0.8})
		if item=="watering-can" and not definition.has("grip"): grip={"x":tool.texture.get_width()*0.5,"y":tool.texture.get_height()*0.3}
		tool.centered=false; tool.offset=-Vector2(grip.x,grip.y)
		tool.scale=Vector2.ONE*float(definition.get("heldSize",14))/tool.texture.get_width()
		if direction=="left": tool.scale.x=-tool.scale.x
		tool.z_index=-1 if direction=="up" else 1
	else:
		tool.position=Vector2(8,-12); tool.scale=Vector2.ONE*0.45
	_apply(0.0)

## 在原 0.12 秒内完成蓄力和挥动；取消会唤醒等待者，但不会触发任何命中。
func windup() -> void:
	tween=create_tween(); tween.set_trans(Tween.TRANS_QUAD); tween.set_ease(Tween.EASE_IN)
	tween.tween_method(_apply,0.0,1.0,0.12); tween.tween_callback(func():phase_finished.emit())
	await phase_finished

## 在原 0.16 秒内回收动作，人物和工具共同回位。
func recover() -> void:
	if cancelled: return
	recovering=true
	tween=create_tween(); tween.set_trans(Tween.TRANS_QUAD); tween.set_ease(Tween.EASE_OUT)
	tween.tween_method(_apply,1.0,0.0,0.16); tween.tween_callback(func():phase_finished.emit())
	await phase_finished

## 按同一进度投影人物与工具；五类动作拥有不同的举臂、倾身、下压与挥动轨迹。
func _apply(progress: float) -> void:
	if cancelled: return
	if not posed: tool.rotation=1.2*progress; return
	var profile: Array=PROFILES[item_id]
	var arm: float
	var angle: float
	var lean: float
	if recovering:
		arm=float(profile[1])*progress; angle=float(profile[3])*progress; lean=float(profile[4])*progress
	elif progress<0.35:
		var raise_weight:=progress/0.35
		arm=float(profile[0])*raise_weight; angle=float(profile[2])*raise_weight; lean=-float(profile[4])*raise_weight
	else:
		var strike_weight:=(progress-0.35)/0.65
		arm=lerpf(profile[0],profile[1],strike_weight); angle=lerpf(profile[2],profile[3],strike_weight); lean=float(profile[4])*(strike_weight*2.0-1.0)
	var turn_weight:=progress if recovering else minf(progress/0.35,1.0)
	if direction=="left": arm=-arm; angle=-angle; lean=-lean
	elif direction=="down": arm+=PI/2.0*turn_weight; angle+=PI/2.0*turn_weight
	elif direction=="up": arm-=PI/2.0*turn_weight; angle-=PI/2.0*turn_weight
	tool.position=actor.apply_tool_pose(arm,lean,float(profile[5])*progress)
	tool.rotation=angle

## 停止本次姿势和 Tween；先置取消标记，再唤醒协程，确保不会继续派发命令。
func cancel() -> void:
	if cancelled: return
	cancelled=true
	if tween!=null and tween.is_valid(): tween.kill()
	if posed and is_instance_valid(actor): actor.end_tool_pose()
	phase_finished.emit()

## 退出时释放人物姿势，场景切换或关闭不留下抬手状态。
func _exit_tree() -> void:
	cancel()

## 为已成功的农具命令生成反馈并返回是否处理；节点归属当前区域，切图自动清理。
static func impact(parent: Node2D, point: Vector2, code: String) -> bool:
	if code not in ["tilled","watered","refilled","chopped","chopped-with-seed","branch-chopped","stump-cleared","mined","cut"]: return false
	var effect:=ToolImpact.new(); effect.kind=code; parent.add_child(effect); effect.global_position=point
	return true

class ToolImpact extends Node2D:
	var kind: String
	var age:=0.0
	## 有界反馈只存活 0.28 秒，无随机玩法状态、外部纹理或声音副作用。
	func _process(delta: float) -> void:
		age+=delta
		if age>=0.28: queue_free(); return
		queue_redraw()
	## 区分土块、木屑、石屑、叶片与水滴；所有颜色和轨迹只用于渲染。
	func _draw() -> void:
		var color: Color={"tilled":Color("bb8555"),"watered":Color("83d6e0"),"refilled":Color("83d6e0"),"chopped":Color("e2b47a"),"chopped-with-seed":Color("e2b47a"),"branch-chopped":Color("e2b47a"),"stump-cleared":Color("e2b47a"),"mined":Color("bbc7bf"),"cut":Color("9bc96a")}[kind]
		color.a=1.0-age/0.28
		for index in range(8):
			var angle:=float(index)*TAU/8.0
			var travel:=Vector2(cos(angle)*22.0,-absf(sin(angle))*26.0)*age+Vector2(0,65.0*age*age)
			draw_rect(Rect2(travel.round(),Vector2(2,1) if kind in ["cut","chopped","chopped-with-seed","branch-chopped","stump-cleared"] else Vector2(1,2)),color)
		if kind in ["watered","refilled"]: draw_arc(Vector2.ZERO,2.0+age*15.0,0,TAU,12,color,1.0)
