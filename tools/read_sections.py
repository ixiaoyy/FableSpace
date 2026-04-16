with open(r'd:/work/ai-/fablemap/behavior_compiler.py', encoding='utf-8') as f:
    lines = f.readlines()
output = ''.join(lines[34:90])
with open(r'd:/work/ai-/bc_mv_section.txt', 'w', encoding='utf-8') as f:
    f.write(output)
with open(r'd:/work/ai-/fablemap/memory_graph.py', encoding='utf-8') as f:
    lines2 = f.readlines()
output2 = ''.join(lines2[288:325])
with open(r'd:/work/ai-/mg_ghost_current.txt', 'w', encoding='utf-8') as f:
    f.write(output2)
print('done')
