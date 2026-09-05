import os, sys
# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
import models
db = SessionLocal()

course_query = db.query(models.Course.name_ar, models.CourseModule.department_name, models.StudyPlanItem.department_id).join(
    models.StudyPlanItem, models.Course.id == models.StudyPlanItem.course_id
).join(
    models.StudyPlan, models.StudyPlanItem.study_plan_id == models.StudyPlan.id
).outerjoin(
    models.CourseModule, models.Course.id == models.CourseModule.course_id
).filter(
    models.StudyPlan.faculty_id == 10,
    models.StudyPlan.is_deleted == False
)

for row in course_query.all():
    print(row)
