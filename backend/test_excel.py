import pandas as pd

df = pd.read_excel("C:/Users/rubas/Desktop/مقرارات الكليات/كلية علوم الحاسوب والذكاء الاصطناعي.xlsx", dtype=str)
header_idx = -1
for i, row in df.iterrows():
    row_str = str(row.values)
    if 'كود' in row_str and 'مقرر' in row_str:
        header_idx = i
        break
        
print("Row 1 (idx):", list(df.iloc[header_idx]))
print("Row 2 (idx+1):", list(df.iloc[header_idx+1]) if header_idx+1 < len(df) else [])
