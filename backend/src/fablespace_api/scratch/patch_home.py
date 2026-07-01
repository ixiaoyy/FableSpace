"""Patch home.tsx: remove clientLoader, switch to useEffect-based loading."""
from pathlib import Path
import re

fp = Path("frontend/app/routes/home.tsx")
text = fp.read_text(encoding="utf-8")

# ── 1. Fix import: remove useLoaderData, add useEffect ────────────────────
OLD1 = 'import { Link, useLoaderData, useNavigate } from "react-router"\nimport { useState } from "react"'
NEW1 = 'import { Link, useNavigate } from "react-router"\nimport { useState, useEffect } from "react"'
if OLD1 in text:
    text = text.replace(OLD1, NEW1, 1)
    print("SUCCESS: fixed imports")
else:
    print("FAIL: import anchor not found")
    idx = text.find("react-router")
    print(repr(text[max(0,idx-5):idx+80]))

# ── 2. Remove clientLoader export ─────────────────────────────────────────
# Find and remove the whole clientLoader function
pattern = r'\nexport async function clientLoader\(\).*?\n\}\n'
match = re.search(pattern, text, re.DOTALL)
if match:
    text = text[:match.start()] + "\n" + text[match.end():]
    print("SUCCESS: removed clientLoader")
else:
    print("FAIL: clientLoader not found by regex")
    idx = text.find("clientLoader")
    print(repr(text[max(0,idx-5):idx+200]))

# ── 3. Replace useLoaderData with useState+useEffect in HomeRoute ──────────
OLD3 = 'export default function HomeRoute() {\n  const { result, error } = useLoaderData<typeof clientLoader>()\n'
NEW3 = (
    'export default function HomeRoute() {\n'
    '  const [result, setResult] = useState<TavernListResponse>(EMPTY_LIST_RESULT)\n'
    '  const [error, setError] = useState("")\n'
    '\n'
    '  useEffect(() => {\n'
    '    let cancelled = false\n'
    '    listTaverns({ limit: HOMEPAGE_TAVERN_LIST_LIMIT, offset: 0 })\n'
    '      .then((data) => { if (!cancelled) setResult(data) })\n'
    '      .catch((err) => { if (!cancelled) setError(errorMessage(err)) })\n'
    '    return () => { cancelled = true }\n'
    '  }, [])\n'
    '\n'
)
if OLD3 in text:
    text = text.replace(OLD3, NEW3, 1)
    print("SUCCESS: replaced useLoaderData with useEffect")
else:
    print("FAIL: HomeRoute anchor not found")
    idx = text.find("export default function HomeRoute")
    print(repr(text[idx:idx+200]))

fp.write_text(text, encoding="utf-8")
print("File written.")
