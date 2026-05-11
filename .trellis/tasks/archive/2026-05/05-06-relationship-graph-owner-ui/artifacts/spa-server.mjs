import http from 'node:http'
import { createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'

const root = resolve('D:/work/ai-/frontend/build/client')
const port = 4173

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

function safePathname(pathname) {
  const normalized = normalize(pathname).replace(/^([.][.][\\/])+/, '')
  return normalized.replace(/^[/\\]+/, '')
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const relative = safePathname(url.pathname === '/' ? 'index.html' : url.pathname)
  let filePath = join(root, relative)
  try {
    await access(filePath)
  } catch {
    filePath = join(root, 'index.html')
  }

  const type = contentTypes[extname(filePath)] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': type })
  createReadStream(filePath).pipe(res)
})

server.listen(port, '127.0.0.1', () => {
  console.log(`spa-server listening on http://127.0.0.1:${port}`)
})
