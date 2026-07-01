import sys
import re
from pathlib import Path

def run():
    file_path = Path('backend/src/fablespace_api/core/default_taverns.py')
    if not file_path.exists():
        print("Error: File not found")
        return
        
    content = file_path.read_text(encoding='utf-8')

    # 定义性格分配表
    assignments = {
        'char_pw_aheng': ['敷衍', '惜字如金', '冷淡'],
        'char_pw_zhijian': ['精炼', '简洁', '干练'],
        'char_pw_luming': ['温和', '拟人', '生活化'],
        'char_pw_qiaoqiao': ['热情', '活泼', '话痨'],
        'char_pw_yeyu': ['忧郁', '拟人', '深沉'],
        'char_pw_dengxin': ['敷衍', '厌世', '懒散'],
        'char_pw_qiaoshou': ['精炼', '专业', '工匠'],
        'char_pw_shiyi': ['精炼', '简洁', '细致'],
        'char_pw_huoyan': ['话痨', '多话', '急躁'],
        'char_pw_xingdai': ['话痨', '多话', '幻想'],
        'char_pw_tongling': ['话痨', '热情', '神秘'],
        'char_pw_mika_nurse': ['毒舌', '犀利', '严厉'],
        'char_pw_qingyou_records': ['敷衍', '惜字如金', '机械'],
        'char_pw_nanxing_liaison': ['精炼', '简洁', '公事公办'],
    }

    count = 0
    for char_id, tags in assignments.items():
        # Match both dict-style and _character-style definitions
        # Pattern 1: _character(..., char_id="...", ..., tags=[...], ...)
        pattern1 = rf'(char_id\s*=\s*\"{char_id}\".*?tags\s*=\s*\[)(.*?)(\])'
        
        # Pattern 2: {"char_id": "...", ..., "tags": [...], ...}
        pattern2 = rf'(\"char_id\"\s*:\s*\"{char_id}\".*?\"tags\"\s*:\s*\[)(.*?)(\])'

        def replacer(m):
            raw_tags = m.group(2)
            base_tags = [t.strip().strip("'").strip('"') for t in raw_tags.split(',') if t.strip()]
            new_tags_list = list(set(base_tags + tags))
            tags_str = ', '.join([f'"{t}"' for t in new_tags_list])
            return f'{m.group(1)}{tags_str}{m.group(3)}'
        
        new_content = re.sub(pattern1, replacer, content, flags=re.DOTALL)
        if new_content == content:
            new_content = re.sub(pattern2, replacer, content, flags=re.DOTALL)
            
        if new_content != content:
            content = new_content
            count += 1
            
    file_path.write_text(content, encoding='utf-8')
    print(f'Successfully updated tags for {count} NPCs.')

if __name__ == "__main__":
    run()
