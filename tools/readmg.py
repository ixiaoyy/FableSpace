with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    lines = f.readlines()
with open(r'd:\work\ai-\mg_all.txt', 'w', encoding='utf-8') as out:
    out.writelines(lines)
print(len(lines))
