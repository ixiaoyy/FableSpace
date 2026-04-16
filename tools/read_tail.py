with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    content = f.read()
lines = content.splitlines()
print(f'Total: {len(lines)} lines')
for i, line in enumerate(lines[110:], 111):
    print(f'{i}: {line}')
