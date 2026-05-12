import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const workbenchSource = readFileSync(resolve(__dirname, "../app/features/tavern-chat-workbench/index.tsx"), "utf8")
const panelSource = readFileSync(resolve(__dirname, "../app/features/social-memory-debug/SocialMemoryCreationPanel.tsx"), "utf8")
const packageSource = readFileSync(resolve(__dirname, "../package.json"), "utf8")

assert.ok(panelSource.includes("NpcSocialMemory"), "panel should use the typed social memory payload")
assert.ok(panelSource.includes("function memoryScore"), "panel should score social memories for debug")
assert.ok(panelSource.includes("sourceMatch"), "debug score should expose source-name match")
assert.ok(panelSource.includes("contentOverlap"), "debug score should expose keyword/ngram overlap")
assert.ok(panelSource.includes("recency.score"), "debug score should expose recency bonus")
assert.ok(panelSource.includes("scoredStored.slice(0, 3)") || panelSource.includes("i < 3"), "debug view should mirror top-k limits")

assert.ok(panelSource.includes('data-social-memory-debug-panel="owner-only"'), "debug panel should expose an owner-only marker")
assert.ok(workbenchSource.includes("visible={isOwner}"), "debug panel should be gated behind owner state")
assert.ok(panelSource.includes("后端仍是最终 prompt 注入来源"), "copy should avoid claiming exact prompt transcript")
assert.ok(panelSource.includes("不是访客公开八卦墙"), "copy should keep the no-public-social-wall boundary")
assert.ok(workbenchSource.includes("draftMessage={message}"), "debug panel should use current composer input as the query")
assert.ok(workbenchSource.includes("SocialMemoryCreationPanel"), "chat workbench should mount the social memory debug panel")

assert.ok(packageSource.includes("social-memory-debug-panel-test.mjs"), "npm test should include social memory debug panel regression")

console.log("social-memory-debug-panel-test: ok")
