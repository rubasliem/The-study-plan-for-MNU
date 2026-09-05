import pandas as pd
df = pd.read_excel("C:/Users/rubas/Desktop/مقرارات الكليات/كلية طب الأسنان .xlsx", dtype=str)
header_idx = -1
for i, row in df.iterrows():
    row_str = str(row.values)
    if 'كود' in row_str and 'مقرر' in row_str:
        header_idx = i
        break

df = df.iloc[header_idx+2:].reset_index(drop=True)
for i, row in df.iterrows():
    if not pd.isna(row.iloc[1]):
        h15 = row.iloc[15]
        h16 = row.iloc[16]
        h17 = row.iloc[17]
        h20 = row.iloc[20]
        h21 = row.iloc[21]
        
        if not pd.isna(h15) or not pd.isna(h16) or not pd.isna(h17) or not pd.isna(h20) or not pd.isna(h21):
            print(f"Code: {row.iloc[1]} | 15: {h15} | 16: {h16} | 17: {h17} | 20: {h20} | 21: {h21}")
