import joblib
import numpy as np

def explain_word(word):
    try:
        lr = joblib.load("lr_model.pkl")
        svm = joblib.load("svm_model.pkl")
        vectorizer = joblib.load("vectorizer.pkl")
        
        feature_names = vectorizer.get_feature_names_out()
        try:
            word_idx = list(feature_names).index(word.lower())
        except ValueError:
            print(f"-- Word '{word}' not in vocabulary.")
            return

        print(f"\nAnalyzing: '{word}'")
        
        # LR
        lr_coef = lr.coef_[0][word_idx]
        print(f"  LR Coef:  {lr_coef:+.4f} -> {'Positive' if lr_coef > 0 else 'Negative'}")
        
        # SVM
        svm_coef = svm.coef_[0][word_idx]
        print(f"  SVM Coef: {svm_coef:+.4f} -> {'Positive' if svm_coef > 0 else 'Negative'}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    for w in ["hello", "bro", "bad", "badly", "good", "happy"]:
        explain_word(w)
