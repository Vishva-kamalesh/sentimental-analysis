import os
import glob

def count_word_in_dir(directory, word):
    count = 0
    files = glob.glob(os.path.join(directory, "*.txt"))
    for f_path in files:
        try:
            with open(f_path, 'r', encoding='utf-8') as f:
                content = f.read().lower()
                if word in content:
                    count += 1
        except:
            continue
    return count

if __name__ == "__main__":
    word = "hello"
    pos_dir = r"e:\Sentimental Analysis\backend\Dataset\aclImdb\train\pos"
    neg_dir = r"e:\Sentimental Analysis\backend\Dataset\aclImdb\train\neg"
    
    pos_count = count_word_in_dir(pos_dir, word)
    neg_count = count_word_in_dir(neg_dir, word)
    
    print(f"Word: '{word}'")
    print(f"Positive files containing it: {pos_count}")
    print(f"Negative files containing it: {neg_count}")
