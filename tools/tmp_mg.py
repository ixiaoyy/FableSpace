with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    content = f.read()
with open(r'd:\work\ai-\mg_full.txt', 'w', encoding='utf-8') as f:
    f.write(content)
print('written')
