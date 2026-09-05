import sqlite3
import json

def get_courses_frontend():
    conn = sqlite3.connect('mnu_system.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, name_ar, code, faculty_id FROM courses WHERE faculty_id = 10 AND is_deleted = 0')
    rows = cursor.fetchall()
    
    # simulate frontend logic
    courses = [{"id": r[0], "name_ar": r[1], "code": r[2], "faculty_id": r[3]} for r in rows]
    print(f"Total courses fetched: {len(courses)}")
    
    selectedFaculty = "10"
    
    addedCourseNames = set()
    seen = set()
    
    unique_courses = []
    for c in courses:
        if selectedFaculty and str(c["faculty_id"]) != selectedFaculty:
            continue
        if c["name_ar"] in addedCourseNames:
            continue
        if c["name_ar"] in seen:
            continue
        
        seen.add(c["name_ar"])
        unique_courses.append(c)
        
    print(f"Total unique courses: {len(unique_courses)}")
    if len(unique_courses) == 0:
        print("Why is it 0?")
    else:
        print(unique_courses[:5])

if __name__ == '__main__':
    get_courses_frontend()
