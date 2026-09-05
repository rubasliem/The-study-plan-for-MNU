import pandas as pd

def inspect_file(filename):
    df = pd.read_excel(f"C:/Users/rubas/Desktop/مقرارات الكليات/{filename}", dtype=str)
    header_idx = -1
    for i, row in df.iterrows():
        row_str = str(row.values)
        if 'كود' in row_str and 'مقرر' in row_str:
            header_idx = i
            break
            
    if header_idx != -1:
        print("Header Row 1:")
        print(list(df.iloc[header_idx]))
        print("Header Row 2:")
        print(list(df.iloc[header_idx + 1]))

if __name__ == "__main__":
    inspect_file("كلية علوم الحاسوب والذكاء الاصطناعي.xlsx")
