import http from "node:http"

const detail = {
  story_world: {
    id: "history_broad_street_water_1854",
    title: "1854 年宽街",
    summary: "在雨夜里核对水从哪里来。",
    genre: "历史见证",
    content_version: "annie-broad-street-2026-07-27.1",
  },
  character: {
    id: "char_history_broad_street_annie",
    name: "安妮",
    current_situation:
      "1854 年 9 月 7 日下午的伦敦宽街附近，安妮抱着一只缺口陶罐，在水泵旁向你讨一口来路能够确认的水。",
    opening_preview: "先生……你有一点水吗？",
    relationship_stage: {
      id: "watchful",
      label: "试探",
      attitude: "安妮愿意听你说完，但仍在核对你会不会把猜测当成事实。",
    },
  },
  player_role: {
    id: "role_history_broad_street_beggar",
    name: "乞丐",
    gender: "未说明",
    background: "你靠零工和施舍在苏活区街巷间过活，知道穷人的话常被忽视。",
    entry_reason: "你在宽街水泵旁歇脚时，安妮抱着陶罐向你求助。",
    character_visible_information: ["安妮看得出你同样缺水、没有权势。"],
  },
}

const references = [
  {
    id: "fact_outbreak_intensified",
    category: "fixed_fact",
    statement: "1854 年宽街一带的霍乱暴发在 8 月 31 日夜至 9 月 1 日显著加剧。",
    sources: [
      "https://wellcomecollection.org/works/uqa27qrt/items",
      "https://epi-snow.ph.ucla.edu/Stream2_BSPoutbreak_d.html",
    ],
  },
  {
    id: "setting_annie_is_fictional",
    category: "story_setting",
    statement: "安妮及她与玩家的相遇均为原创剧情，不对应史料中可识别的真实儿童。",
    sources: [],
  },
  {
    id: "setting_player_is_beggar",
    category: "story_setting",
    statement: "玩家以没有权势的乞丐身份在水泵旁遇见安妮。",
    sources: [],
  },
  {
    id: "fact_snow_investigation_method",
    category: "fixed_fact",
    statement: "John Snow 获取死亡登记资料，并逐户询问死者家庭实际使用的饮水来源。",
    sources: [
      "https://wellcomecollection.org/works/uqa27qrt/items",
      "https://wellcomecollection.org/works/z8xczc2r",
    ],
  },
  {
    id: "fact_comparison_water_sources",
    category: "fixed_fact",
    statement: "宽街附近济贫院有自己的水源，附近啤酒厂工人通常也不饮用街泵水。",
    sources: [
      "https://wellcomecollection.org/works/uqa27qrt/items",
      "https://wellcomecollection.org/works/z8xczc2r",
    ],
  },
  {
    id: "setting_family_warning",
    category: "story_setting",
    statement: "安妮母亲禁止她继续使用宽街水泵，是虚构家庭的谨慎。",
    sources: [],
  },
  {
    id: "setting_testimony_paper",
    category: "story_setting",
    statement: "安妮与玩家核对门牌、取水处并整理纸页的过程属于原创剧情。",
    sources: [],
  },
]

const baseEvents = [
  {
    id: "event-1",
    sequence: 1,
    type: "narration",
    role: "system",
    character_id: null,
    content: "雨丝落在石板路上。安妮没有伸手拿你的碗。",
  },
  {
    id: "event-2",
    sequence: 2,
    type: "message",
    role: "character",
    character_id: "char_history_broad_street_annie",
    content: "先生……你有一点水吗？先告诉我，它是从哪儿取来的。",
  },
  {
    id: "event-3",
    sequence: 3,
    type: "choice",
    role: "player",
    character_id: null,
    content: "先询问她知道什么，不替她下结论",
  },
  {
    id: "event-4",
    sequence: 4,
    type: "relationship_changed",
    role: "system",
    character_id: "char_history_broad_street_annie",
    content: "你先询问她知道什么，没有替她下结论。",
  },
  {
    id: "event-5",
    sequence: 5,
    type: "narration",
    role: "system",
    character_id: null,
    content: "两扇门给出的说法并不一样。安妮把亲眼看见和听人说分成两边。",
  },
]

