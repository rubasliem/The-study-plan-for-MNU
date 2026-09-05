import requests
import json

payload = {
    "faculty_id": 1,
    "semester": "الفصل الدراسي الأول",
    "academic_year": "2026/2027",
    "total_theory_hours": 3,
    "total_practical_hours": 3,
    "items": [
        {
            "base_course_id": 1,
            "course_id": 1,
            "program_id": 1,
            "professor_id": 1,
            "level": "الأول",
            "student_count": 10,
            "groups_theory": 1,
            "groups_practical": 1,
            "hours_actual_theory": 2,
            "hours_actual_practical": 2,
            "notes": "",
            "required_hours_theory": 2,
            "required_hours_practical": 2
        }
    ]
}

try:
    res = requests.post('http://localhost:8000/api/study-plans', json=payload)
    print("Status:", res.status_code)
    print("Response:", res.text)
except Exception as e:
    print(e)
