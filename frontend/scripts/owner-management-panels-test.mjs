import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const manageRouteSource = readFileSync(resolve(__dirname, "../app/routes/tavern-manage.tsx"), "utf8")
const ownerManagementSource = readFileSync(resolve(__dirname, "../app/features/tavern-owner-management/index.tsx"), "utf8")

assert.ok(manageRouteSource.includes('data-tavern-owner-management="dedicated-route"'), "owner management route should expose the dedicated-route marker")
assert.ok(manageRouteSource.includes("<TavernOwnerManagement"), "owner management route should render the management panel hub")
assert.ok(!manageRouteSource.includes("TavernChatWorkbench"), "owner management route should not render the visitor chat workbench")

assert.ok(ownerManagementSource.includes('import { NpcSimulationStatusPanel }'), "owner management should import NPC simulation status panel")
assert.ok(ownerManagementSource.includes("function NpcSimulationOverview"), "owner management should define NPC simulation overview")
assert.ok(ownerManagementSource.includes("<NpcSimulationOverview"), "owner management should render NPC simulation overview")
assert.ok(ownerManagementSource.includes("五维状态实时追踪"), "NPC simulation overview should explain the five-dimensional status")

assert.ok(ownerManagementSource.includes('import { RelationshipGraphPanel }'), "owner management should import relationship graph panel")
assert.ok(ownerManagementSource.includes("<RelationshipGraphPanel"), "owner management should render relationship graph panel")

assert.ok(ownerManagementSource.includes("data-owner-state-card-entry=\"management-route\""), "owner management should expose StateCard owner entry")
assert.ok(ownerManagementSource.includes("<SpaceCapabilityHubPanel"), "owner management should keep the capability hub")
assert.ok(ownerManagementSource.includes("<TerritoryOwnerPanel"), "owner management should keep territory controls")

for (const forbidden of ["TavernChatWorkbench", "data-chat-composer=\"fast-entry\"", "排行榜", "充值", "抽成"]) {
  assert.ok(!ownerManagementSource.includes(forbidden), `owner management panels should not include forbidden visitor/product direction: ${forbidden}`)
}

console.log("owner-management-panels-test: ok")
