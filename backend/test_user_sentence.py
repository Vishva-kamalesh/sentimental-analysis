import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

MODEL_NAME = "lxyuan/distilbert-base-multilingual-cased-sentiments-student"
EMOTION_MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"
sentence = "I may have some problems to face!! I have been given offers to work in Amazon and Google, I was confused which one to choose."

# Sentiment
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

inputs = tokenizer(sentence, return_tensors="pt", padding=True, truncation=True)
with torch.no_grad():
    logits = model(**inputs).logits

probs = F.softmax(logits, dim=-1)[0]
id2label = model.config.id2label

print(f"Sentence: {sentence}")
print("--- Sentiment ---")
for i, prob in enumerate(probs):
    print(f"Label: {id2label[i]}, Score: {prob.item():.4f}")

# Emotion
emo_tokenizer = AutoTokenizer.from_pretrained(EMOTION_MODEL_NAME)
emo_model = AutoModelForSequenceClassification.from_pretrained(EMOTION_MODEL_NAME)

emo_inputs = emo_tokenizer(sentence, return_tensors="pt", padding=True, truncation=True)
with torch.no_grad():
    emo_logits = emo_model(**emo_inputs).logits

emo_probs = F.softmax(emo_logits, dim=-1)[0]
emo_id2label = emo_model.config.id2label

print("\n--- Emotions ---")
for i, prob in enumerate(emo_probs):
    print(f"Emotion: {emo_id2label[i]}, Score: {prob.item():.4f}")
