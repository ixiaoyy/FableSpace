with open('d:/work/ai-/frontend/src/WorldMap.jsx', encoding='utf-8') as f:
    lines = f.readlines()

print('Total lines:', len(lines))
print('\n=== Lines 540-585 ===')
for i in range(539, min(585, len(lines))):
    print(f'{i+1}: {lines[i]}', end='')
