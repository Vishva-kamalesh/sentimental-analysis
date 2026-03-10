import requests
import json

def test():
    url = "http://localhost:8000/predict/compare"
    payload = {"text": "hello"}
    try:
        r = requests.post(url, json=payload)
        data = r.json()
        print(f"Test for: '{payload['text']}'")
        for res in data['results']:
            print(f"  {res['name']}: {res['sentiment']} ({res['confidence']}%)")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test()
