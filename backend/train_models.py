import os
import glob
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.svm import LinearSVC
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score
import joblib
import time

def load_imdb_data(base_path):
    print(f"--- Loading IMDB Dataset from {base_path} ---")
    data = []
    for split in ['train', 'test']:
        for sentiment in ['pos', 'neg']:
            path = os.path.join(base_path, split, sentiment, "*.txt")
            files = glob.glob(path)
            label = "positive" if sentiment == 'pos' else "negative"
            print(f"  Reading {len(files)} {split} {sentiment} files...")
            for file_path in files:
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        text = f.read()
                        data.append({'text': text, 'sentiment': label})
                except:
                    continue
    return pd.DataFrame(data)

def load_twitter_data(file_path, samples_per_class=100000):
    print(f"--- Loading Twitter Dataset from {file_path} ---")
    # Columns: 0: target, 1: id, 2: date, 3: query, 4: user, 5: text
    # Encoding latin-1 is required for this specific dataset
    try:
        cols = [0, 5]
        df = pd.read_csv(file_path, encoding='latin-1', header=None, usecols=cols)
        df.columns = ['sentiment_id', 'text']
        
        # Map 0 -> negative, 4 -> positive
        neg_df = df[df['sentiment_id'] == 0].sample(min(samples_per_class, len(df[df['sentiment_id']==0])), random_state=42)
        pos_df = df[df['sentiment_id'] == 4].sample(min(samples_per_class, len(df[df['sentiment_id']==4])), random_state=42)
        
        neg_df['sentiment'] = 'negative'
        pos_df['sentiment'] = 'positive'
        
        combined_twitter = pd.concat([neg_df, pos_df])[['text', 'sentiment']]
        print(f"  Loaded {len(combined_twitter)} Twitter samples ({len(neg_df)} neg, {len(pos_df)} pos)")
        return combined_twitter
    except Exception as e:
        print(f"  Error loading Twitter data: {e}")
        return pd.DataFrame(columns=['text', 'sentiment'])

if __name__ == "__main__":
    imdb_path = r"e:\Sentimental Analysis\backend\Dataset\aclImdb"
    twitter_path = r"e:\Sentimental Analysis\backend\Dataset2\training.1600000.processed.noemoticon.csv"
    
    # 1. Load Datasets
    t_start = time.time()
    
    imdb_df = load_imdb_data(imdb_path)
    twitter_df = load_twitter_data(twitter_path, samples_per_class=100000) # 200k samples total
    
    # Merge and Shuffle
    print("\nMerging datasets...")
    df = pd.concat([imdb_df, twitter_df]).sample(frac=1, random_state=42).reset_index(drop=True)
    print(f"Final dataset size: {len(df)} samples")
    print(f"Label distribution:\n{df['sentiment'].value_counts()}")

    X = df["text"]
    y = df["sentiment"]

    # 2. Vectorize text
    print("\nVectorizing text (TF-IDF)...")
    v_start = time.time()
    # We use a larger vocabulary (15000) to handle the combined complexity
    vectorizer = TfidfVectorizer(max_features=15000, stop_words='english', min_df=5)
    X_vec = vectorizer.fit_transform(X)
    print(f"Vectorization done in {time.time() - v_start:.2f} seconds.")

    # 3. Split data
    X_train, X_test, y_train, y_test = train_test_split(X_vec, y, test_size=0.15, random_state=42)

    # 4. Train Models
    print("\nTraining Hybrid Models (IMDB + Twitter)...")
    
    # Logistic Regression
    print("  -> Logistic Regression...")
    lr = LogisticRegression(max_iter=1000, n_jobs=-1)
    t0 = time.time()
    lr.fit(X_train, y_train)
    print(f"     Done in {time.time() - t0:.2f}s")

    # SVM
    print("  -> Linear SVM...")
    svm = LinearSVC(max_iter=2000)
    t0 = time.time()
    svm.fit(X_train, y_train)
    print(f"     Done in {time.time() - t0:.2f}s")

    # Naive Bayes
    print("  -> Naive Bayes...")
    nb = MultinomialNB()
    t0 = time.time()
    nb.fit(X_train, y_train)
    print(f"     Done in {time.time() - t0:.2f}s")

    # 5. Evaluate
    print("\n" + "="*30)
    print("HYBRID PERFORMANCE RESULTS")
    print("="*30)
    print(f"LR Accuracy:  {accuracy_score(y_test, lr.predict(X_test))*100:.2f}%")
    print(f"SVM Accuracy: {accuracy_score(y_test, svm.predict(X_test))*100:.2f}%")
    print(f"NB Accuracy:  {accuracy_score(y_test, nb.predict(X_test))*100:.2f}%")
    print(f"Total Workflow: {time.time() - t_start:.2f} seconds")

    # 6. Save models
    print("\nSaving updated models...")
    joblib.dump(lr, "lr_model.pkl")
    joblib.dump(svm, "svm_model.pkl")
    joblib.dump(nb, "nb_model.pkl")
    joblib.dump(vectorizer, "vectorizer.pkl")
    print("✅ All models updated with Hybrid Knowledge successfully.")
