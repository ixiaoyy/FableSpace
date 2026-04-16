lines = open('d:/work/ai-/frontend/src/WorldMap.jsx', encoding='utf-8').readlines()
total = len(lines)
print('TOTAL LINES:', total)

print('\n=== COMPONENT SIGNATURE ===')
for i, l in enumerate(lines, 1):
    if 'function WorldMap' in l or ('export default' in l):
        print(f'{i}: {l}', end='')

print('\n=== useEffect LINE NUMBERS ===')
useeffect_lines = []
for i, l in enumerate(lines, 1):
    if 'useEffect' in l:
        print(f'{i}: {l}', end='')
        useeffect_lines.append(i)

print('\n=== FIRST 10 LINES OF EACH useEffect ===')
for start in useeffect_lines:
    print(f'\n--- useEffect at line {start} ---')
    for j in range(start-1, min(start+9, total)):
        print(f'{j+1}: {lines[j]}', end='')

print('\n\n=== LAST 30 LINES ===')
for j in range(max(0, total-30), total):
    print(f'{j+1}: {lines[j]}', end='')
