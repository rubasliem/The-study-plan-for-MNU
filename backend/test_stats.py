import httpx

r = httpx.get("http://localhost:8000/api/statistics/10")
data = r.json()
print("Total departments (programs_stats):", len(data.get("programs_stats", [])))
if len(data.get("programs_stats", [])) > 0:
    for p in data["programs_stats"][:5]:
        print(p["name"], ":", p["course_count"], "courses")
