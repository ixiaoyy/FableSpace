"""Patch tavern-chat-workbench/index.tsx: add coin state + gift handling (LF version)."""
from pathlib import Path

fp = Path("frontend/app/features/tavern-chat-workbench/index.tsx")
text = fp.read_text(encoding="utf-8")

# ── 1. State declarations ──────────────────────────────────────────────────
OLD1 = "  const [createdMemories, setCreatedMemories] = useState<NpcSocialMemory[]>([])\n  const [draftMessage, setDraftMessage] = useState(\"\")\n"
NEW1 = (
    "  const [createdMemories, setCreatedMemories] = useState<NpcSocialMemory[]>([])\n"
    "  const [draftMessage, setDraftMessage] = useState(\"\")\n"
    "  const [coinBalance, setCoinBalance] = useState<number | null>(null)\n"
    "  const [lastGift, setLastGift] = useState<{ coins: number; items: string } | null>(null)\n"
)
if OLD1 in text:
    text = text.replace(OLD1, NEW1, 1)
    print("SUCCESS: state declarations added")
else:
    print("FAIL: state declaration anchor not found")
    idx = text.find("draftMessage, setDraftMessage")
    print(repr(text[max(0,idx-5):idx+80]))

# ── helper gift snippet ────────────────────────────────────────────────────
GIFT_SNIPPET = (
    "    // eslint-disable-next-line @typescript-eslint/no-explicit-any\n"
    "    const _gift = (result as any).gift\n"
    "    if (_gift && _gift.coins_added > 0) {\n"
    "      setCoinBalance(_gift.wallet_balance ?? null)\n"
    "      const _items = (_gift.events as Array<{ item_name: string; quantity: number }>)\n"
    "        .map((e) => `${e.item_name}\u00d7${e.quantity}`).join(' ')\n"
    "      setLastGift({ coins: _gift.coins_added, items: _items })\n"
    "      setTimeout(() => setLastGift(null), 3500)\n"
    "    }\n"
)

# ── 2. Private chat gift handling ──────────────────────────────────────────
OLD2 = (
    "    if (Array.isArray(result.created_memories) && result.created_memories.length > 0) {\n"
    "      setCreatedMemories((prev) => [...prev, ...(result.created_memories as NpcSocialMemory[])])\n"
    "    }\n"
    "  }\n"
    "\n"
    "  async function sendPublicChat"
)
NEW2 = (
    "    if (Array.isArray(result.created_memories) && result.created_memories.length > 0) {\n"
    "      setCreatedMemories((prev) => [...prev, ...(result.created_memories as NpcSocialMemory[])])\n"
    "    }\n"
    + GIFT_SNIPPET
    + "  }\n"
    "\n"
    "  async function sendPublicChat"
)
if OLD2 in text:
    text = text.replace(OLD2, NEW2, 1)
    print("SUCCESS: private chat gift handling added")
else:
    print("FAIL: private chat anchor not found")

# ── 3. Public chat gift handling ───────────────────────────────────────────
GIFT_SNIPPET_PUBLIC = (
    "      // eslint-disable-next-line @typescript-eslint/no-explicit-any\n"
    "      const _gift = (result as any).gift\n"
    "      if (_gift && _gift.coins_added > 0) {\n"
    "        setCoinBalance(_gift.wallet_balance ?? null)\n"
    "        const _items = (_gift.events as Array<{ item_name: string; quantity: number }>)\n"
    "          .map((e) => `${e.item_name}\u00d7${e.quantity}`).join(' ')\n"
    "        setLastGift({ coins: _gift.coins_added, items: _items })\n"
    "        setTimeout(() => setLastGift(null), 3500)\n"
    "      }\n"
)

OLD3 = (
    "      if (Array.isArray(result.created_memories) && result.created_memories.length > 0) {\n"
    "        setCreatedMemories((prev) => [...prev, ...(result.created_memories as NpcSocialMemory[])])\n"
    "      }\n"
    "      return\n"
)
NEW3 = (
    "      if (Array.isArray(result.created_memories) && result.created_memories.length > 0) {\n"
    "        setCreatedMemories((prev) => [...prev, ...(result.created_memories as NpcSocialMemory[])])\n"
    "      }\n"
    + GIFT_SNIPPET_PUBLIC
    + "      return\n"
)
if OLD3 in text:
    text = text.replace(OLD3, NEW3, 1)
    print("SUCCESS: public chat gift handling added")
else:
    print("FAIL: public chat anchor not found")
    idx = text.find("setCreatedMemories((prev) => [...prev")
    print(repr(text[idx-5:idx+200]))

fp.write_text(text, encoding="utf-8")
print("File written.")
