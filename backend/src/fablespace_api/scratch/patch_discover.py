"""Patch discover.tsx: remove blocking clientLoader, switch to useEffect-based loading."""
from pathlib import Path
import re

fp = Path("frontend/app/routes/discover.tsx")
text = fp.read_text(encoding="utf-8")

# ── 1. Fix imports ────────────────────────────────────────────────────────
# Remove useLoaderData, add useEffect
text = text.replace(
    'import { Link, useLoaderData, useSearchParams } from "react-router"',
    'import { Link, useSearchParams } from "react-router"'
)
if 'import { useState, useEffect, useMemo } from "react"' not in text:
    text = text.replace(
        'import { useState, useMemo, useEffect } from "react"', # check common orderings
        'import { useState, useEffect, useMemo } from "react"'
    )
    # Fallback if the above fails
    if 'import { useState, useEffect, useMemo } from "react"' not in text:
        text = text.replace('import { useState, useMemo } from "react"', 'import { useState, useEffect, useMemo } from "react"')

# ── 2. Remove clientLoader ────────────────────────────────────────────────
pattern = r'export async function clientLoader\(\{ request \}: ClientLoaderFunctionArgs\): Promise<DiscoverLoaderData> \{.*?\n\}'
text = re.sub(pattern, '', text, flags=re.DOTALL)

# ── 3. Update DiscoverRoute component ─────────────────────────────────────
# Replace: const { result, error } = useLoaderData<typeof clientLoader>()
# With: state and effect
OLD_ROUTE_START = 'export default function DiscoverRoute() {\n  const { result, error } = useLoaderData<typeof clientLoader>()'
NEW_ROUTE_START = (
    'export default function DiscoverRoute() {\n'
    '  const [result, setResult] = useState<TavernListResponse>({ taverns: [], count: 0 })\n'
    '  const [error, setError] = useState("")\n'
    '  const [loading, setLoading] = useState(true)\n'
    '\n'
    '  const [searchParams, setSearchParams] = useSearchParams()\n'
    '\n'
    '  useEffect(() => {\n'
    '    let cancelled = false\n'
    '    setLoading(true)\n'
    '    listTaverns(discoverListFiltersFromRequest(new Request(window.location.href)))\n'
    '      .then((data) => { if (!cancelled) { setResult(data); setLoading(false); } })\n'
    '      .catch((err) => { if (!cancelled) { setError(errorMessage(err)); setLoading(false); } })\n'
    '    return () => { cancelled = true }\n'
    '  }, [searchParams])\n'
)

text = text.replace(OLD_ROUTE_START, NEW_ROUTE_START)

fp.write_text(text, encoding="utf-8")
print("File written.")
