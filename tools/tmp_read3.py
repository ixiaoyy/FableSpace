with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    lines = f.readlines()
print(f'Total lines: {len(lines)}')
for i, line in enumerate(lines, start=1):
    if i >= 100:
        print(f'{i}: {line}', end='')
