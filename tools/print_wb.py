with open(r'd:/work/ai-/fablemap/writeback.py', encoding='utf-8') as f:
    lines = f.readlines()
print(f'Total lines: {len(lines)}')
for i, line in enumerate(lines[90:], start=91):
    print(f'{i:3}  {line}', end='')
