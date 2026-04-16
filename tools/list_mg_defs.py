import sys
with open(r'd:/work/ai-/fablemap/memory_graph.py', encoding='utf-8') as f:
    lines = f.readlines()
result = []
result.append(f'Total lines: {len(lines)}')
for i, line in enumerate(lines):
    if 'def ' in line:
        result.append(f'{i+1}: {line.rstrip()}')
output = '\n'.join(result)
with open(r'd:/work/ai-/mg_defs_out.txt', 'w', encoding='utf-8') as f:
    f.write(output)
print('done')
