import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. sp_course_query
content = re.sub(
    r'(sp_course_query = db\.query\(models\.StudyPlanItem\.course_id, models\.StudyPlan\.semester\)\.join\(models\.StudyPlan\)\.filter\(\s*models\.StudyPlanItem\.program_id == p\.id)(\s*\))',
    r'\1, models.StudyPlan.is_deleted == False\2',
    content
)

# 2. prof_query
content = re.sub(
    r'(prof_query = db\.query\(models\.StudyPlanItem\.professor_id, models\.StudyPlan\.semester\)\.join\(models\.StudyPlan\)\.filter\(\s*models\.StudyPlanItem\.program_id == p\.id)(\s*\))',
    r'\1, models.StudyPlan.is_deleted == False\2',
    content
)

# 3. faculty_sp_course_query
content = re.sub(
    r'(faculty_sp_course_query = db\.query\(models\.StudyPlanItem\.course_id, models\.StudyPlan\.semester\)\.join\(models\.StudyPlan\)\.filter\(\s*models\.StudyPlan\.faculty_id == f\.id)(\s*\))',
    r'\1, models.StudyPlan.is_deleted == False\2',
    content
)

# 4. faculty_prof_query
content = re.sub(
    r'(faculty_prof_query = db\.query\(models\.StudyPlanItem\.professor_id, models\.StudyPlan\.semester\)\.join\(models\.StudyPlan\)\.filter\(\s*models\.StudyPlan\.faculty_id == f\.id)(\s*\))',
    r'\1, models.StudyPlan.is_deleted == False\2',
    content
)

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed main table report queries!")
