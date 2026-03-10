import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification

EMOTION_MODEL_NAME = "j-hartmann/emotion-english-distilroberta-base"
sentence = "I may have some problems to face!! I have been given offers to work in Amazon and Google, I was confused which one to choose."

tokenizer = AutoTokenizer.from_pretrained(EMOTION_MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(EMOTION_MODEL_NAME)

inputs = tokenizer(sentence, return_tensors="pt", padding=True, truncation=True)
with torch.no_grad():
    logits = model(**inputs).logits

probs = F.softmax(logits, dim=-1)[0]
id2label = model.config.id2label

print(f"Sentence: {sentence}")
for i, prob in enumerate(probs):
    print(f"Emotion: {id2label[i]}, Score: {prob.item():.4f}")
