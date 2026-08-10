from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/generate-sequence")
def generate_sequence(level: int = 1):
    
    # 1. TILE PACING: Starts at 3 tiles, adds 1 extra tile every 2 levels.
    # Level 1 = 3 tiles, Level 4 = 5 tiles, Level 10 = 8 tiles
    sequence_length = 3 + (level // 2)
    
    # 2. SPEED PACING: Starts at a slow 1000ms, drops by 40ms each level.
    # The max() function ensures it never drops below 250ms so it stays humanly playable.
    speed_ms = max(250, 1000 - (level * 40))
    
    path = []
    for _ in range(sequence_length):
        next_tile = random.randint(0, 24) 
        path.append(next_tile)
        
    # We now send the calculated speed back to React along with the path!
    return {"level": level, "path": path, "speed": speed_ms}