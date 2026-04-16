with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    content = f.read()
with open(r'd:\work\ai-\memory_graph_dump.txt', 'w', encoding='utf-8') as out:
    out.write(content)
print('done, length:', len(content))
