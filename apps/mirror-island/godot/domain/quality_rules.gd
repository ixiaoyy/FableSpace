class_name FarmQualityRules
extends RefCounted
## 物品品质、售价、恢复与抽取公式；只计算，不持有状态或发布奖励。

const VALUES := [0,1,2,4]
const LABELS := {0:"普通",1:"银星",2:"金星",4:"铱星"}
const COLORS := {0:"735633",1:"869aa4",2:"b47a17",4:"9958b5"}

## 校验品质整数及物品是否支持品质；空格和固定品质物品只能为零。
static func valid(item: Dictionary, quality: Variant) -> bool:
	return quality is int and quality in VALUES and (quality==0 or item.get("hasQuality",false))

## 按品质倍率向下取整单件基础售价；调用方保证品质有效。
static func price(base: int, quality: int) -> int:
	return floori(base*(1.0+quality*0.25))

## 从未取整的食用值计算品质恢复，避免13点野山葵先取整再放大。
static func energy(item: Dictionary, quality: int) -> int:
	if item.has("edibility"): return ceili(float(item.edibility)*2.5*(1.0+quality*0.4))
	return int(item.get("staminaRestore",0))

## 为名称附上品质；普通物品保留原名，未知品质由上游校验拒绝。
static func name(base: String, quality: int) -> String:
	return base if quality==0 else "%s品质 %s"%[LABELS[quality],base]

## 使用独立种子随机序列计算品质；野采先金后银，普通作物按耕种等级与初级肥料计算。
static func roll(seed: int, day: int, key: String, level: int, fertilizer: int, forage: bool) -> int:
	var rng:=RandomNumberGenerator.new()
	rng.seed=FarmWorldRules.stable_hash(seed,day,key+":quality")
	var gold: float=level/30.0 if forage else 0.2*(level/10.0)+0.2*fertilizer*((level+2)/12.0)+0.01
	var silver: float=level/15.0 if forage else minf(0.75,gold*2.0)
	if rng.randf()<gold: return 2
	if rng.randf()<silver: return 1
	return 0

## 只有喜欢或喜爱的礼物使用品质倍率，按整数截断好感增量。
static func friendship(base: int, quality: int) -> int:
	return int(base*{0:1.0,1:1.1,2:1.25,4:1.5}[quality]) if base>20 else base
