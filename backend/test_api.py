import asyncio
import httpx
import time
import random

API_URL = "http://localhost:8000/predict"

SAMPLES = [
    "I absolutely love this product! It works perfectly.",
    "The item arrived broken and late. Very disappointed.",
    "It's an okay product, not great but not terrible either.",
    "Worst experience ever. Do not buy.",
    "The shipping was fast and the quality is amazing.",
    "I'm not sure how I feel about this. It's confusing.",
    "Simply the best thing I've bought all year.",
    "Meh. Just average. Could be better.",
    "Brilliant service and top-notch packaging!",
    "I wanted to like this but it failed after two days."
]

async def send_request(client, text, req_id):
    start = time.time()
    try:
        response = await client.post(API_URL, json={"text": text}, timeout=10.0)
        json_data = response.json()
        latency = (time.time() - start) * 1000
        print(f"[Req {req_id}] Sent: {text[:30]}... | Result: {json_data['sentiment']} | Conf: {json_data['confidence']:.2f} | Error: {json_data['uncertainty']} | Roundtrip: {latency:.1f}ms")
        return latency
    except Exception as e:
        print(f"[Req {req_id}] Failed: {e}")
        return None

async def run_stress_test(num_requests=50, concurrency=10):
    print(f"🔥 Starting Stress Test: {num_requests} requests, concurrency={concurrency}")
    
    async with httpx.AsyncClient() as client:
        tasks = []
        start_time = time.time()
        
        for i in range(num_requests):
            text = random.choice(SAMPLES)
            tasks.append(send_request(client, text, i))
            
            # Control concurrency
            if len(tasks) >= concurrency:
                await asyncio.gather(*tasks)
                tasks = []
        
        if tasks:
            await asyncio.gather(*tasks)
            
        total_time = time.time() - start_time
        print(f"\n✅ Stress Test Completed!")
        print(f"📊 Total Time: {total_time:.2f}s")
        print(f"🚀 Throughput: {num_requests / total_time:.2f} req/s")

if __name__ == "__main__":
    # Note: Ensure the app.py is running on localhost:8000 before running this
    asyncio.run(run_stress_test())
