import sys
with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    lines = f.readlines()
with open(r'd:\work\ai-\mg_lines.txt', 'w', encoding='utf-8') as out:
    for i, line in enumerate(lines, 1):
        out.write(f'{i}: {line}')
print(f'Total: {len(lines)} lines')
