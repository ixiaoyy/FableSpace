# Read the relevant parts and write to output files
import os

with open(r'd:\work\ai-\fablemap\memory_graph.py', encoding='utf-8') as f:
    mg_lines = f.readlines()

with open(r'd:\work\ai-\tests\test_e4_player_home.py', encoding='utf-8') as f:
    test_lines = f.readlines()

with open(r'd:\work\ai-\fablemap\city_persona.py', encoding='utf-8') as f:
    cp_lines = f.readlines()

result = []
result.append('=== memory_graph.py ===\n')
for i, line in enumerate(mg_lines, 1):
    result.append(f'{i}: {line}')

result.append('\n=== test_e4_player_home.py (lines 80+) ===\n')
for i, line in enumerate(test_lines[79:], 80):
    result.append(f'{i}: {line}')

result.append('\n=== city_persona.py (lines 110+) ===\n')
for i, line in enumerate(cp_lines[109:], 110):
    result.append(f'{i}: {line}')

with open(r'd:\work\ai-\files_dump.txt', 'w', encoding='utf-8') as f:
    f.writelines(result)
print('written', len(mg_lines), len(test_lines), len(cp_lines))
