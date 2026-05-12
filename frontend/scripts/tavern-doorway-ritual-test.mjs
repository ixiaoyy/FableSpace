import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const workbenchPath = resolve(__dirname, "../app/features/tavern-chat-workbench/index.tsx")
const workbenchSource = readFileSync(workbenchPath, "utf8")
const packageSource = readFileSync(resolve(__dirname, "../package.json"), "utf8")

function sourceSlice(startNeedle, endNeedle) {
  const start = workbenchSource.indexOf(startNeedle)
  assert.notEqual(start, -1, `missing source start: ${startNeedle}`)
  const end = endNeedle ? workbenchSource.indexOf(endNeedle, start + startNeedle.length) : -1
  return end === -1 ? workbenchSource.slice(start) : workbenchSource.slice(start, end)
}

const doorwaySource = sourceSlice("function TavernDoorwayRitual", "function CharacterStagePortrait")
for (const snippet of [
  "data-tavern-doorway-ritual",
  'aria-label="进店前的酒馆门口"',
  "推门进店 · 真实坐标门牌",
  "先在门口听一句，再和 NPC 开口",
  "data-doorway-host-greeting",
  "data-doorway-start-chat",
  "data-doorway-host-status",
  "今晚在吧台",
  "正在接待你",
  "firstMinute.anchorLine",
  "firstMinute.whyHere",
  "entranceReactionContent(hostCharacter, tavern.name)",
]) {
  assert.ok(doorwaySource.includes(snippet), `doorway ritual should include ${snippet}`)
}

const handlerSource = sourceSlice("function handleDoorwayStartChat", "function handleSelectNpcInPublic")
assert.ok(handlerSource.includes("selectCharacter(character.id)"), "doorway CTA should switch into the selected NPC private channel")
assert.ok(handlerSource.includes("fillComposerDraft(prompt)"), "doorway CTA should only fill the composer draft")
assert.ok(!handlerSource.includes("handleSubmit"), "doorway CTA must not auto-send the visitor's first line")
assert.ok(!handlerSource.includes("sendTavernChat") && !handlerSource.includes("sendGroupChat"), "doorway CTA must not call chat APIs directly")

const fillDraftSource = sourceSlice("function focusComposerAfterDraft", "function handleSelectNpcInPublic")
for (const snippet of [
  "setMessage(prompt)",
  "setDraftMessage(prompt)",
  "setMentionQuery(\"\")",
  "setMentionIndex(0)",
  "textareaRef.current?.scrollIntoView",
  "textareaRef.current?.focus",
]) {
  assert.ok(fillDraftSource.includes(snippet), `composer draft filler should include ${snippet}`)
}

assert.ok(
  workbenchSource.includes("buildTavernFirstMinuteGuide, type TavernFirstMinuteGuide"),
  "doorway ritual should reuse the shared first-minute guide type and helper instead of duplicating anchor copy",
)
assert.ok(
  workbenchSource.includes('data-chat-workbench="sillytavern-style"') &&
    workbenchSource.includes('aria-label="NPC 角色列表"') &&
    workbenchSource.includes('aria-label="聊天记录"') &&
    workbenchSource.includes('data-chat-composer="fast-entry"'),
  "doorway ritual must preserve visitor-first tavern mainline markers",
)
assert.ok(
  packageSource.includes("node ./scripts/tavern-doorway-ritual-test.mjs"),
  "package test script should include the tavern doorway ritual regression test",
)

console.log("tavern-doorway-ritual-test: ok")

