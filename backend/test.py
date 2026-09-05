
import sys
sys.path.append('c:/Users/rubas/Desktop/MNU-Study-Plan/backend')
from database import SessionLocal
from main import get_main_table_report
db = SessionLocal()
report = get_main_table_report(academic_year='2026/2027', db=db)
for fac in report:
    if fac['faculty_name'] == 'كلية الهندسة':
        print('Faculty Engineering: Profs T2=' + str(fac['total_professors_t2']))

