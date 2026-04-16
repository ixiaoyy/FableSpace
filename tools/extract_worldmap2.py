import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

lines = open('d:/work/ai-/frontend/src/WorldMap.jsx', encoding='utf-8').readlines()
total = len(lines)

print('=== COMPONENT SIGNATURE (line 215) ===')
print(f'215: {lines[214]}', end='')

print('\n=== useEffect #1 (lines 264-273) ===')
for j in range(263, 273):
    print(f'{j+1}: {lines[j]}', end='')

print('\n=== useEffect #2 (lines 582-591) ===')
for j in range(581, 591):
    print(f'{j+1}: {lines[j]}', end='')

print('\n=== LAST 30 LINES (717-746) ===')
for j in range(716, 746):
    print(f'{j+1}: {lines[j]}', end='')