let run = {
  id: "preview-run",
  status: "active",
  content_version: "annie-broad-street-2026-07-27.1",
  current_node: {
    id: "node_doorstep",
    narration: "安妮蹲在门阶边，把“亲眼看见”和“听人说”分成两栏。",
    choices: [
      {
        id: "choice_separate_evidence",
        label: "把亲眼所见与转述分开记录",
        is_key: true,
      },
      {
        id: "choice_declare_pump_guilty",
        label: "直接写下水泵就是唯一原因",
        is_key: true,
      },
    ],
  },
  events: baseEvents,
  relationship: {
    id: "watchful",
    stage: "watchful",
    label: "试探",
    attitude: "安妮仍在核对你会不会把猜测当成事实。",
    last_change_reason: "你先询问她知道什么，没有替她下结论。",
  },
  historical_reference: {
    stage: "investigation",
    unlocked_count: 7,
    total_count: 11,
    entries: references,
  },
  ending: null,
  completed_run_summaries: [],
}

function writeJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  })
  response.end(JSON.stringify(payload))
}

function nextEvent(type, role, content, offset = 1) {
  const sequence = run.events.length + offset
  return {
    id: `event-${sequence}`,
    sequence,
    type,
    role,
    character_id: role === "character" ? detail.character.id : null,
    content,
  }
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", "http://127.0.0.1:8950")
  if (url.pathname.endsWith("/characters/char_history_broad_street_annie")) {
    writeJson(response, 200, detail)
    return
  }
  if (url.pathname === "/api/v1/auth/status") {
    writeJson(response, 200, {
      access_allowed: true,
      auth_mode: "preview",
      parallellines_url: "",
      user: {
        id: "preview-player",
        username: "preview",
        display_name: "预览玩家",
        avatar_url: null,
        role: "player",
        locale: "zh-CN",
        capabilities: [],
        authorization_version: 1,
        access_expires_at: null,
      },
    })
    return
  }
  if (url.pathname.endsWith("/runs/current")) {
    writeJson(response, 200, { run })
    return
  }
  if (request.method === "POST" && url.pathname.endsWith("/choices")) {
    setTimeout(() => {
      run = {
        ...run,
        current_node: {
          id: "node_record_testimony",
          narration: "纸上有了三列。安妮把纸压在陶罐下面，决定最后由谁开口。",
          choices: [
            {
              id: "choice_let_annie_speak",
              label: "让安妮自己说完，你只在旁边补门牌",
              is_key: true,
            },
          ],
        },
        events: [
          ...run.events,
          nextEvent("choice", "player", "把亲眼所见与转述分开记录", 1),
          nextEvent(
            "relationship_changed",
            "system",
            "你把能核对的见闻与转述分开，安妮愿意继续同行。",
            2,
          ),
          nextEvent(
            "narration",
            "system",
            "纸上有了三列。安妮把纸压在陶罐下面，决定最后由谁开口。",
            3,
          ),
        ],
        relationship: {
          ...run.relationship,
          label: "同行",
          last_change_reason: "你把能核对的见闻与转述分开。",
        },
      }
      writeJson(response, 200, { run })
    }, 650)
    return
  }
  if (request.method === "POST" && url.pathname.endsWith("/messages")) {
    let body = ""
    request.on("data", (chunk) => {
      body += chunk
    })
    request.on("end", () => {
      const content = JSON.parse(body || "{}").content || ""
      setTimeout(() => {
        if (String(content).includes("失败")) {
          writeJson(response, 503, { detail: "安妮暂时没有回应，请稍后再试。" })
          return
        }
        run = {
          ...run,
          events: [
            ...run.events,
            nextEvent("message", "player", content, 1),
            nextEvent(
              "message",
              "character",
              "安妮看了看纸页：“只写我们能核对的，好吗？”",
              2,
            ),
          ],
        }
        writeJson(response, 200, { run })
      }, 650)
    })
    return
  }
  writeJson(response, 404, { detail: "preview route not found" })
})

server.listen(8950, "127.0.0.1", () => {
  console.log("Story preview mock listening on http://127.0.0.1:8950")
})
