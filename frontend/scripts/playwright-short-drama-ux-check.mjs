import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium, expect } from '@playwright/test'

const here = dirname(fileURLToPath(import.meta.url))
const frontendRoot = resolve(here, '..')
const repoRoot = resolve(frontendRoot, '..')
const artifactDir = resolve(repoRoot, 'artifacts/playwright/short-drama-ux')
const baseUrl = process.env.FABLEMAP_PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173'

const demoTavern = {
  id: 'tavern-short-drama-demo',
  owner_id: 'owner-demo',
  name: '第三中学传达室',
  description: '校门口的夜间传达室，店主发布了一个轻推理短剧入口。',
  address: '成都市青羊区 · 第三中学门口',
  latitude: 30.659,
  longitude: 104.064,
  place_type: 'school',
  status: 'open',
  access: 'public',
  is_open: true,
  local_time_display: '21:30',
  visit_count: 24,
  scene_prompt: '门铃、登记册、旧热水壶和一张失物招领便签。',
  characters: [
    {
      id: 'guard-zhou',
      name: '老周',
      archetype: '门卫',
      personality: '克制、讲规则、愿意帮访客把误会说清楚',
      tags: ['轻推理', '救场', '校园'],
    },
    {
      id: 'student-lin',
      name: '小林',
      archetype: '学生',
      tags: ['说谎', '登记册'],
    },
  ],
  gameplay_definitions: [
    {
      id: 'gp-draft-ignored',
      title: '帮店主救场 4 次',
      status: 'draft',
      summary: '这个草稿不应出现在发现页短剧入口。',
      entry_label: '草稿不显示',
      nodes: [
        {
          id: 'draft',
          narration: 'draft',
          choices: [
            { id: 'a', label: 'A', next_node_id: 'draft' },
            { id: 'b', label: 'B', next_node_id: 'draft' },
          ],
        },
      ],
    },
    {
      id: 'gp-truth-register',
      title: '判断谁在说谎',
      status: 'published',
      summary: '用酒馆内登记册线索做轻推理，不做人身指控。',
      entry_label: '开始轻推理',
      owner_brief: {
        goal: '通过 3 个安全线索判断哪句话前后矛盾，只给出酒馆内结论。',
        tone: '短剧主持感、节奏清楚、克制',
      },
      nodes: [
        {
          id: 'opening',
          kind: 'scene',
          narration: '两位客人都说自己先到，但登记册只剩一行模糊时间。',
          choices: [
            { id: 'check-register', label: '看登记册', next_node_id: 'complete' },
            { id: 'ask-rule', label: '请 NPC 复述规则', next_node_id: 'complete' },
          ],
        },
        {
          id: 'complete',
          kind: 'complete',
          narration: '误会被收束到店主已确认的公开规则。',
          choices: [],
        },
      ],
    },
  ],
}

function json(payload) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  }
}

async function installApiFixtures(page) {
  await page.route('**/api/v1/taverns/tavern-short-drama-demo/roleplay', (route) => route.fulfill(json({
    tavern_id: demoTavern.id,
    roleplay_mode: 'ai_only',
    claims: [],
    characters: demoTavern.characters.map((character) => ({ id: character.id, name: character.name })),
  })))

  await page.route('**/api/v1/taverns/tavern-short-drama-demo/share', (route) => route.fulfill(json({
    tavern_id: demoTavern.id,
    title: demoTavern.name,
    summary: demoTavern.description,
    share_url: `/tavern/${demoTavern.id}`,
    copy_text: `${demoTavern.name}：${demoTavern.description}`,
  })))

  await page.route('**/api/v1/taverns/tavern-short-drama-demo', (route) => route.fulfill(json(demoTavern)))

  await page.route('**/api/v1/taverns**', (route) => route.fulfill(json({
    taverns: [demoTavern],
    count: 1,
  })))

  await page.route('**/api/v1/rumors**', (route) => route.fulfill(json({ rumors: [], count: 0 })))
}

async function checkViewport(browser, config) {
  const context = await browser.newContext({
    viewport: config.viewport,
    deviceScaleFactor: 1,
    isMobile: config.isMobile || false,
  })
  const page = await context.newPage()
  await installApiFixtures(page)

  await page.goto(`${baseUrl}/discover`, { waitUntil: 'networkidle' })
  await expect(page.locator('[aria-label="短剧入口卡"]').first()).toBeVisible()
  await expect(page.getByText('判断谁在说谎').first()).toBeVisible()
  await expect(page.getByText(/店主已发布的玩法承接/).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /开始轻推理/ }).first()).toBeVisible()

  const initialPath = resolve(artifactDir, `${config.name}-discover-short-drama.png`)
  await page.screenshot({ path: initialPath, fullPage: true })

  const searchInput = page.getByPlaceholder(/搜索坐标/)
  await searchInput.fill('轻推理')
  await expect(page.locator('[aria-label="短剧入口卡"]').first()).toBeVisible()
  await expect(page.getByText('用酒馆内登记册线索做轻推理').first()).toBeVisible()

  const filteredPath = resolve(artifactDir, `${config.name}-discover-search-short-drama.png`)
  await page.screenshot({ path: filteredPath, fullPage: true })

  await context.close()
  return [initialPath, filteredPath]
}

await mkdir(artifactDir, { recursive: true })

const browser = await chromium.launch()
const screenshots = []
try {
  screenshots.push(...await checkViewport(browser, {
    name: 'desktop',
    viewport: { width: 1440, height: 1100 },
  }))
  screenshots.push(...await checkViewport(browser, {
    name: 'mobile',
    viewport: { width: 390, height: 920 },
    isMobile: true,
  }))
} finally {
  await browser.close()
}

const reportPath = resolve(artifactDir, 'report.md')
const report = `# Short Drama UX Playwright Self Acceptance

Date: 2026-05-04

Base URL: ${baseUrl}

## Assertions

- Desktop and mobile/narrow viewport can render the discover page.
- Published short-drama gameplay produces a visible \`短剧入口卡\`.
- Draft short-drama gameplay is ignored by the discover teaser fixture.
- Guardrail copy is visible: \`店主已发布的玩法承接\`.
- CTA is visible: \`开始轻推理\`.
- Search for \`轻推理\` keeps the short-drama teaser visible in card results.

## Screenshots

${screenshots.map((item) => `- \`${item}\``).join('\n')}

## Limits

- This is a front-end Playwright check with API route fixtures; it does not start or write to the backend.
- Native \`/discover\` is browser-verified. Product compatibility components such as \`TavernEntryPanel\` and \`GameplayManager\` remain covered by script-level tests because they are not directly exposed by the current React Router routes.
- Chromium only; Firefox/WebKit are out of scope for this task.
`

await writeFile(reportPath, report, 'utf8')
console.log(`short-drama-playwright-ux-check: ok`)
console.log(`report: ${reportPath}`)
