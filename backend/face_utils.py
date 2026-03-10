import cv2
import numpy as np
import base64
from deepface import DeepFace
import logging

log = logging.getLogger("face-inference")

def analyze_face_base64(base64_str: str):
    """
    Decodes a base64 string into an image and analyzes it for emotions using DeepFace.
    """
    try:
        # 1. Decode base64
        # Remove header like "data:image/jpeg;base64," if present
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
            
        if not base64_str.strip() or len(base64_str) < 10:
            raise ValueError("Empty image data received.")
            
        img_data = base64.b64decode(base64_str)
        if not img_data:
            raise ValueError("Base64 decoding resulted in empty data.")
            
        nparr = np.frombuffer(img_data, np.uint8)
        if nparr.size == 0:
            raise ValueError("Empty numpy buffer.")
            
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise ValueError("Invalid image data.")

        # 2. Analyze using DeepFace
        # We use enforce_detection=False so it doesn't error out if a face isn't perfectly framed
        results = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False, silent=True)
        
        # DeepFace returns a list if multiple faces are detected
        if isinstance(results, list):
            # Select the largest face or first face
            primary_face = results[0]
        else:
            primary_face = results

        # 3. Format output
        emotion_scores = primary_face['emotion']
        dominant_emotion = primary_face['dominant_emotion']
        
        # Emoji mapping for UI
        EMOTION_EMOJI = {
            "joy": "😊", "happy": "😊",
            "anger": "😡", "angry": "😡",
            "sadness": "😢", "sad": "😢",
            "fear": "😨", "love": "😍",
            "surprise": "😲", "neutral": "😐",
            "disgust": "🤢"
        }
        
        formatted_emotions = [
            {
                "emotion": e, 
                "score": round(float(s) / 100, 4),
                "emoji": EMOTION_EMOJI.get(e.lower(), "🔸")
            }
            for e, s in emotion_scores.items()
        ]
        # Sort by score
        formatted_emotions.sort(key=lambda x: x["score"], reverse=True)

        return {
            "dominant_emotion": dominant_emotion,
            "emotions": formatted_emotions,
            "box": primary_face['region'] # {x, y, w, h}
        }

    except Exception as e:
        log.error(f"❌ DeepFace analysis failed: {e}")
        raise e
