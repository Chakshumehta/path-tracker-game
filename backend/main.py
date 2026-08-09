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
    
    # Stays at 5 tiles until Level 15. After Level 15, it adds 1 tile per level.
    if level <= 15:
        sequence_length = 5
    else:
        sequence_length = 5 + (level - 15)
    
    path = []
    for _ in range(sequence_length):
        next_tile = random.randint(0, 24) 
        path.append(next_tile)
        
    return {"level": level, "path": path}