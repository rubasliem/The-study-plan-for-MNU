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

for i, row in df.iterrows():
    for val in row.values:
        if 'DFP' in str(val):
            print("\nFOUND DFP ROW:")
            for idx, (h1, h2, v) in enumerate(zip(header_row1, header_row2, row.values)):
                print(f"{idx} - {h1} | {h2} : {v}")
            break
