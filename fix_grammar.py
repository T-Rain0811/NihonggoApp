import re
import os

filepath = r"d:\my_space\nihongo\NihongoApp\backend\data\grammas\grammar_data.py"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the old boundary
old_boundary = """        }
    ],
    "6": [
        {
            "pattern": "~に応えて","""

new_boundary = """        },
        {
            "pattern": "~に応えて","""

content = content.replace(old_boundary, new_boundary)

# 2. Insert the new boundary before ~に加えて
old_start = """        },
        {
            "pattern": "~に加えて","""

new_start = """        }
    ],
    "6": [
        {
            "pattern": "~に加えて","""

content = content.replace(old_start, new_start)

# 3. Replace "session": "5" with "session": "6" for lesson 6
# Find the start of lesson 6 and lesson 7
idx6 = content.find('"6": [')
idx7 = content.find('"7": [')

if idx6 != -1 and idx7 != -1:
    lesson6_content = content[idx6:idx7]
    lesson6_content = lesson6_content.replace('"session": "5"', '"session": "6"')
    content = content[:idx6] + lesson6_content + content[idx7:]

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
