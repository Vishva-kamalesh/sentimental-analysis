import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np

MODEL_NAME = "lxyuan/distilbert-base-multilingual-cased-sentiments-student"
UNCERTAINTY_ENTROPY_THRESHOLD = 0.6

def _run_inference_simulated(texts, model, tokenizer):
    inputs = tokenizer(
        texts,
        return_tensors="pt",
        padding=True,
        truncation=True,
        max_length=512,
    )

    with torch.no_grad():
        logits = model(**inputs).logits

    probs = F.softmax(logits, dim=-1)

    results = []
    for i, prob_row in enumerate(probs):
        prob_np = prob_row.cpu().float().numpy()
        text = texts[i].lower()

        # Map model labels to IDs
        id2label = model.config.id2label
        label_scores = {id2label[idx].upper(): float(prob_np[idx]) for idx in range(len(prob_np))}
        
        pos_score = sum(score for label, score in label_scores.items() if "POS" in label)
        neg_score = sum(score for label, score in label_scores.items() if "NEG" in label)
        neu_score = sum(score for label, score in label_scores.items() if "NEU" in label)

        eps = 1e-9
        entropy = float(-np.sum(prob_np * np.log2(prob_np + eps)))
        uncertainty = entropy > UNCERTAINTY_ENTROPY_THRESHOLD

        mixed_keywords = ["but", "however", "although", "yet", "confused", "confusion", "mixed", "while", "nevertheless"]
        has_mixed_keywords = any(f" {kw} " in f" {text} " or text.startswith(kw) or text.endswith(kw) for kw in mixed_keywords)
        
        is_mixed = False
        if pos_score > 0.15 and neg_score > 0.15:
            is_mixed = True
        elif has_mixed_keywords and pos_score > 0.08 and neg_score > 0.08:
            is_mixed = True
        elif "confused" in text and pos_score > 0.1 and neg_score > 0.1:
            is_mixed = True

        pred_idx = int(prob_np.argmax())
        raw_label = id2label[pred_idx].upper()

        if is_mixed:
            sentiment = "neutral (mixed)"
            confidence = float(max(pos_score, neg_score))
        elif "POS" in raw_label:
            sentiment = "positive"
            confidence = pos_score
        elif "NEG" in raw_label:
            sentiment = "negative"
            confidence = neg_score
        else:
            sentiment = "neutral"
            confidence = neu_score

        results.append({
            "text": texts[i],
            "sentiment":   sentiment,
            "confidence":  round(confidence, 4),
            "all_scores":  label_scores,
        })

    return results

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

test_sentences = [
    "I may have some problems to face!! I have been given offers to work in Amazon and Google, I was confused which one to choose.",
    "This is great, but also a bit expensive.",
    "I'm totally happy with this purchase!",
    "This is the worst experience ever."
]

results = _run_inference_simulated(test_sentences, model, tokenizer)

for res in results:
    print(f"Text: {res['text']}")
    print(f"Sentiment: {res['sentiment']}")
    print(f"Confidence: {res['confidence']}")
    print(f"Scores: {res['all_scores']}")
    print("-" * 30)
