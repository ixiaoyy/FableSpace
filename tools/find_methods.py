with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    content = f.read()
lines = content.splitlines()
print(f'Total lines: {len(lines)}')
# Find record_ghost_trace, get_ghost_traces, set_home, get_home
for i, line in enumerate(lines, 1):
    if any(kw in line for kw in ['def record_ghost', 'def get_ghost', 'def set_home', 'def get_home']):
        print(f'LINE {i}: {line}')
        for j in range(i, min(i+15, len(lines))):
            print(f'  {j+1}: {lines[j]}')
        print()
