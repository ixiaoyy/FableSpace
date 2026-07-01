"""Fix coinBalance scope: remove misplaced UI, re-inject in TavernChatWorkbench header."""
from pathlib import Path

fp = Path("frontend/app/features/tavern-chat-workbench/index.tsx")
text = fp.read_text(encoding="utf-8")

# ── 1. Remove misplaced UI from TavernDoorwayRitual ────────────────────────
OLD_WRONG = (
    '          {/* \u2500\u2500 \u91d1\u5e01\u4f59\u989d\u5fbd\u7ae0 \u2500\u2500 */}\n'
    '          {coinBalance !== null && (\n'
    '            <div className="mt-3 flex items-center gap-2">\n'
    '              <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">\n'
    '                \U0001fa99 \u91d1\u5e01\u4f59\u989d\uff1a{coinBalance}\n'
    '              </span>\n'
    '            </div>\n'
    '          )}\n'
    '          {/* \u2500\u2500 \u793c\u7269\u5f39\u51fa\u63d0\u793a \u2500\u2500 */}\n'
    '          {lastGift && (\n'
    '            <div\n'
    '              className="mt-2 animate-bounce rounded-2xl border border-yellow-300/40 bg-yellow-400/15 px-4 py-2 text-sm font-bold text-yellow-200 shadow-lg"\n'
    '              role="status"\n'
    '              aria-live="polite"\n'
    '            >\n'
    '              \U0001f381 \u6536\u5230 {lastGift.items}\uff0c\u83b7\u5f97 +{lastGift.coins} \u91d1\u5e01\uff01\n'
    '            </div>\n'
    '          )}\n'
)
if OLD_WRONG in text:
    text = text.replace(OLD_WRONG, '', 1)
    print("SUCCESS: removed misplaced UI from TavernDoorwayRitual")
else:
    print("WARN: misplaced UI anchor not found (may already be clean)")

# ── 2. Inject coin UI in TavernChatWorkbench header (after WorkbenchChip block) ──
# Find the end of the chip group in TavernChatWorkbench header
# Target: the closing </div> of the flex-wrap chip row, right before </div> closing the header flex
ANCHOR = '              </WorkbenchChip>\n            </div>\n          </div>\n          <TavernDoorwayRitual'
REPLACEMENT = (
    '              </WorkbenchChip>\n'
    '            </div>\n'
    '          </div>\n'
    '          {/* \u2500\u2500 \u91d1\u5e01\u4f59\u989d\u5fbd\u7ae0 \u2500\u2500 */}\n'
    '          {coinBalance !== null && (\n'
    '            <div className="mt-3 flex items-center gap-2">\n'
    '              <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-300">\n'
    '                \U0001fa99 \u91d1\u5e01\uff1a{coinBalance}\n'
    '              </span>\n'
    '            </div>\n'
    '          )}\n'
    '          {lastGift && (\n'
    '            <div\n'
    '              className="mt-2 animate-bounce rounded-2xl border border-yellow-300/40 bg-yellow-400/15 px-4 py-2 text-sm font-bold text-yellow-200 shadow-lg"\n'
    '              role="status"\n'
    '              aria-live="polite"\n'
    '            >\n'
    '              \U0001f381 \u6536\u5230 {lastGift.items}\uff0c\u83b7\u5f97 +{lastGift.coins} \u91d1\u5e01\uff01\n'
    '            </div>\n'
    '          )}\n'
    '          <TavernDoorwayRitual'
)

if ANCHOR in text:
    text = text.replace(ANCHOR, REPLACEMENT, 1)
    print("SUCCESS: coin UI injected into TavernChatWorkbench header")
else:
    print("FAIL: TavernChatWorkbench header anchor not found")
    idx = text.find('TavernDoorwayRitual')
    print(repr(text[max(0,idx-200):idx+30]))

fp.write_text(text, encoding="utf-8")
print("File written.")
