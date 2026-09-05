import pandas as pd
df = pd.read_excel("C:/Users/rubas/Desktop/مقرارات الكليات/كلية طب الأسنان .xlsx", dtype=str)
header_idx = -1
for i, row in df.iterrows():
    row_str = str(row.values)
    if 'كود' in row_str and 'مقرر' in row_str:
        header_idx = i
        break

header_row1 = list(df.iloc[header_idx])
header_row2 = list(df.iloc[header_idx + 1]) if header_idx + 1 < len(df) else []

def normalize_arabic(text):
    if pd.isna(text) or str(text).lower() == 'nan': return ""
    return str(text).replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي').strip()

flat_headers = []
for i in range(len(header_row1)):
    h1 = normalize_arabic(header_row1[i])
    h2 = normalize_arabic(header_row2[i]) if i < len(header_row2) else ""
    if h1 and h2: flat_headers.append(f"{h1}_{h2}")
    elif h1: flat_headers.append(h1)
    elif h2: flat_headers.append(h2)
    else: flat_headers.append(f"col_{i}")

seen = {}
unique_headers = []
for h in flat_headers:
    if h in seen:
        seen[h] += 1
        unique_headers.append(f"{h}_{seen[h]}")
    else:
        seen[h] = 0
        unique_headers.append(h)
        
df.columns = unique_headers
df = df.iloc[header_idx+2:].reset_index(drop=True)

def get_col(df, possible_names):
    for col in df.columns:
        for p in possible_names:
            if col == p: return col
    for col in df.columns:
        for p in possible_names:
            if p in col:
                if p == "مقرر" and "كود" in col: continue
                return col
    return None

col_theory = get_col(df, ["الساعات_محاضرات", "محاضرات"])
print("col_theory mapped to:", col_theory)

for i, row in df.iterrows():
    if row.get('كود المقرر') == 'DFP301':
        print("DFP301 theory hours:", row.get(col_theory))
        break
