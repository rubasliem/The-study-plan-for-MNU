import requests
import json
url = "http://localhost:8000/api/professors-report?academic_year=2026/2027"
response = requests.get(url)
data = response.json()
print(f"Total profs: {len(data)}")
