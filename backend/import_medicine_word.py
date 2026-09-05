import sys
sys.path.append('C:/Users/rubas/Desktop/MNU-Study-Plan/backend')
import os
import docx
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def safe_float(val):
    try:
        return float(val.strip())
    except:
        return 0.0

def safe_int(val):
    try:
        return int(float(val.strip()))
    except:
        return 0

def import_medicine_word():
    db = SessionLocal()
    fac = db.query(models.Faculty).filter(models.Faculty.name == "كلية الطب والجراحة").first()
    if not fac:
        print("Error: Faculty 'كلية الطب والجراحة' not found!")
        return
        
    prog = db.query(models.Program).filter(models.Program.faculty_id == fac.id).first()
    prog_id = prog.id if prog else None

    doc_path = 'C:/Users/rubas/Desktop/مرفقات اللائحة طب .docx'
    if not os.path.exists(doc_path):
        print(f"File not found: {doc_path}")
        return
        
    doc = docx.Document(doc_path)
    
    last_course = None
    
    total_added_courses = 0
    total_updated_courses = 0
    total_modules = 0

    for t_idx, table in enumerate(doc.tables):
        print(f"Processing table {t_idx + 1}...")
        
        # Read the level/semester from the first row
        try:
            title = table.rows[0].cells[0].text.strip()
            level = 1
            if 'الثاني' in title and 'المستوى' in title: level = 2
            elif 'الثالث' in title and 'المستوى' in title: level = 3
            elif 'الرابع' in title and 'المستوى' in title: level = 4
            elif 'الخامس' in title and 'المستوى' in title: level = 5
            
            semester = "الفصل الدراسي الأول"
            if 'الثاني' in title and 'الفصل' in title: semester = "الفصل الدراسي الثاني"
        except:
            level = 1
            semester = "الفصل الدراسي الأول"

        # Data starts at row 3 (0-indexed)
        for r_idx in range(3, len(table.rows)):
            row = table.rows[r_idx]
            cells = [c.text.strip().replace('\n', ' ') for c in row.cells]
            
            if len(cells) < 18:
                continue
                
            code = cells[17]
            name = cells[16]
            duration = cells[15]
            course_credit = cells[14]
            dept_name = cells[13]
            
            if not dept_name:
                continue # Skip empty rows
                
            is_new = False
            if code and code != "":
                is_new = True
                
            if is_new:
                # Create or Update Course
                new_course = models.Course(
                    code=code,
                    name_ar=name,
                    name_en=name,
                    level=level,
                    semester=semester,
                    faculty_id=fac.id,
                    program_id=prog_id,
                    duration=duration,
                    credit_hours=safe_float(course_credit),
                    total_grade=safe_float(cells[1]),
                    exam_time_hours=cells[0],
                    is_deleted=False
                )
                
                existing = db.query(models.Course).filter(models.Course.code == code).first()
                if existing:
                    for col_obj in models.Course.__table__.columns:
                        if col_obj.name not in ('id', 'is_deleted', 'deleted_at'):
                            setattr(existing, col_obj.name, getattr(new_course, col_obj.name))
                    db.query(models.CourseModule).filter(models.CourseModule.course_id == existing.id).delete()
                    last_course = existing
                    total_updated_courses += 1
                else:
                    db.add(new_course)
                    db.flush()
                    last_course = new_course
                    total_added_courses += 1
                    
            if last_course and dept_name:
                mod = models.CourseModule(
                    course_id=last_course.id,
                    department_name=dept_name,
                    credit_hours=safe_float(cells[12]),
                    theory_credit=safe_float(cells[11]),
                    practical_credit=safe_float(cells[10]),
                    activity_credit=safe_float(cells[9]),
                    theory_hours=safe_float(cells[8]),
                    practical_hours=safe_float(cells[7]),
                    activity_hours=safe_float(cells[6]),
                    theory_grade=safe_float(cells[5]),
                    practical_grade=safe_float(cells[4]),
                    year_work_grade=safe_float(cells[3]),
                    total_grade=safe_float(cells[2])
                )
                db.add(mod)
                total_modules += 1

    db.commit()
    print(f"Total Added Courses: {total_added_courses}")
    print(f"Total Updated Courses: {total_updated_courses}")
    print(f"Total Modules Added: {total_modules}")
    db.close()

if __name__ == "__main__":
    import_medicine_word()
