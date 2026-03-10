# Sentiment Insights Engine (MLOps + BERT) 🏆🚀

An industrial-grade sentiment analysis system trained on 568k Amazon Fine Food reviews. This project demonstrates a complete MLOps pipeline, from raw data engineering to a high-concurrency production API.

## 🏗️ Architecture
- **Frontend**: React (Vite) + Tailwind CSS + Lucide Icons.
- **Backend**: FastAPI (Python) with Async Request Batching.
- **Model Layer**: Fine-tuned **DistilBERT Champion** (91.26% Accuracy).
- **Optimization**: CUDA Autocast, Gradient Accumulation, and Entropy-based Uncertainty Detection.

## 📊 Model Performance
| Model | Accuracy | Macro F1 | Neutral Recall |
| :--- | :--- | :--- | :--- |
| Naive Bayes (Baseline) | 82% | 0.46 | 1% |
| Weighted LSTM | 87% | 0.74 | 69% |
| **DistilBERT Champion** | **91.26%** | **0.805** | **71%** |

## 🚀 Key Features
- **High-Throughput API**: Benchmarked at **29 requests per second** on an RTX 3050.
- **Async Batching**: Background worker that parallelizes GPU inference for massive efficiency.
- **Uncertainty Flag**: Detects ambiguous or sarcastic reviews using softmax entropy sensitivity.
- **Real-time Metrics**: React dashboard showing latency (ms) and confidence scores for every prediction.

## 🛠️ Tech Stack
- **ML**: PyTorch, Transformers (HuggingFace), Scikit-Learn, Pandas.
- **API**: FastAPI, Uvicorn, Pydantic.
- **Frontend**: Vite, React, Framer Motion, Shadcn UI.

---
🚀 Developed by RockstarRazee & Antigravity 🚀
