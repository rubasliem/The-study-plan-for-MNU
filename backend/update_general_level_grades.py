import sys
sys.path.append("c:/Users/rubas/Desktop/MNU-Study-Plan/backend")
from database import SessionLocal
import models

def update_grades():
    db = SessionLocal()
    try:
        faculty = db.query(models.Faculty).filter(models.Faculty.name == "كلية الهندسة").first()
        if not faculty:
            print("Faculty of Engineering not found.")
            return
            
        program = db.query(models.Program).filter(
            models.Program.name == "المستوى العام",
            models.Program.faculty_id == faculty.id
        ).first()
        
        if not program:
            print("Program 'المستوى العام' not found.")
            return

        # Map course codes to their grades
        grades_map = {
            "BAS 001": {"year_work": 50.0, "theory": 50.0, "practical": 0.0},
            "BAS 002": {"year_work": 40.0, "theory": 50.0, "practical": 10.0},
            "BAS 003": {"year_work": 50.0, "theory": 50.0, "practical": 0.0},
            "BAS 006": {"year_work": 40.0, "theory": 50.0, "practical": 10.0},
            "ENG 001": {"year_work": 30.0, "theory": 50.0, "practical": 20.0},
            "ENG 002": {"year_work": 50.0, "theory": 50.0, "practical": 0.0},
            "GEN 001": {"year_work": 50.0, "theory": 50.0, "practical": 0.0},
            "GEN 002E1": {"year_work": 50.0, "theory": 50.0, "practical": 0.0},
            "GEN 002E2": {"year_work": 50.0, "theory": 50.0, "practical": 0.0},
            "GEN 002E3": {"year_work": 50.0, "theory": 50.0, "practical": 0.0},
            "BAS 004": {"year_work": 50.0, "theory": 50.0, "practical": 0.0},
            "BAS 005": {"year_work": 40.0, "theory": 50.0, "practical": 10.0},
            "BAS 007": {"year_work": 50.0, "theory": 50.0, "practical": 0.0},
            "ENG 003": {"year_work": 30.0, "theory": 50.0, "practical": 20.0},
            "GEN 003": {"year_work": 50.0, "theory": 50.0, "practical": 0.0},
            "GEN 004": {"year_work": 30.0, "theory": 50.0, "practical": 20.0},
        }

        updated_count = 0
        for code, grades in grades_map.items():
            course = db.query(models.Course).filter(
                models.Course.code == code,
                models.Course.program_id == program.id
            ).first()
            if course:
                course.total_grade = 100.0
                course.theory_grade = grades["theory"]
                course.practical_grade = grades["practical"]
                course.year_work_grade = grades["year_work"]
                updated_count += 1
                
        db.commit()
        print(f"Successfully updated grades for {updated_count} courses.")
    finally:
        db.close()

if __name__ == "__main__":
    update_grades()
