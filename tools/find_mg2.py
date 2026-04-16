import sys
with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    content = f.read()
lines = content.splitlines()
result = [f'Total lines: {len(lines)}']
for i, line in enumerate(lines, 1):
    if any(kw in line for kw in ['def record_ghost', 'def get_ghost', 'def set_home', 'def get_home']):
        start = max(0, i-1)
        end = min(len(lines), i+20)
        result.append(f'--- Found at line {i} ---')
        for j in range(start, end):
            result.append(f'{j+1}: {lines[j]}')
        result.append('')
output = '\n'.join(result)
with open(r'd:\work\ai-\mg_methods.txt', 'w', encoding='utf-8') as f:
    f.write(output)
print(output)
