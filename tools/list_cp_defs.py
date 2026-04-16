with open(r'd:/work/ai-/fablemap/city_persona.py', encoding='utf-8') as f:
    lines = f.readlines()
result = []
for i, line in enumerate(lines):
    if 'def ' in line:
        result.append(f'{i+1}: {line.rstrip()}')
output = '\n'.join(result)
with open(r'd:/work/ai-/cp_defs_out.txt', 'w', encoding='utf-8') as f:
    f.write(output)
print('done')
