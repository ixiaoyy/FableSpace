with open(r'd:/work/ai-/fablemap/city_persona.py', encoding='utf-8') as f:
    lines = f.readlines()
output = ''.join(lines[160:])
with open(r'd:/work/ai-/cp_tail.txt', 'w', encoding='utf-8') as f:
    f.write(output)
print('done')
