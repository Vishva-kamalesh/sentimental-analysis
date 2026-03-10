import joblib

lr = joblib.load("lr_model.pkl")
svm = joblib.load("svm_model.pkl")
nb = joblib.load("nb_model.pkl")

print(f"LR Intercept: {lr.intercept_}")
print(f"SVM Intercept: {svm.intercept_}")
# NB doesn't have an intercept like this, but class priors
print(f"NB Class Log Prior: {nb.class_log_prior_}")
print(f"NB Classes: {nb.classes_}")
