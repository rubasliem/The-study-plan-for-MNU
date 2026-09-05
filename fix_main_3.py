with open('backend/main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = []
skip = False
for i, line in enumerate(lines):
    if i == 37 and 'current_user.role in' in line:
        pass # skip line 37 (index 37 is line 38)
    elif i == 38 and 'raise HTTPException' in line:
        pass
    elif i == 39 and line.strip() == 'try:':
        pass
    else:
        out.append(line)

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.writelines(out)

print("Fixed main.py")
