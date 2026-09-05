import pandas as pd
import io

def test_pandas_empty():
    df = pd.DataFrame({"A": ["val", None, float('nan'), "nan", "  "]})
    # simulating to_excel and read_excel with dtype=str
    b = io.BytesIO()
    df.to_excel(b, index=False)
    b.seek(0)
    
    df2 = pd.read_excel(b, dtype=str)
    for idx, row in df2.iterrows():
        val = row["A"]
        notna = pd.notna(val)
        print(f"Row {idx}: value={repr(val)}, type={type(val)}, notna={notna}")

test_pandas_empty()
