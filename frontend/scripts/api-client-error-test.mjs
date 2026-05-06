import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const sourcePath = path.resolve('app/lib/api-client.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const parseStart = source.indexOf('JSON.parse(text)')
const parseCatchStart = source.indexOf('} catch {', parseStart)
const parseCatchEnd = source.indexOf('    }', parseCatchStart + 1)
const parseCatchBlock = source.slice(parseCatchStart, parseCatchEnd)

assert.ok(parseStart >= 0, 'api client should parse JSON response bodies')
assert.ok(parseCatchStart > parseStart, 'api client should handle invalid JSON responses')
assert.ok(
  parseCatchBlock.includes('!response.ok'),
  'non-JSON HTTP error responses should report HTTP failure instead of invalid JSON',
)
assert.ok(
  source.includes('API 请求失败（${response.status}）'),
  'non-JSON HTTP error responses should include the HTTP status in the user-facing error',
)
