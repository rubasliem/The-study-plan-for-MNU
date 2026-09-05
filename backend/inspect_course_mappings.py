import sys
sys.path.append("c:/Users/rubas/Desktop/MNU-Study-Plan/backend")
from database import SessionLocal
import models

db = SessionLocal()
try:
    courses = db.query(models.Course).all()
    print(f"Total existing courses in database: {len(courses)}")
    # Print first 30 courses details
    for c in courses[:30]:
        prog_name = c.program.name if c.program else "None"
        fac_name = c.faculty.name if c.faculty else "None"
        print(f"Code: '{c.code}', Name: '{c.name_ar}', Level: {c.level}, Program: '{prog_name}', Faculty: '{fac_name}'")
finally:
    db.close()
