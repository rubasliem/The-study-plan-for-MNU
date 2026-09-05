import re
import glob

files = glob.glob('backend/**/*.py', recursive=True)
for f in files:
    with open(f, encoding='utf-8') as file:
        text = file.read()
        matches = re.findall(r'action_text\s*=\s*(f?["\'].*?["\'])', text)
        for m in matches:
            print(m)
        matches2 = re.findall(r'create_notification\([^,]+,\s*[^,]+,\s*[^,]+,\s*(f?["\'].*?["\'])\)', text)
        for m in matches2:
            print(m)
