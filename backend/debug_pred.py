import joblib
import numpy as np

def debug_prediction(text):
    lr = joblib.load("lr_model.pkl")
    svm = joblib.load("svm_model.pkl")
    nb = joblib.load("nb_model.pkl")
    vectorizer = joblib.load("vectorizer.pkl")
    
    X_vec = vectorizer.transform([text])
    
    print(f"Sentence: '{text}'")
    
    # Analyze tokens
    feature_names = vectorizer.get_feature_names_out()
    words = text.lower().split()
    print("\nToken Analysis:")
    for w in words:
        if w in feature_names:
            idx = list(feature_names).index(w)
            print(f"  '{w}': LR={lr.coef_[0][idx]:.3f}, SVM={svm.coef_[0][idx]:.3f}")
        else:
            print(f"  '{w}': [Not in vocab or Stopword]")

    # Result
    print(f"\nPredictions:")
    print(f"  LR:  {lr.predict(X_vec)[0]} {lr.predict_proba(X_vec)}")
    print(f"  SVM: {svm.predict(X_vec)[0]}")
    print(f"  NB:  {nb.predict(X_vec)[0]} {nb.predict_proba(X_vec)}")

if __name__ == "__main__":
    debug_prediction("hello bro you are bad")
