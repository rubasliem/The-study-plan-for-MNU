import pandas as pd
df = pd.read_excel("C:/Users/rubas/Desktop/مقرارات الكليات/كلية طب الأسنان .xlsx", dtype=str)
header_idx = -1
for i, row in df.iterrows():
    row_str = str(row.values)
    if 'كود' in row_str and 'مقرر' in row_str:
        header_idx = i
        break

df = df.iloc[header_idx+2:].reset_index(drop=True)
has_hours = 0
total_courses = 0
for i, row in df.iterrows():
    if not pd.isna(row.iloc[1]): # Has a code
        total_courses += 1
        # Check index 15, 16, 17, 20, 21
        if not pd.isna(row.iloc[15]) or not pd.isna(row.iloc[16]) or not pd.isna(row.iloc[17]) or not pd.isna(row.iloc[20]) or not pd.isna(row.iloc[21]):
            has_hours += 1

print(f"Total courses: {total_courses}")
print(f"Courses with ANY hours data in Excel: {has_hours}")
