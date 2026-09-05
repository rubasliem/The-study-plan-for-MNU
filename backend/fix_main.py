import re

with open('main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = []
in_block = False
nested = 0
for i, line in enumerate(lines):
    if 'def create_study_plan(' in line:
        out.append(line)
        out.append('    try:\n')
        in_block = True
    elif in_block and line.startswith('@app.'):
        # We reached the next endpoint, close the try except
        in_block = False
        out.append('    except Exception as e:\n')
        out.append('        db.rollback()\n')
        out.append('        import traceback\n')
        out.append('        from fastapi import HTTPException\n')
        out.append('        raise HTTPException(status_code=500, detail=traceback.format_exc())\n\n')
        out.append(line)
    elif in_block:
        if line.strip() and not line.strip().startswith('try:') and not line.strip().startswith('except Exception as e:') and not line.strip().startswith('db.rollback()') and not line.strip().startswith('import traceback') and not line.strip().startswith('raise HTTPException(status_code=500'):
            # Check if it was already indented with 8 spaces
            if line.startswith('        existing_plans ='):
                out.append(line)
            else:
                out.append('    ' + line)
        elif not line.strip():
            out.append(line)
    else:
        out.append(line)

with open('main.py', 'w', encoding='utf-8') as f:
    f.writelines(out)

print("Fixed main.py")
