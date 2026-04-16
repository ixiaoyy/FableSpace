keywords = ['street_legends']
filepath = 'd:/work/ai-/fablemap/world_builder.py'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

total = len(lines)
results = []

for i, line in enumerate(lines):
    for kw in keywords:
        if kw in line:
            results.append((kw, i + 1, i))

if not results:
    print('NO MATCHES FOUND')
else:
    for kw, lineno, idx in results:
        start = max(0, idx - 5)
        end = min(total, idx + 6)
        print(f'=== KEYWORD: {kw}  match at line {lineno} ===')
        for j in range(start, end):
            marker = '>>>' if (j + 1) == lineno else '   '
            print(f'{marker} {j+1:5d}: {lines[j]}', end='')
        print()
