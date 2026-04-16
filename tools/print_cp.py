with open(r'd:/work/ai-/fablemap/city_persona.py', encoding='utf-8') as f:
    lines = f.readlines()
print(f'Total lines: {len(lines)}')
for i, line in enumerate(lines[110:], start=111):
    print(f'{i:3}  {line}', end='')
