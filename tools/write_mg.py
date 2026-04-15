with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    src = f.read()
with open(r'd:\work\ai-\mg_src.txt', 'w', encoding='utf-8') as out:
    out.write(src)
print('DONE:', len(src))
