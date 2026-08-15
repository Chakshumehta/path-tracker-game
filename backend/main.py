import os
import random
from datetime import datetime
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# 1. Database Connection Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./game.db")

# Render fix if connection string starts with 'postgres://' instead of 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. Database Model (Scores Table)
class UserScore(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    score = Column(Integer, default=0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create tables in Supabase automatically when app starts
Base.metadata.create_all(bind=engine)

# 3. App Setup & CORS Middleware
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to handle database sessions
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 4. Sequence Generator Endpoint (Gentle, Continuous Curve)
@app.get("/generate-sequence")
def generate_sequence(level: int = 1):
    # Adds only 1 extra tile every 3 levels
    sequence_length = 3 + (level // 3)

    # Starts at 1000ms, gently drops by only 20ms per level (minimum speed capped at 500ms)
    speed_ms = max(500, 1000 - (level * 20))

    path = [random.randint(0, 24) for _ in range(sequence_length)]
        
    return {"level": level, "path": path, "speed": speed_ms}

# 5. Score Submission Endpoint (Handles User Registration & Personal Bests)
@app.post("/scores/")
def submit_score(username: str, score: int, db: Session = Depends(get_db)):
    existing_user = db.query(UserScore).filter(UserScore.username == username).first()

    if existing_user:
        if score > existing_user.score:
            existing_user.score = score
            existing_user.updated_at = datetime.utcnow()
            db.commit()
            return {"message": "New high score!", "username": username, "score": score}
        return {"message": "Score recorded, but not a new high score.", "score": existing_user.score}
    else:
        new_user = UserScore(username=username, score=score)
        db.add(new_user)
        db.commit()
        return {"message": "User registered and score saved!", "username": username, "score": score}

# 6. Infinite Leaderboard Endpoint (Returns ALL Players)
@app.get("/leaderboard/")
def get_leaderboard(db: Session = Depends(get_db)):
    return (
        db.query(UserScore)
        .order_by(UserScore.score.desc())
        .all()
    )