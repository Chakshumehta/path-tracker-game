from fastapi import FastAPI
import random

# 1. Initialize the FastAPI engine
app = FastAPI()

# 2. Create the "endpoint" (The URL the frontend will talk to)
@app.get("/generate-sequence")
def generate_sequence(level: int = 1):
    
    # 3. Game Rule: Level 1 starts with 8 tiles to memorize. 
    # The higher the level, the longer the sequence.
    sequence_length = 5 + (level * 3) 
    
    # 4. Generate the random sequence
    path = []
    for _ in range(sequence_length):
        # We pick a random number between 0 and 24 (representing our 25 grid tiles)
        next_tile = random.randint(0, 24) 
        path.append(next_tile)
        
    # 5. Send the data out
    return {"level": level, "path": path}