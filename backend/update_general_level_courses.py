import sys
sys.path.append("c:/Users/rubas/Desktop/MNU-Study-Plan/backend")
from database import SessionLocal
import models

def update_courses():
    db = SessionLocal()
    try:
        # Find Faculty of Engineering
        faculty = db.query(models.Faculty).filter(models.Faculty.name == "كلية الهندسة").first()
        if not faculty:
            print("Error: Faculty of Engineering not found.")
            return
            
        # Find or create General Level program
        program = db.query(models.Program).filter(
            models.Program.name == "المستوى العام",
            models.Program.faculty_id == faculty.id
        ).first()
        
        if not program:
            print("Creating program 'المستوى العام' under Faculty of Engineering...")
            program = models.Program(name="المستوى العام", faculty_id=faculty.id)
            db.add(program)
            db.flush()

        courses_data = [
            # First Semester Courses
            {
                "code": "BAS 001",
                "name_ar": "رياضيات 1",
                "name_en": "Mathematics 1",
                "level": 0,
                "semester": "الفصل الدراسي الأول",
                "theory_hours": 2.0,
                "exercise_hours": 2.0,
                "practical_hours": 0.0,
                "total_grade": 100.0, # default total grade 100
                "theory_grade": 60.0,
                "year_work_grade": 40.0
            },
            {
                "code": "BAS 002",
                "name_ar": "فيزياء 1",
                "name_en": "Physics 1",
                "level": 0,
                "semester": "الفصل الدراسي الأول",
                "theory_hours": 2.0,
                "exercise_hours": 1.0,
                "practical_hours": 2.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "practical_grade": 20.0,
                "year_work_grade": 20.0
            },
            {
                "code": "BAS 003",
                "name_ar": "استاتيكا",
                "name_en": "Statics",
                "level": 0,
                "semester": "الفصل الدراسي الأول",
                "theory_hours": 2.0,
                "exercise_hours": 2.0,
                "practical_hours": 0.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "year_work_grade": 40.0
            },
            {
                "code": "BAS 006",
                "name_ar": "كيمياء هندسية",
                "name_en": "Engineering Chemistry",
                "level": 0,
                "semester": "الفصل الدراسي الأول",
                "theory_hours": 2.0,
                "exercise_hours": 1.0,
                "practical_hours": 1.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "practical_grade": 20.0,
                "year_work_grade": 20.0
            },
            {
                "code": "ENG 001",
                "name_ar": "هندسة التصنيع",
                "name_en": "Manufacturing Engineering",
                "level": 0,
                "semester": "الفصل الدراسي الأول",
                "theory_hours": 2.0,
                "exercise_hours": 0.0,
                "practical_hours": 3.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "practical_grade": 20.0,
                "year_work_grade": 20.0
            },
            {
                "code": "ENG 002",
                "name_ar": "رسم هندسي",
                "name_en": "Engineering Drawing",
                "level": 0,
                "semester": "الفصل الدراسي الأول",
                "theory_hours": 2.0,
                "exercise_hours": 0.0,
                "practical_hours": 3.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "practical_grade": 20.0,
                "year_work_grade": 20.0
            },
            {
                "code": "GEN 001",
                "name_ar": "مدخل إلى الجودة",
                "name_en": "Introduction to Quality Assurance",
                "level": 0,
                "semester": "الفصل الدراسي الأول",
                "theory_hours": 1.0,
                "exercise_hours": 0.0,
                "practical_hours": 0.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "year_work_grade": 40.0
            },
            {
                "code": "GEN 002E1",
                "name_ar": "الطاقة والبيئة",
                "name_en": "Energy and the Environment",
                "level": 0,
                "semester": "الفصل الدراسي الأول",
                "theory_hours": 1.0,
                "exercise_hours": 0.0,
                "practical_hours": 0.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "year_work_grade": 40.0
            },
            {
                "code": "GEN 002E2",
                "name_ar": "تاريخ الهندسة والتكنولوجيا",
                "name_en": "History of Engineering & Technology",
                "level": 0,
                "semester": "الفصل الدراسي الأول",
                "theory_hours": 1.0,
                "exercise_hours": 0.0,
                "practical_hours": 0.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "year_work_grade": 40.0
            },
            {
                "code": "GEN 002E3",
                "name_ar": "مواضيع مختارة من القضايا المعاصرة",
                "name_en": "Selected Topics on Contemporary Issues",
                "level": 0,
                "semester": "الفصل الدراسي الأول",
                "theory_hours": 1.0,
                "exercise_hours": 0.0,
                "practical_hours": 0.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "year_work_grade": 40.0
            },
            # Second Semester Courses
            {
                "code": "BAS 004",
                "name_ar": "رياضيات 2",
                "name_en": "Mathematics 2",
                "level": 0,
                "semester": "الفصل الدراسي الثاني",
                "theory_hours": 2.0,
                "exercise_hours": 2.0,
                "practical_hours": 0.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "year_work_grade": 40.0
            },
            {
                "code": "BAS 005",
                "name_ar": "فيزياء 2",
                "name_en": "Physics 2",
                "level": 0,
                "semester": "الفصل الدراسي الثاني",
                "theory_hours": 2.0,
                "exercise_hours": 1.0,
                "practical_hours": 1.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "practical_grade": 20.0,
                "year_work_grade": 20.0
            },
            {
                "code": "BAS 007",
                "name_ar": "ديناميكا",
                "name_en": "Dynamics",
                "level": 0,
                "semester": "الفصل الدراسي الثاني",
                "theory_hours": 2.0,
                "exercise_hours": 2.0,
                "practical_hours": 0.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "year_work_grade": 40.0
            },
            {
                "code": "ENG 003",
                "name_ar": "رسم هندسي بالحاسب",
                "name_en": "Computer Aided Drawing",
                "level": 0,
                "semester": "الفصل الدراسي الثاني",
                "theory_hours": 1.0,
                "exercise_hours": 0.0,
                "practical_hours": 3.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "practical_grade": 20.0,
                "year_work_grade": 20.0
            },
            {
                "code": "GEN 003",
                "name_ar": "القضايا المجتمعية",
                "name_en": "Societal Issues",
                "level": 0,
                "semester": "الفصل الدراسي الثاني",
                "theory_hours": 1.0,
                "exercise_hours": 0.0,
                "practical_hours": 0.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "year_work_grade": 40.0
            },
            {
                "code": "GEN 004",
                "name_ar": "مقدمة الى الحاسبات",
                "name_en": "Introduction to Computers",
                "level": 0,
                "semester": "الفصل الدراسي الثاني",
                "theory_hours": 2.0,
                "exercise_hours": 0.0,
                "practical_hours": 3.0,
                "total_grade": 100.0,
                "theory_grade": 60.0,
                "practical_grade": 20.0,
                "year_work_grade": 20.0
            }
        ]

        inserted = 0
        updated = 0
        for item in courses_data:
            # Check if exists
            existing = db.query(models.Course).filter(
                models.Course.code == item["code"],
                models.Course.program_id == program.id
            ).first()
            
            if existing:
                existing.name_ar = item["name_ar"]
                existing.name_en = item["name_en"]
                existing.level = item["level"]
                existing.semester = item["semester"]
                existing.theory_hours = item["theory_hours"]
                existing.exercise_hours = item["exercise_hours"]
                existing.practical_hours = item["practical_hours"]
                existing.total_grade = item["total_grade"]
                existing.theory_grade = item["theory_grade"]
                existing.practical_grade = item.get("practical_grade", 0.0)
                existing.year_work_grade = item["year_work_grade"]
                updated += 1
            else:
                new_c = models.Course(
                    code=item["code"],
                    name_ar=item["name_ar"],
                    name_en=item["name_en"],
                    level=item["level"],
                    semester=item["semester"],
                    theory_hours=item["theory_hours"],
                    exercise_hours=item["exercise_hours"],
                    practical_hours=item["practical_hours"],
                    total_grade=item["total_grade"],
                    theory_grade=item["theory_grade"],
                    practical_grade=item.get("practical_grade", 0.0),
                    year_work_grade=item["year_work_grade"],
                    faculty_id=faculty.id,
                    program_id=program.id,
                    year="2026/2027"
                )
                db.add(new_c)
                inserted += 1
                
        db.commit()
        print(f"Success: Updated {updated} and inserted {inserted} courses for Engineering General Level.")
    finally:
        db.close()

if __name__ == "__main__":
    update_courses()
