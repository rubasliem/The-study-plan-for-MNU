import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. get_professor_assignments
content = re.sub(
    r'(items = db\.query\(models\.StudyPlanItem\)\.filter\(models\.StudyPlanItem\.professor_id == id\)\.all\(\))',
    r'items = db.query(models.StudyPlanItem).join(models.StudyPlan).filter(models.StudyPlanItem.professor_id == id, models.StudyPlan.is_deleted == False).all()',
    content
)

# 2. export_professors_assignments
content = re.sub(
    r'(query = db\.query\(models\.StudyPlanItem\)\.join\(models\.StudyPlan\)\.join\(models\.Course, models\.StudyPlanItem\.course_id == models\.Course\.id\)\.filter\(\s*models\.StudyPlanItem\.professor_id\.in_\(request\.professor_ids\),\s*models\.StudyPlan\.academic_year == request\.academic_year)',
    r'\1, models.StudyPlan.is_deleted == False',
    content
)

# 3. get_professors_report - sp_subquery
content = re.sub(
    r'(sp_subquery = db\.query\(models\.StudyPlanItem\.professor_id\)\.join\(models\.StudyPlan\))(\s+if academic_year:)',
    r'\1.filter(models.StudyPlan.is_deleted == False)\2',
    content
)

# 4. get_professors_report - items_query
content = re.sub(
    r'(items_query = db\.query\(models\.StudyPlanItem\)\.join\(models\.StudyPlan\)\.filter\(\s*models\.StudyPlanItem\.professor_id == prof\.id)(\s*\))',
    r'\1, models.StudyPlan.is_deleted == False\2',
    content
)

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed professors report and assignments queries!")
