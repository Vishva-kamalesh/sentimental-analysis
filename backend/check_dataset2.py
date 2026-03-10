import pandas as pd

def check_structure():
    file_path = r"e:\Sentimental Analysis\backend\Dataset2\training.1600000.processed.noemoticon.csv"
    try:
        # Just read first 100k rows to be fast
        df = pd.read_csv(file_path, encoding='latin-1', header=None, nrows=1000)
        print("Columns found:", df.columns.tolist())
        print("First few rows:\n", df.head())
        
        # Check unique values in the first column (target) for the whole file
        targets = pd.read_csv(file_path, encoding='latin-1', header=None, usecols=[0])
        print("Target value counts:\n", targets[0].value_counts())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_structure()
