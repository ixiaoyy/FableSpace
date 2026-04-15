with open(r'd:/work/ai-/fablemap/city_persona.py', encoding='utf-8') as f:
    lines = f.readlines()
output = ''.join(lines[100:165])
with open(r'd:/work/ai-/cp_generate.txt', 'w', encoding='utf-8') as f:
    f.write(output)
print('done')
