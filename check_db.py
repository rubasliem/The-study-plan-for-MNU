import sys
sys.path.append('backend')
from database import SessionLocal
from models import Professor, StudyPlanItem, StudyPlan, Course

db = SessionLocal()
prof = db.query(Professor).filter(Professor.name_ar.ilike('%سامي علي%')).first()
if prof:
    print(f'Prof ID: {prof.id}')
    items = db.query(StudyPlanItem).join(StudyPlan).filter(StudyPlanItem.professor_id == prof.id, StudyPlan.is_deleted == False).all()
    for i in items:
        print(f'Plan: Faculty {i.study_plan.faculty_id}, Semester {i.study_plan.semester}, Year {i.study_plan.academic_year}, Course ID: {i.course_id}, Program ID: {i.program_id}, Deleted: {i.study_plan.is_deleted}')
else:
    print("Professor not found")
