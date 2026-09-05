import pandas as pd
df = pd.read_excel("C:/Users/rubas/Desktop/مقرارات الكليات/كلية علوم الحاسوب والذكاء الاصطناعي.xlsx", dtype=str)
header_idx = -1
for i, row in df.iterrows():
    row_str = str(row.values)
    if 'كود' in row_str and 'مقرر' in row_str:
        header_idx = i
        break
        
print("Headers for reference:")
for i, (h1, h2) in enumerate(zip(df.iloc[header_idx], df.iloc[header_idx+1])):
    print(f"{i}: {h1} -> {h2}")

for i, row in df.iterrows():
    row_str = str(row.values)
    if 'BCS212' in row_str:
        print("\nDATA FOR BCS212:")
        for idx, val in enumerate(row.values):
            print(f"{idx}: {val}")
