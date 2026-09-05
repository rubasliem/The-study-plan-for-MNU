import docx
import sqlite3
import datetime

doc_path = r'C:\Users\rubas\Desktop\مرفقات اللائحة طب .docx'
db_path = r'backend/mnu_system.db'

doc = docx.Document(doc_path)
conn = sqlite3.connect(db_path)
c = conn.cursor()

def clean_text(text):
    if not text: return ""
    return text.strip().replace('\n', ' ')

def safe_float(text):
    if not text: return 0.0
    text = str(text).replace('\n', ' ').strip()
    try:
        return float(text)
    except:
        return 0.0

courses_dict = {}

levels = [1, 1, 2, 2, 3, 3]
semesters = ["الفصل الدراسي الأول", "الفصل الدراسي الثاني", "الفصل الدراسي الأول", "الفصل الدراسي الثاني", "الفصل الدراسي الأول", "الفصل الدراسي الثاني"]

for table_idx, t in enumerate(doc.tables):
    if table_idx >= len(levels): break
    level = levels[table_idx]
    semester = semesters[table_idx]
    
    for row_idx in range(3, len(t.rows)):
        cells = t.row_cells(row_idx)
        if len(cells) < 18: continue
        
        code = clean_text(cells[17].text)
        if not code or 'كود' in code or code == 'MED 202' and 'Module' in clean_text(cells[16].text): 
            # some rows might be headers or empty
            pass
        if not code: continue
        
        name_en = clean_text(cells[16].text)
        duration = clean_text(cells[15].text)
        total_credit = safe_float(cells[14].text)
        dept_name = clean_text(cells[13].text)
        
        dept_credit = safe_float(cells[12].text)
        theory_cred = safe_float(cells[11].text)
        pract_cred = safe_float(cells[10].text)
        act_cred = safe_float(cells[9].text)
        
        theory_hrs = safe_float(cells[8].text)
        pract_hrs = safe_float(cells[7].text)
        act_hrs = safe_float(cells[6].text)
        
        theory_grade = safe_float(cells[5].text)
        pract_grade = safe_float(cells[4].text)
        yw_grade = safe_float(cells[3].text)
        
        total_dept_grade = safe_float(cells[2].text)
        course_total_grade = safe_float(cells[1].text)
        exam_duration = clean_text(cells[0].text)
        
        if code not in courses_dict:
            courses_dict[code] = {
                "code": code,
                "name_en": name_en,
                "name_ar": "",
                "level": level,
                "semester": semester,
                "duration": duration,
                "credit_hours": total_credit,
                "total_grade": course_total_grade,
                "exam_time_hours": exam_duration,
                "departments": []
            }
            
        if dept_name and not any(d['department_name'] == dept_name for d in courses_dict[code]['departments']):
            courses_dict[code]["departments"].append({
                "department_name": dept_name,
                "theory_credit": theory_cred,
                "practical_credit": pract_cred,
                "activity_credit": act_cred,
                "theory_grade": theory_grade,
                "practical_grade": pract_grade,
                "year_work_grade": yw_grade,
                "theory_hours": theory_hrs,
                "practical_hours": pract_hrs,
                "activity_hours": act_hrs
            })

# Medicine Faculty ID = 10, Program ID = 24
faculty_id = 10
program_id = 24

for code, data in courses_dict.items():
    # Insert or update Course
    c.execute("SELECT id FROM courses WHERE code = ? AND faculty_id = ?", (code, faculty_id))
    existing = c.fetchone()
    
    is_bundle = 1 if len(data['departments']) > 0 else 0
    course_type = "اجبارى"
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    if existing:
        course_id = existing[0]
        c.execute("""
            UPDATE courses SET 
            name_en = ?, level = ?, semester = ?, duration = ?, 
            credit_hours = ?, total_grade = ?, exam_time_hours = ?, is_bundle = ?
            WHERE id = ?
        """, (data['name_en'], data['level'], data['semester'], data['duration'], 
              data['credit_hours'], data['total_grade'], data['exam_time_hours'], is_bundle, course_id))
    else:
        c.execute("""
            INSERT INTO courses (code, name_en, name_ar, level, semester, duration, credit_hours, total_grade, exam_time_hours, is_bundle, faculty_id, program_id, course_type, theory_hours, practical_hours, exercise_hours, activity_hours, theory_grade, practical_grade, year_work_grade)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0)
        """, (code, data['name_en'], data['name_en'], data['level'], data['semester'], data['duration'], data['credit_hours'], data['total_grade'], data['exam_time_hours'], is_bundle, faculty_id, program_id, course_type))
        course_id = c.lastrowid
        
    # Delete old modules and insert new ones
    c.execute("DELETE FROM course_modules WHERE course_id = ?", (course_id,))
    
    for dept in data['departments']:
        c.execute("""
            INSERT INTO course_modules (course_id, department_name, theory_hours, practical_hours, activity_hours, theory_grade, practical_grade, year_work_grade, theory_credit, practical_credit, activity_credit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (course_id, dept['department_name'], dept['theory_hours'], dept['practical_hours'], dept['activity_hours'], dept['theory_grade'], dept['practical_grade'], dept['year_work_grade'], dept['theory_credit'], dept['practical_credit'], dept['activity_credit']))

conn.commit()
conn.close()
print("Import completed successfully! Total unique courses processed:", len(courses_dict))
