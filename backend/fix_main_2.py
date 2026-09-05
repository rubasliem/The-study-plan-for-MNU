import re

with open('main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the syntax error from my powershell replace command
content = re.sub(r'if current_user\.role in.*?raise HTTPException.*?$', '    try:', content, flags=re.MULTILINE)

# Now manually add the check before the try
def replace_func(m):
    return '''    if current_user.role in [models.UserRole.faculty_admin, models.UserRole.faculty_professor] and current_user.faculty_id != plan.faculty_id:
        raise HTTPException(status_code=403, detail="لا يمكنك إضافة خطة دراسية لكلية أخرى")
    try:'''

content = content.replace('    try:', replace_func(None), 1)

with open('main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed main.py")
