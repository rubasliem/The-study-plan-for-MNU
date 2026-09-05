import pandas as pd
def safe_float(val):
    try:
        if pd.isna(val) or str(val).lower() == 'nan' or str(val).strip() == '': return 0.0
        return float(str(val).strip())
    except:
        return 0.0

df = pd.read_excel("C:/Users/rubas/Desktop/مقرارات الكليات/كلية علوم الحاسوب والذكاء الاصطناعي.xlsx", dtype=str)
header_idx = -1
for i, row in df.iterrows():
    row_str = str(row.values)
    if 'كود' in row_str and 'مقرر' in row_str:
        header_idx = i
        break

header_row1 = list(df.iloc[header_idx])
header_row2 = list(df.iloc[header_idx + 1]) if header_idx + 1 < len(df) else []

flat_headers = []
for i in range(len(header_row1)):
    h1 = str(header_row1[i]).strip()
    h2 = str(header_row2[i]).strip() if i < len(header_row2) else ""
    if h1.lower() == 'nan': h1 = ""
    if h2.lower() == 'nan': h2 = ""
    if h1 and h2: flat_headers.append(f"{h1}_{h2}")
    elif h1: flat_headers.append(h1)
    elif h2: flat_headers.append(h2)
    else: flat_headers.append(f"col_{i}")

df.columns = flat_headers
df = df.iloc[header_idx+2:].reset_index(drop=True)

for i, row in df.iterrows():
    if row['كود المقرر'] == 'BCS212':
        val = row['عملي']
        print("Type:", type(val))
        print("Value:\n", val)
        print("Safe float:", safe_float(val))
        break
