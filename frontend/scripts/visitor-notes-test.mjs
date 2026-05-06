import { readFileSync } from 'node:fs'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const taverns = readFileSync(new URL('../app/lib/taverns.ts', import.meta.url), 'utf8')
const route = readFileSync(new URL('../app/routes/tavern.tsx', import.meta.url), 'utf8')
const ownerManagement = readFileSync(new URL('../app/features/tavern-owner-management/index.tsx', import.meta.url), 'utf8')

assert(taverns.includes('/visitor-notes'), 'visitor note service should use /visitor-notes endpoints')
assert(taverns.includes('createVisitorNote'), 'createVisitorNote helper should exist')
assert(taverns.includes('listVisitorNotes'), 'listVisitorNotes helper should exist')
assert(taverns.includes('deleteVisitorNote'), 'deleteVisitorNote helper should exist')
assert(route.includes('这不是公开留言墙'), 'visitor note UI should state this is not a public wall')
assert(route.includes('createVisitorNote'), 'visitor route should submit visitor notes through service helper')
assert(!route.includes('listVisitorNotes'), 'visitor chat route should not list owner-only notes')
assert(!route.includes('deleteVisitorNote'), 'visitor chat route should not delete owner-only notes')
assert(ownerManagement.includes('这不是公开留言墙'), 'owner management should restate visitor notes are not a public wall')
assert(ownerManagement.includes('listVisitorNotes'), 'owner note review UI should list notes through service helper')
assert(ownerManagement.includes('deleteVisitorNote'), 'owner note review UI should delete notes through service helper')
assert(!ownerManagement.includes('createVisitorNote'), 'owner management should not render the visitor note submission form')
assert(!route.includes('TavernMessageBoard'), 'tavern route should not render public message board')

console.log('visitor-notes frontend contract ok')
