import assert from "node:assert/strict"

import { buildTavernShareDisplay, buildTavernSharePayload, truncateShareText } from "../app/lib/tavern-share.js"

const payload = buildTavernSharePayload(
  {
    id: "fog tavern/1",
    name: "雾港酒馆",
    description: "潮湿码头边的一间小酒馆，店主写下了旧灯塔、海风和夜班水手的设定。",
    lat: 31.2304,
    lon: 121.4737,
  },
  { origin: "https://fablemap.example/" },
)
assert.equal(payload.title, "邀请你进入「雾港酒馆」")
assert.equal(payload.url, "https://fablemap.example/tavern/fog%20tavern%2F1")
assert.ok(payload.summary.includes("潮湿码头"))
assert.ok(payload.copyText.includes("坐标：31.23040, 121.47370"))
assert.ok(payload.copyText.endsWith(payload.url))

const noDescription = buildTavernSharePayload({ id: "empty", name: "", lat: "bad", lon: null }, { origin: "" })
assert.equal(noDescription.title, "邀请你进入「未命名酒馆」")
assert.equal(noDescription.summary, "店主还没有写下公开简介。")
assert.ok(noDescription.copyText.includes("坐标：未设置"))
assert.equal(noDescription.url, "/tavern/empty")

const longText = "这是一段很长的店主公开简介".repeat(12)
assert.equal(truncateShareText("  短简介  ", 10), "短简介")
assert.equal(truncateShareText("", 10), "")
assert.ok(truncateShareText(longText, 32).endsWith("…"))
assert.ok(truncateShareText(longText, 32).length <= 33)

const serverDisplay = buildTavernShareDisplay({
  tavern_id: "fog tavern/1",
  title: "雾港酒馆",
  description: "这段完整描述来自后端公开分享接口。",
  short_description: "后端公开短简介",
  location: { lat: 31.2304, lon: 121.4737, address: "上海 · 外滩" },
  share_url: "https://fablemap.example/tavern/fog%20tavern%2F1",
  share_title: "邀请你进入「雾港酒馆」",
  share_text: "邀请你进入「雾港酒馆」：后端公开短简介",
})
assert.equal(serverDisplay.title, "邀请你进入「雾港酒馆」")
assert.equal(serverDisplay.summary, "后端公开短简介")
assert.equal(serverDisplay.url, "https://fablemap.example/tavern/fog%20tavern%2F1")
assert.ok(serverDisplay.copyText.includes("后端公开短简介"))
assert.ok(serverDisplay.copyText.includes("坐标：31.23040, 121.47370"))

console.log("tavern-share-test: ok")
