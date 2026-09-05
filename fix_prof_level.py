import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace in get_professor_assignments
content = re.sub(
    r'("course_code": course\.code if course else "",\s*)"level": course\.level if course else "",',
    r'\1"level": item.level if item.level else (course.level if course else ""),',
    content
)

# Replace in export_professors_assignments
content = re.sub(
    r'("course_name": course\.name_ar if course else "",\s*)"level": course\.level if course else "",',
    r'\1"level": item.level if item.level else (course.level if course else ""),',
    content
)

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed professor assignment level to match study plan item level.")
