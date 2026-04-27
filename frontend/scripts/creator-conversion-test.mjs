import assert from "node:assert/strict"

import { buildCreatorConversionLink, readCreatePrefill } from "../app/lib/creator-conversion.js"

const tavern = {
  id: "source tavern/1",
  name: "不要复制这个名字",
  description: "不要复制这个简介",
  scene_prompt: "不要复制这个场景",
  lat: 31.2304,
  lon: 121.4737,
  address: "上海 · 外滩",
}
const link = buildCreatorConversionLink(tavern)
assert.equal(link, "/create?lat=31.230400&lon=121.473700&address=%E4%B8%8A%E6%B5%B7+%C2%B7+%E5%A4%96%E6%BB%A9&source_tavern=source+tavern%2F1")
assert.ok(!link.includes("不要复制"))
assert.ok(!link.includes("description"))
assert.ok(!link.includes("scene_prompt"))

const prefill = readCreatePrefill(new URLSearchParams(link.split("?")[1]))
assert.deepEqual(prefill, {
  lat: "31.230400",
  lon: "121.473700",
  address: "上海 · 外滩",
  sourceTavernId: "source tavern/1",
  hasSource: true,
})

const fallback = readCreatePrefill(new URLSearchParams("lat=bad&lon=&address=  &source_tavern="))
assert.equal(fallback.lat, "31.2304")
assert.equal(fallback.lon, "121.4737")
assert.equal(fallback.address, "")
assert.equal(fallback.hasSource, false)

const noCoordinatesLink = buildCreatorConversionLink({ id: "abc", lat: "bad", lon: null, address: "  " })
assert.equal(noCoordinatesLink, "/create?source_tavern=abc")

console.log("creator-conversion-test: ok")
