import re

with open('backend/main.py', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Change course.semester to sp.semester in get_professor_assignments
content = re.sub(
    r'("course_semester": )course\.semester if course else ""',
    r'\1sp.semester if sp else ""',
    content
)

# 2. Add faculty to professor automatically when saving study plan
# Find the part in create_study_plan where it validates the professor:
target = """            if item_data.professor_id:
                prof = db.query(models.Professor).filter(models.Professor.id == item_data.professor_id).first()
                if not prof:
                    raise HTTPException(status_code=404, detail="الأستاذ غير موجود")"""

replacement = """            if item_data.professor_id:
                prof = db.query(models.Professor).filter(models.Professor.id == item_data.professor_id).first()
                if not prof:
                    raise HTTPException(status_code=404, detail="الأستاذ غير موجود")
                
                # أضف الكلية للأستاذ إذا لم تكن موجودة ضمن كلياته
                faculty = db.query(models.Faculty).filter(models.Faculty.id == plan.faculty_id).first()
                if faculty and faculty not in prof.faculties:
                    prof.faculties.append(faculty)"""

content = content.replace(target, replacement)

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed professor assignment semester and automatic faculty addition.")
