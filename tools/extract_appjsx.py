import sys

lines = open('d:/work/ai-/frontend/src/App.jsx', encoding='utf-8').readlines()
total = len(lines)

out = []
out.append(f'TOTAL LINES: {total}')

# --- 1. Find App function start ---
app_start = None
for i, l in enumerate(lines):
    if l.strip().startswith('function App'):
        app_start = i  # 0-indexed
        break

out.append(f'App() starts at line {app_start+1}')

# --- 2. Find end of createApiClient return block ---
# It's the closing `}` on its own line just before App function
create_end = None
for i in range(app_start - 1, 35, -1):
    if lines[i].strip() == '}':
        create_end = i  # 0-indexed, inclusive
        break

out.append(f'createApiClient ends at line {create_end+1}')

# --- 3. Find all async method starts in createApiClient ---
method_starts = []
for i in range(35, create_end + 1):
    s = lines[i].strip()
    if s.startswith('async ') and '(' in s and '{' in s:
        method_starts.append(i)  # 0-indexed

out.append(f'Method start lines (1-indexed): {[m+1 for m in method_starts]}')

# Last 3 methods + closing brace
if len(method_starts) >= 3:
    start_idx = method_starts[-3]
    out.append(f'\n=== SECTION 1: Last 3 methods of createApiClient (lines {start_idx+1}-{create_end+1}) ===')
    for i in range(start_idx, create_end + 1):
        out.append(f'{i+1:4d}: {lines[i]}')
else:
    out.append('ERROR: fewer than 3 methods found')

# --- 4. useState declarations in App component ---
out.append(f'\n=== SECTION 2: useState declarations in App ===')
for i in range(app_start, total):
    l = lines[i]
    if 'useState' in l and '=' in l:
        out.append(f'{i+1:4d}: {l}')

# --- 5. WorldMap JSX element and its props ---
out.append(f'\n=== SECTION 3: WorldMap JSX element ===')
wm_start = None
wm_end = None
for i in range(app_start, total):
    l = lines[i]
    if '<WorldMap' in l and wm_start is None:
        wm_start = i
    if wm_start is not None and wm_end is None:
        if '/>' in l or '</WorldMap>' in l:
            wm_end = i
            break

if wm_start is not None:
    for i in range(wm_start, wm_end + 1):
        out.append(f'{i+1:4d}: {lines[i]}')
else:
    out.append('WorldMap JSX not found')

# --- 6. Last 20 lines ---
out.append(f'\n=== SECTION 4: Last 20 lines (lines {total-19}-{total}) ===')
for i in range(total - 20, total):
    out.append(f'{i+1:4d}: {lines[i]}')

print('\n'.join(out))
