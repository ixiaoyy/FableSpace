with open(r'd:/work/ai-/tests/test_e4_player_home.py', encoding='utf-8') as f:
    lines = f.readlines()
output = ''.join(lines[39:82])
with open(r'd:/work/ai-/test_e4_middle.txt', 'w', encoding='utf-8') as f:
    f.write(output)
print('done')
