import requests
import json
url = "http://localhost:8000/api/professors-report?faculty_id=1&academic_year=2026/2027"
response = requests.get(url)
data = response.json()
ruba = [p for p in data if 'ربا' in p.get('professor_name', '')]
print(json.dumps(ruba, indent=2, ensure_ascii=False))

samy = [p for p in data if 'سامي علي' in p.get('professor_name', '')]
print(json.dumps(samy, indent=2, ensure_ascii=False))
