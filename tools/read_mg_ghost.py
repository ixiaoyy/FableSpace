with open(r'd:/work/ai-/fablemap/memory_graph.py', encoding='utf-8') as f:
    lines = f.readlines()
output = ''.join(lines[289:313])
with open(r'd:/work/ai-/mg_ghost_section.txt', 'w', encoding='utf-8') as f:
    f.write(output)
print('done')
