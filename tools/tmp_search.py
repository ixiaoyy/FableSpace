filepath = 'd:/work/ai-/fablemap/world_builder.py'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

total = len(lines)

for i, line in enumerate(lines):
    if 'repair_rituals' in line:
        start = max(0, i - 3)
        end = min(total, i + 4)
        print(f'=== repair_rituals found at line {i+1} ===')
        for j in range(start, end):
            marker = '>>>' if j == i else '   '
            print(f'{marker} {j+1:5d}: {lines[j]}', end='')
        print()

print('DONE')
