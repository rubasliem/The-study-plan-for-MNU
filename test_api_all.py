import requests
import json
url = "http://localhost:8000/api/professors-report?faculty_id=1&academic_year=2026/2027"
response = requests.get(url)
data = response.json()
for p in data:
    print(f"Name: {p.get('professor_name')}")
    print(f"T1: {p.get('courses_t1')}")
    print(f"T2: {p.get('courses_t2')}")
    print(f"T3: {p.get('courses_t3')}")
    print("---")
