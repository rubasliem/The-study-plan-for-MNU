with open('backend/main.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)):
    if lines[i].strip() == 'try:':
        # get the indentation of the previous non-empty line
        prev_indent = 4
        for j in range(i-1, -1, -1):
            if lines[j].strip():
                prev_indent = len(lines[j]) - len(lines[j].lstrip())
                break
        
        # if previous line is a function definition, we need +4
        if lines[i-1].strip().endswith(':'):
            prev_indent += 4
        # if previous line is a simple assignment `db = SessionLocal()`, we use same indent
        
        lines[i] = ' ' * prev_indent + 'try:\n'

with open('backend/main.py', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Fixed main.py")
