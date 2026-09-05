with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# 1. Add is_deleted filter to course_query
content = re.sub(
    r'(course_query = db\.query\(models\.StudyPlanItem\.course_id\)\.join\(models\.StudyPlan\)\.filter\()models\.StudyPlanItem\.program_id == p\.id(\))',
    r'\1models.StudyPlanItem.program_id == p.id, models.StudyPlan.is_deleted == False\2',
    content
)

# 2. Add is_deleted filter to prof_query
content = re.sub(
    r'(prof_query = db\.query\(models\.StudyPlanItem\.professor_id\)\.join\(models\.StudyPlan\)\.filter\()models\.StudyPlan\.faculty_id == faculty_id(\))',
    r'\1models.StudyPlan.faculty_id == faculty_id, models.StudyPlan.is_deleted == False\2',
    content
)

# 3. Add is_deleted filter to c_query
content = re.sub(
    r'(c_query = db\.query\(models\.StudyPlanItem\.course_id\)\.join\(models\.StudyPlan\)\.filter\(\s*models\.StudyPlan\.faculty_id == faculty_id,\s*models\.StudyPlan\.semester\.like\(f"%{sem}%"\)\s*)(\))',
    r'\1, models.StudyPlan.is_deleted == False\2',
    content
)

# 4. Add is_deleted filter to p_query
content = re.sub(
    r'(p_query = db\.query\(models\.StudyPlanItem\.professor_id\)\.join\(models\.StudyPlan\)\.filter\(\s*models\.StudyPlan\.faculty_id == faculty_id,\s*models\.StudyPlan\.semester\.like\(f"%{sem}%"\)\s*)(\))',
    r'\1, models.StudyPlan.is_deleted == False\2',
    content
)

# Also check for global total_courses if it exists in the file
content = re.sub(
    r'(total_courses_query = db\.query\(models\.StudyPlanItem\.course_id\)\.join\(models\.StudyPlan\)\.filter\()models\.StudyPlan\.faculty_id == faculty_id(\))',
    r'\1models.StudyPlan.faculty_id == faculty_id, models.StudyPlan.is_deleted == False\2',
    content
)

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed get_statistics")
