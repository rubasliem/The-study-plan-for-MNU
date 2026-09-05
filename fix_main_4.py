with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('        try:\n try:', '    try:')
content = content.replace('            try:\n try:', '        try:')
content = content.replace('                try:\n try:', '            try:')
content = content.replace('                    try:\n try:', '                try:')

# Also replace the one inside create_study_plan that was just try:\n try:
content = content.replace(' try:', '    try:')

# And add the permission check back properly in create_study_plan:
def replace_func(m):
    return '''    if current_user.role in [models.UserRole.faculty_admin, models.UserRole.faculty_professor] and current_user.faculty_id != plan.faculty_id:
        raise HTTPException(status_code=403, detail="لا يمكنك إضافة خطة دراسية لكلية أخرى")
    try:'''

import re
content = re.sub(r'def create_study_plan.*?:\n    try:', lambda m: m.group(0).replace('    try:', replace_func(None)), content, flags=re.DOTALL)

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed main.py")
