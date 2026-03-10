import cv2
import time
from deepface import DeepFace
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-s | %(message)s")
log = logging.getLogger("face-sentiment")

def run_face_sentiment():
    """
    Complete Face Sentiment Detection using OpenCV and DeepFace.
    Captures webcam feed, detects faces, predicts emotions, and displays results.
    """
    # Load Haar Cascade for face detection (fast and lightweight)
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    # Initialize Webcam
    log.info("🚀 Starting webcam...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        log.error("❌ Could not open webcam. Ensure it's not being used by another application.")
        return

    # Frame skipping for performance (analyze every Nth frame)
    FRAME_SKIP = 5
    counter = 0
    last_emotion = "Detecting..."
    
    log.info("✅ System Ready! Press 'q' to quit.")

    while True:
        # 1. Capture frame
        ret, frame = cap.read()
        if not ret:
            break
            
        # Flip frame for mirror effect
        frame = cv2.flip(frame, 1)
        
        # 2. Preprocess (Gray scale for detection)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # 3. Detect Faces
        # scaleFactor=1.1, minNeighbors=5 is usually good for balance
        faces = face_cascade.detectMultiScale(gray, 1.1, 5)

        # 4. Analyze Emotion (every N frames or if no previous results)
        if counter % FRAME_SKIP == 0 and len(faces) > 0:
            try:
                # DeepFace analyze
                # actions=['emotion'] only for speed.
                # enforce_detection=False handles cases where Haar Cascade finds something DeepFace doesn't
                results = DeepFace.analyze(frame, actions=['emotion'], enforce_detection=False, silent=True)
                
                # DeepFace returns a list (for multiple faces)
                if isinstance(results, list):
                    last_emotion = results[0]['dominant_emotion']
                else:
                    last_emotion = results['dominant_emotion']
                    
                log.info(f"🎭 Current Emotion: {last_emotion.upper()}")
            except Exception as e:
                log.warning(f"⚠️ Analysis error: {e}")

        # 5. Draw Graphics
        for (x, y, w, h) in faces:
            # Draw rectangle around face
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            # Display emotion label
            cv2.putText(
                frame, 
                f"Emotion: {last_emotion}", 
                (x, y-10), 
                cv2.FONT_HERSHEY_SIMPLEX, 
                0.9, 
                (36, 255, 12), 
                2
            )

        # 6. Show Video
        cv2.imshow("Face Sentiment Analysis", frame)
        
        # 7. Exit Strategy
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
            
        counter += 1

    # Cleanup
    log.info("🛑 Shutting down system...")
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    # Note: On first run, DeepFace will download the weights (VGG-Face, Emotion, etc.)
    # This might take a few minutes depending on connection speed.
    run_face_sentiment()
