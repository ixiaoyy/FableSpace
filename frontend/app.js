const { useEffect, useMemo, useState } = React;

function createApiClient(getBaseUrl) {
  async function readJson(response) {
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  }

  return {
    async getHealth() {
      const response = await fetch(`${getBaseUrl()}/api/health`, { cache: "no-store" });
      return readJson(response);
    },
    async getMeta() {
      const response = await fetch(`${getBaseUrl()}/api/meta`, { cache: "no-store" });
      return readJson(response);
    },
    async createNearbyPreview(form) {
      const response = await fetch(`${getBaseUrl()}/api/nearby`, {
        method: "POST",
        body: new URLSearchParams(form),
      });
      return readJson(response);
    },
    async submitWorldEvent(event) {
      const response = await fetch(`${getBaseUrl()}/api/world/event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });
      return readJson(response);
    },
  };
}

const initialForm = {
  lat: "35.6580",
  lon: "139.7016",
  radius: "300",
  mode: "fixture",
  seed: "",
};

const initialWritebackForm = {
  playerId: "player_local",
  eventType: "observe",
  visibility: "private",
  targetType: "poi",
  targetId: "poi_clocktower_01",
  sliceId: "slice_demo_shibuya",
  zoneId: "zone_shibuya_core",
  intensity: "1",
  tag: "safe",
  note: "",
};

function App() {
  const [apiBase, setApiBase] = useState(window.location.origin);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusOk, setStatusOk] = useState(false);
  const [statusText, setStatusText] = useState("等待连接 FastAPI...");
  const [statusDetail, setStatusDetail] = useState("");
  const [result, setResult] = useState(null);
  const [errorText, setErrorText] = useState("");
  const [form, setForm] = useState(initialForm);
  const [writebackForm, setWritebackForm] = useState(initialWritebackForm);
  const [writebackSubmitting, setWritebackSubmitting] = useState(false);
  const [writebackResult, setWritebackResult] = useState(null);
  const [writebackError, setWritebackError] = useState("");

  const api = useMemo(() => createApiClient(() => apiBase.replace(/\/$/, "")), [apiBase]);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateWritebackForm(key, value) {
    setWritebackForm((current) => ({ ...current, [key]: value }));
  }

  function applyMeta(nextMeta) {
    if (!nextMeta) {
      return;
    }
    const coords = nextMeta.default_coordinates || {};
    setForm((current) => ({
      ...current,
      lat: typeof coords.lat === "number" ? String(coords.lat) : current.lat,
      lon: typeof coords.lon === "number" ? String(coords.lon) : current.lon,
      radius: typeof coords.radius === "number" ? String(coords.radius) : current.radius,
      mode: nextMeta.default_mode || current.mode,
    }));
  }

  async function checkBackend() {
    setChecking(true);
    setStatusOk(false);
    setStatusText("正在检查 FastAPI 服务...");
    setStatusDetail("");
    try {
      const [nextHealth, nextMeta] = await Promise.all([api.getHealth(), api.getMeta()]);
      applyMeta(nextMeta);
      setStatusOk(true);
      setStatusText(`FastAPI 已连接 · ${nextMeta.project || "FableMap"}`);
      setStatusDetail(
        `frontend_mode=${nextMeta.frontend_mode} · fixture_available=${nextHealth.fixture_available} · output_root=${nextHealth.output_root}`
      );
    } catch (error) {
      setStatusOk(false);
      setStatusText("FastAPI 不可用");
      setStatusDetail(error.message || String(error));
    } finally {
      setChecking(false);
    }
  }

  async function submitNearby(refresh) {
    setSubmitting(true);
    setErrorText(refresh ? "正在刷新附近世界..." : "正在生成附近世界...");
    try {
      const payload = await api.createNearbyPreview({
        lat: form.lat,
        lon: form.lon,
        radius: form.radius,
        mode: form.mode,
        seed: form.seed,
        refresh: refresh ? "true" : "false",
      });
      setResult(payload);
      setErrorText("");
      setWritebackForm((current) => ({
        ...current,
        sliceId: payload.world_id || current.sliceId,
        targetId: payload.primary_poi_id || current.targetId,
        zoneId: payload.primary_zone_id || current.zoneId,
      }));
    } catch (error) {
      setResult(null);
      setErrorText(`生成失败：${error.message || String(error)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitWriteback() {
    setWritebackSubmitting(true);
    setWritebackError("");
    setWritebackResult(null);

    const event = {
      event_type: writebackForm.eventType,
      player_id: writebackForm.playerId,
      visibility: writebackForm.visibility,
      target: {
        target_type: writebackForm.targetType,
        target_id: writebackForm.targetId,
        slice_id: writebackForm.sliceId,
      },
      payload:
        writebackForm.eventType === "mark"
          ? {
              tag: writebackForm.tag,
              note: writebackForm.note,
            }
          : writebackForm.eventType === "observe"
            ? {
                intensity: Number(writebackForm.intensity || "1"),
                note: writebackForm.note,
              }
            : {
                zone_id: writebackForm.zoneId,
                note: writebackForm.note,
              },
      source: {
        client: "web",
        surface: "fallback_writeback_panel",
        version: "v0.1",
      },
      context: {
        current_zone_id: writebackForm.zoneId,
        nearest_poi_id: writebackForm.targetId,
      },
    };

    try {
      const payload = await api.submitWorldEvent(event);
      setWritebackResult(payload);
    } catch (error) {
      setWritebackError(`写回失败：${error.message || String(error)}`);
    } finally {
      setWritebackSubmitting(false);
    }
  }

  useEffect(() => {
    checkBackend();
  }, []);

  const previewUrl = result?.preview_url || "";
  const recentEchoes = writebackResult?.place_state?.recent_echoes || [];
  const recentMarks = writebackResult?.place_state?.marks || [];
  const playerState = writebackResult?.player_state || null;
  const feedback = writebackResult?.world_feedback || null;
  const metricCards = [
    {
      label: "Backend",
      value: statusOk ? "Online" : "Offline",
      tone: statusOk ? "ok" : "warn",
      detail: statusOk ? "FastAPI connected" : "Waiting for service",
    },
    {
      label: "World slice",
      value: result?.world_id || "Not generated",
      tone: result ? "accent" : "muted",
      detail: result ? `${result.poi_count ?? 0} POI · ${result.landmark_count ?? 0} landmarks` : "Create a nearby preview first",
    },
    {
      label: "Player state",
      value: playerState?.action_state || "Idle",
      tone: playerState ? "accent" : "muted",
      detail: playerState
        ? `clarity ${playerState.clarity ?? "-"} · tension ${playerState.tension ?? "-"}`
        : "No writeback submitted",
    },
    {
      label: "World feedback",
      value: feedback?.summary || "No response yet",
      tone: feedback ? "ok" : "muted",
      detail: feedback?.broadcast_hints?.length
        ? feedback.broadcast_hints.join(" · ")
        : "Awaiting persistent world feedback",
    },
  ];
  const activityItems = [
    {
      title: "Connection",
      text: statusText,
      meta: statusDetail || "Use Recheck to sync with backend metadata.",
    },
    {
      title: "Nearby world",
      text: result
        ? `${result.region_theme || "Unknown theme"} · ${result.dominant_faction || "No faction"}`
        : "Generate preview to unlock world summary.",
      meta: result
        ? `${result.provider || "provider -"} · cache ${result.cache_status || "-"}`
        : "Supports live OSM and fixture demo modes.",
    },
    {
      title: "Writeback loop",
      text: writebackResult
        ? `${writebackResult.place_state?.last_event_type || writebackForm.eventType} stored successfully`
        : "Submit observe / dwell / mark to persist memory.",
      meta: writebackResult
        ? `stored events ${writebackResult.persistence?.stored_event_count ?? "-"}`
        : "Recent echoes and marks will appear after writeback.",
    },
  ];
  const heroHighlights = [
    {
      title: "One-page world console",
      text: "从连接检查、切片生成到写回反馈，首页直接覆盖整个 MVP 操作链路。",
    },
    {
      title: "Narrative aware data",
      text: result
        ? `当前世界主题为 ${result.region_theme || "Unknown"}，可继续围绕 ${result.dominant_faction || "neutral faction"} 扩展体验。`
        : "尚未生成世界时，也能先查看操作指引和系统能力说明。",
    },
    {
      title: "Persistent memory loop",
      text: writebackResult
        ? `最近一次 ${writebackResult.place_state?.last_event_type || writebackForm.eventType} 已回写并更新持久化状态。`
        : "提交 observe、dwell、mark 后，首页会继续展示状态回流结果。",
    },
  ];
  const capabilityCards = [
    {
      title: "Live map ingestion",
      description: "支持 live OSM 与 fixture demo 双模式，便于本地调试与线上地图切换。",
      badge: form.mode === "live" ? "Live active" : "Fixture active",
    },
    {
      title: "Stateful player trace",
      description: "玩家状态、地点熟悉度、事件痕迹和世界反馈可在同一页串联观察。",
      badge: playerState ? "State captured" : "Waiting input",
    },
    {
      title: "Embedded visual preview",
      description: "生成完成后直接内嵌 bundle preview，减少来回跳转并提高迭代效率。",
      badge: previewUrl ? "Preview ready" : "Preview pending",
    },
  ];
  const journeySteps = [
    {
      step: "01",
      title: "Connect backend",
      text: "校验 FastAPI 服务、默认坐标与运行模式。",
    },
    {
      step: "02",
      title: "Generate slice",
      text: "基于经纬度、半径和 seed 生成附近世界切片。",
    },
    {
      step: "03",
      title: "Write memory",
      text: "提交 observe / dwell / mark，把玩家行为写回世界状态。",
    },
    {
      step: "04",
      title: "Review feedback",
      text: "查看玩家状态、地点痕迹、广播提示与嵌入式预览。",
    },
  ];
  const spotlightStats = [
    { label: "POI", value: result?.poi_count ?? "--" },
    { label: "Roads", value: result?.road_count ?? "--" },
    { label: "Landmarks", value: result?.landmark_count ?? "--" },
    { label: "Echoes", value: recentEchoes.length || "--" },
  ];

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "div",
      { className: "wrap" },
      React.createElement(
        "section",
        { className: "hero panel" },
        React.createElement("p", { className: "eyebrow" }, "Persistent slice MVP"),
        React.createElement("h1", null, "FableMap · FastAPI + React"),
        React.createElement(
          "p",
          null,
          "当前版本已把最小世界写回闭环接到 FastAPI：先生成 nearby 世界，再提交 observe / dwell / mark 事件。"
        ),
        React.createElement(
          "div",
          { className: "tag-row" },
          React.createElement("span", { className: "tag" }, "FastAPI backend"),
          React.createElement("span", { className: "tag" }, "React frontend"),
          React.createElement("span", { className: "tag" }, "World writeback MVP")
        )
      ),
      React.createElement(
        "section",
        { className: "panel story-panel" },
        React.createElement(
          "div",
          { className: "story-head" },
          React.createElement(
            "div",
            null,
            React.createElement("p", { className: "eyebrow" }, "Live dashboard"),
            React.createElement("h2", null, "World pulse")
          ),
          React.createElement(
            "p",
            { className: "note muted story-copy" },
            "把连接状态、切片结果与写回反馈集中展示，便于快速观察当前世界是否完成闭环。"
          )
        ),
        React.createElement(
          "div",
          { className: "metric-grid" },
          ...metricCards.map((card) =>
            React.createElement(
              "div",
              { key: card.label, className: `metric-card ${card.tone}` },
              React.createElement("div", { className: "metric-label" }, card.label),
              React.createElement("div", { className: "metric-value" }, card.value),
              React.createElement("div", { className: "metric-detail" }, card.detail)
            )
          )
        ),
        React.createElement(
          "div",
          { className: "activity-list" },
          ...activityItems.map((item) =>
            React.createElement(
              "div",
              { key: item.title, className: "activity-item" },
              React.createElement("div", { className: "activity-dot" }),
              React.createElement(
                "div",
                { className: "activity-body" },
                React.createElement("div", { className: "activity-title" }, item.title),
                React.createElement("div", { className: "activity-text" }, item.text),
                React.createElement("div", { className: "activity-meta" }, item.meta)
              )
            )
          )
        )
      ),
      React.createElement(
        "section",
        { className: "showcase-grid" },
        React.createElement(
          "div",
          { className: "panel showcase-card showcase-card-wide" },
          React.createElement("p", { className: "eyebrow" }, "Homepage expansion"),
          React.createElement("h2", null, "Command center overview"),
          React.createElement(
            "p",
            { className: "note muted" },
            "首页不仅展示表单，还承担产品说明、操作引导与当前世界摘要，让首次进入的用户也能快速理解系统。"
          ),
          React.createElement(
            "div",
            { className: "badge-cloud" },
            ...heroHighlights.map((item) =>
              React.createElement(
                "div",
                { key: item.title, className: "showcase-pill" },
                React.createElement("strong", null, item.title),
                React.createElement("span", null, item.text)
              )
            )
          )
        ),
        React.createElement(
          "div",
          { className: "panel showcase-card" },
          React.createElement("p", { className: "eyebrow" }, "Current slice stats"),
          React.createElement("h2", null, "Live snapshot"),
          React.createElement(
            "div",
            { className: "mini-stat-grid" },
            ...spotlightStats.map((item) =>
              React.createElement(
                "div",
                { key: item.label, className: "mini-stat-card" },
                React.createElement("span", { className: "mini-stat-label" }, item.label),
                React.createElement("strong", { className: "mini-stat-value" }, item.value)
              )
            )
          )
        )
      ),
      React.createElement(
        "section",
        { className: "feature-layout" },
        ...capabilityCards.map((item) =>
          React.createElement(
            "div",
            { key: item.title, className: "panel feature-card" },
            React.createElement("div", { className: "feature-badge" }, item.badge),
            React.createElement("h2", null, item.title),
            React.createElement("p", { className: "note muted" }, item.description)
          )
        )
      ),
      React.createElement(
        "section",
        { className: "panel journey-panel" },
        React.createElement("p", { className: "eyebrow" }, "Workflow guide"),
        React.createElement("h2", null, "Homepage journey"),
        React.createElement(
          "div",
          { className: "journey-grid" },
          ...journeySteps.map((item) =>
            React.createElement(
              "div",
              { key: item.step, className: "journey-step" },
              React.createElement("div", { className: "journey-step-no" }, item.step),
              React.createElement("h3", null, item.title),
              React.createElement("p", { className: "note muted" }, item.text)
            )
          )
        )
      ),
      React.createElement(
        "div",
        { className: "grid" },
        React.createElement(
          "section",
          { className: "panel" },
          React.createElement("h2", null, "Backend connection"),
          React.createElement("label", { htmlFor: "server-base" }, "API base URL"),
          React.createElement(
            "div",
            { className: "row-2" },
            React.createElement("input", {
              id: "server-base",
              type: "text",
              value: apiBase,
              onChange: (event) => setApiBase(event.target.value),
            }),
            React.createElement(
              "button",
              {
                type: "button",
                className: "secondary",
                disabled: checking,
                onClick: checkBackend,
              },
              checking ? "Checking..." : "Recheck"
            )
          ),
          React.createElement(
            "p",
            { className: "status" },
            React.createElement("span", { className: `dot${statusOk ? " ok" : ""}` }),
            React.createElement("span", null, statusText)
          ),
          React.createElement("p", { className: "note muted" }, statusDetail)
        ),
        React.createElement(
          "section",
          { className: "panel" },
          React.createElement("h2", null, "Generate nearby world"),
          React.createElement(
            "div",
            { className: "row" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { htmlFor: "lat" }, "Latitude"),
              React.createElement("input", {
                id: "lat",
                type: "number",
                step: "0.000001",
                value: form.lat,
                onChange: (event) => updateForm("lat", event.target.value),
              })
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { htmlFor: "lon" }, "Longitude"),
              React.createElement("input", {
                id: "lon",
                type: "number",
                step: "0.000001",
                value: form.lon,
                onChange: (event) => updateForm("lon", event.target.value),
              })
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { htmlFor: "radius" }, "Radius (m)"),
              React.createElement("input", {
                id: "radius",
                type: "number",
                min: "1",
                step: "1",
                value: form.radius,
                onChange: (event) => updateForm("radius", event.target.value),
              })
            )
          ),
          React.createElement(
            "div",
            { className: "row-2" },
            React.createElement(
              "div",
              null,
              React.createElement("label", { htmlFor: "mode" }, "Mode"),
              React.createElement(
                "select",
                {
                  id: "mode",
                  value: form.mode,
                  onChange: (event) => updateForm("mode", event.target.value),
                },
                React.createElement("option", { value: "live" }, "Live OSM"),
                React.createElement("option", { value: "fixture" }, "Fixture demo")
              )
            ),
            React.createElement(
              "div",
              null,
              React.createElement("label", { htmlFor: "seed" }, "Seed"),
              React.createElement("input", {
                id: "seed",
                type: "text",
                placeholder: "optional stable seed",
                value: form.seed,
                onChange: (event) => updateForm("seed", event.target.value),
              })
            )
          ),
          React.createElement(
            "div",
            { className: "actions" },
            React.createElement(
              "button",
              {
                type: "button",
                disabled: submitting,
                onClick: () => submitNearby(false),
              },
              submitting ? "Submitting..." : "Generate preview"
            ),
            React.createElement(
              "button",
              {
                type: "button",
                className: "secondary",
                disabled: submitting,
                onClick: () => submitNearby(true),
              },
              "Refresh live map"
            )
          )
        ),
        React.createElement(
          "section",
          { className: "panel" },
          React.createElement("h2", null, "Result"),
          errorText
            ? React.createElement("p", { className: "note" }, errorText)
            : result
              ? React.createElement(
                  "div",
                  { className: "result-card" },
                  React.createElement("div", null, React.createElement("strong", null, "World ID:"), " ", result.world_id || "-"),
                  React.createElement("div", null, React.createElement("strong", null, "Theme:"), " ", result.region_theme || "-"),
                  React.createElement("div", null, React.createElement("strong", null, "Faction:"), " ", result.dominant_faction || "-"),
                  React.createElement(
                    "div",
                    null,
                    React.createElement("strong", null, "Counts:"),
                    ` POI ${result.poi_count ?? "-"} · Roads ${result.road_count ?? "-"} · Landmarks ${result.landmark_count ?? "-"}`
                  ),
                  React.createElement(
                    "div",
                    null,
                    React.createElement("strong", null, "Provider:"),
                    ` ${result.provider || "-"} · `,
                    React.createElement("strong", null, "Cache:"),
                    ` ${result.cache_status || "-"}`
                  ),
                  React.createElement("div", null, React.createElement("strong", null, "Generated at:"), " ", result.generated_at || "-"),
                  React.createElement(
                    "div",
                    { className: "link-row" },
                    React.createElement("a", { href: result.preview_url, target: "_blank", rel: "noreferrer" }, "Open preview"),
                    React.createElement("a", { href: result.world_url, target: "_blank", rel: "noreferrer" }, "Open world.json"),
                    React.createElement("a", { href: result.manifest_url, target: "_blank", rel: "noreferrer" }, "Open manifest.json")
                  )
                )
              : React.createElement("p", { className: "note" }, "No result yet. Start FastAPI and generate one preview.")
        )
      ),
      React.createElement(
        "section",
        { className: "panel preview-panel" },
        React.createElement("h2", null, "Writeback event"),
        React.createElement(
          "p",
          { className: "note" },
          "使用同一切片提交最小事件，验证玩家状态、地点痕迹与世界反馈是否会被后端持久化。"
        ),
        React.createElement(
          "div",
          { className: "row-3" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { htmlFor: "player-id" }, "Player ID"),
            React.createElement("input", {
              id: "player-id",
              type: "text",
              value: writebackForm.playerId,
              onChange: (event) => updateWritebackForm("playerId", event.target.value),
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { htmlFor: "event-type" }, "Event type"),
            React.createElement(
              "select",
              {
                id: "event-type",
                value: writebackForm.eventType,
                onChange: (event) => updateWritebackForm("eventType", event.target.value),
              },
              React.createElement("option", { value: "observe" }, "observe"),
              React.createElement("option", { value: "dwell" }, "dwell"),
              React.createElement("option", { value: "mark" }, "mark")
            )
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { htmlFor: "visibility" }, "Visibility"),
            React.createElement(
              "select",
              {
                id: "visibility",
                value: writebackForm.visibility,
                onChange: (event) => updateWritebackForm("visibility", event.target.value),
              },
              React.createElement("option", { value: "private" }, "private"),
              React.createElement("option", { value: "local_public" }, "local_public"),
              React.createElement("option", { value: "global" }, "global")
            )
          )
        ),
        React.createElement(
          "div",
          { className: "row-3" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { htmlFor: "target-type" }, "Target type"),
            React.createElement(
              "select",
              {
                id: "target-type",
                value: writebackForm.targetType,
                onChange: (event) => updateWritebackForm("targetType", event.target.value),
              },
              React.createElement("option", { value: "poi" }, "poi"),
              React.createElement("option", { value: "zone" }, "zone"),
              React.createElement("option", { value: "route" }, "route"),
              React.createElement("option", { value: "home" }, "home"),
              React.createElement("option", { value: "world" }, "world")
            )
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { htmlFor: "target-id" }, "Target ID"),
            React.createElement("input", {
              id: "target-id",
              type: "text",
              value: writebackForm.targetId,
              onChange: (event) => updateWritebackForm("targetId", event.target.value),
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { htmlFor: "slice-id" }, "Slice ID"),
            React.createElement("input", {
              id: "slice-id",
              type: "text",
              value: writebackForm.sliceId,
              onChange: (event) => updateWritebackForm("sliceId", event.target.value),
            })
          )
        ),
        React.createElement(
          "div",
          { className: "row-3" },
          React.createElement(
            "div",
            null,
            React.createElement("label", { htmlFor: "zone-id" }, "Zone ID"),
            React.createElement("input", {
              id: "zone-id",
              type: "text",
              value: writebackForm.zoneId,
              onChange: (event) => updateWritebackForm("zoneId", event.target.value),
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { htmlFor: "intensity" }, "Observe intensity"),
            React.createElement("input", {
              id: "intensity",
              type: "number",
              min: "1",
              max: "3",
              step: "1",
              value: writebackForm.intensity,
              onChange: (event) => updateWritebackForm("intensity", event.target.value),
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { htmlFor: "mark-tag" }, "Mark tag"),
            React.createElement(
              "select",
              {
                id: "mark-tag",
                value: writebackForm.tag,
                onChange: (event) => updateWritebackForm("tag", event.target.value),
              },
              React.createElement("option", { value: "safe" }, "safe"),
              React.createElement("option", { value: "uncanny" }, "uncanny"),
              React.createElement("option", { value: "warm_corner" }, "warm_corner"),
              React.createElement("option", { value: "return_again" }, "return_again"),
              React.createElement("option", { value: "rain_friendly" }, "rain_friendly")
            )
          )
        ),
        React.createElement("label", { htmlFor: "writeback-note" }, "Optional note"),
        React.createElement("input", {
          id: "writeback-note",
          type: "text",
          value: writebackForm.note,
          onChange: (event) => updateWritebackForm("note", event.target.value),
          placeholder: "lightweight annotation for the event",
        }),
        React.createElement(
          "div",
          { className: "actions" },
          React.createElement(
            "button",
            {
              type: "button",
              disabled: writebackSubmitting,
              onClick: submitWriteback,
            },
            writebackSubmitting ? "Writing back..." : "Submit writeback event"
          )
        ),
        writebackError ? React.createElement("p", { className: "note error-note" }, writebackError) : null,
        writebackResult
          ? React.createElement(
              "div",
              { className: "writeback-grid" },
              React.createElement(
                "div",
                { className: "result-card" },
                React.createElement("h3", null, "Player state"),
                React.createElement("div", null, React.createElement("strong", null, "Action:"), " ", playerState?.action_state || "-"),
                React.createElement("div", null, React.createElement("strong", null, "Clarity:"), " ", playerState?.clarity ?? "-"),
                React.createElement("div", null, React.createElement("strong", null, "Tension:"), " ", playerState?.tension ?? "-"),
                React.createElement("div", null, React.createElement("strong", null, "Attunement:"), " ", playerState?.attunement ?? "-"),
                React.createElement("div", null, React.createElement("strong", null, "Zone familiarity:"), " ", JSON.stringify(playerState?.zone_familiarity || {})),
                React.createElement("div", null, React.createElement("strong", null, "POI familiarity:"), " ", JSON.stringify(playerState?.poi_familiarity || {}))
              ),
              React.createElement(
                "div",
                { className: "result-card" },
                React.createElement("h3", null, "Place state"),
                React.createElement("div", null, React.createElement("strong", null, "Target:"), " ", writebackResult.place_state?.target_id || "-"),
                React.createElement("div", null, React.createElement("strong", null, "Type:"), " ", writebackResult.place_state?.target_type || "-"),
                React.createElement("div", null, React.createElement("strong", null, "Familiarity:"), " ", writebackResult.place_state?.familiarity ?? "-"),
                React.createElement("div", null, React.createElement("strong", null, "Mark count:"), " ", writebackResult.place_state?.mark_count ?? "-"),
                React.createElement("div", null, React.createElement("strong", null, "Last event:"), " ", writebackResult.place_state?.last_event_type || "-"),
                React.createElement("div", null, React.createElement("strong", null, "Stored events:"), " ", writebackResult.persistence?.stored_event_count ?? "-")
              ),
              React.createElement(
                "div",
                { className: "result-card" },
                React.createElement("h3", null, "World feedback"),
                React.createElement("div", null, React.createElement("strong", null, "Summary:"), " ", feedback?.summary || "-"),
                React.createElement("div", null, React.createElement("strong", null, "Broadcast:"), " ", (feedback?.broadcast_hints || []).join(" · ") || "-"),
                React.createElement("div", null, React.createElement("strong", null, "Revealed:"), " ", (feedback?.revealed_fields || []).join(" · ") || "-"),
                React.createElement("div", null, React.createElement("strong", null, "Persistence file:"), " ", writebackResult.persistence?.state_file || "-")
              )
            )
          : null,
        recentEchoes.length
          ? React.createElement(
              "div",
              { className: "result-card stacked-card" },
              React.createElement("h3", null, "Recent echoes"),
              ...recentEchoes.map((entry) =>
                React.createElement(
                  "div",
                  {
                    key: `${entry.timestamp}-${entry.target_id}-${entry.entry_type}`,
                    className: "subtle-block",
                  },
                  React.createElement("strong", null, entry.entry_type),
                  " · ",
                  entry.text
                )
              )
            )
          : null,
        recentMarks.length
          ? React.createElement(
              "div",
              { className: "result-card stacked-card" },
              React.createElement("h3", null, "Recent marks"),
              ...recentMarks.map((entry) =>
                React.createElement(
                  "div",
                  { key: entry.event_id, className: "subtle-block" },
                  React.createElement("strong", null, entry.tag),
                  " · ",
                  entry.visibility,
                  entry.note ? ` · ${entry.note}` : ""
                )
              )
            )
          : null
      ),
      React.createElement(
        "section",
        { className: "panel preview-panel" },
        React.createElement("h2", null, "Preview"),
        React.createElement("p", { className: "note" }, "生成成功后会直接嵌入 API 返回的 bundle preview。"),
        previewUrl
          ? React.createElement("iframe", { src: previewUrl, title: "FableMap preview" })
          : React.createElement("div", { className: "preview-empty" }, "Preview not generated yet.")
      )
    )
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(React.createElement(App));
