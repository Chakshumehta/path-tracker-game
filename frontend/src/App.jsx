import { useState, useEffect } from 'react'
import './App.css'

const BACKEND_URL = "https://path-tracker-game.onrender.com";

function App() {
  const [level, setLevel] = useState(() => {
    const savedLevel = localStorage.getItem('pathTrackerLevel')
    return savedLevel ? parseInt(savedLevel) : 1
  })

  // State for username and leaderboard
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('pathTrackerUsername') || ''
  })
  const [leaderboard, setLeaderboard] = useState([])

  const [sequence, setSequence] = useState([])
  const [userSequence, setUserSequence] = useState([])
  const [activeTile, setActiveTile] = useState(null)
  const [gameState, setGameState] = useState('idle') 

  // Save current level to localStorage
  useEffect(() => {
    localStorage.setItem('pathTrackerLevel', level)
  }, [level])

  // Save username to localStorage whenever it changes
  useEffect(() => {
    if (username) {
      localStorage.setItem('pathTrackerUsername', username)
    }
  }, [username])

  // Fetch leaderboard on initial component mount
  useEffect(() => {
    fetchLeaderboard()
  }, [])

  // 1. FETCH LEADERBOARD FROM BACKEND
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/leaderboard/`)
      const data = await response.json()
      setLeaderboard(data)
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    }
  }

  // 2. SUBMIT SCORE TO BACKEND & SUPABASE
  const submitScore = async (finalScore) => {
    let name = username

    // Prompt for username if not already set
    if (!name || name.trim() === '') {
      name = prompt("Game Over! Enter your name for the Leaderboard:") || "Player1"
      setUsername(name)
    }

    try {
      await fetch(`${BACKEND_URL}/scores/?username=${encodeURIComponent(name)}&score=${finalScore}`, {
        method: 'POST',
      })
      // Refresh leaderboard to show the updated score
      fetchLeaderboard()
    } catch (error) {
      console.error("Error saving score:", error)
    }
  }

  // 3. FETCH GAME SEQUENCE
  const fetchSequence = async (currentLevel) => {
    setGameState('playing_sequence')
    setUserSequence([]) 
    
    try {
      const response = await fetch(`${BACKEND_URL}/generate-sequence?level=${currentLevel}`)
      const data = await response.json()
      
      setSequence(data.path)
      playSequence(data.path, data.speed)
    } catch (error) {
      console.error("Make sure the Python server is running!", error)
      setGameState('idle')
    }
  }

  // 4. PLAY SEQUENCE ANIMATION
  const playSequence = (path, speed) => {
    let index = 0;

    const interval = setInterval(() => {
      if (index < path.length) {
        setActiveTile(path[index]);
        setTimeout(() => setActiveTile(null), speed - 50); 
        index++;
      } else {
        clearInterval(interval);
        setGameState('user_turn'); 
      }
    }, speed);
  }

  // 5. HANDLE TILE CLICKS
  const handleTileClick = (index) => {
    if (gameState !== 'user_turn') return; 

    const newUserSequence = [...userSequence, index];
    setUserSequence(newUserSequence);
    
    setActiveTile(index);
    setTimeout(() => setActiveTile(null), 150);

    const currentClickIndex = newUserSequence.length - 1;
    if (newUserSequence[currentClickIndex] !== sequence[currentClickIndex]) {
      setGameState('game_over');
      
      // Submit score on Game Over (using current level as the score)
      submitScore(level)
      return;
    }

    if (newUserSequence.length === sequence.length) {
      setGameState('level_passed');
    }
  }

  // Completely resets the game back to Level 1
  const handleFullRestart = () => {
    setLevel(1);
    setGameState('idle');
  }

  return (
    <div className="game-container">
      <div className="level-bubble">
        LEVEL {level}
      </div>

      <h1>THE PATH TRACKER</h1>

      {/* Player name configuration bar */}
      <div className="player-info">
        <label>Player Name: </label>
        <input 
          type="text" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          placeholder="Enter your name"
        />
      </div>

      <div className="status-message">
        {gameState === 'idle' && <p>Press Start to begin your journey.</p>}
        {gameState === 'playing_sequence' && <p className="glow-text">Memorize the path...</p>}
        {gameState === 'user_turn' && <p>Your turn! Repeat the sequence.</p>}
        {gameState === 'level_passed' && <p className="success-text">SEQUENCE TRACKED!</p>}
        {gameState === 'game_over' && <p className="danger-text">Wrong Tile! Score Submitted.</p>}
      </div>
      
      <div className={`grid ${gameState === 'user_turn' ? 'interactive' : ''}`}>
        {[...Array(25)].map((_, index) => (
          <div 
            key={index} 
            className={`tile ${activeTile === index ? 'active' : ''}`}
            onClick={() => handleTileClick(index)}
          >
            {index}
          </div>
        ))}
      </div>

      <div className="controls">
        {gameState === 'idle' && (
          <button onClick={() => fetchSequence(level)}>START GAME</button>
        )}
        
        {gameState === 'level_passed' && (
          <button className="next-btn" onClick={() => {
            const nextLevel = level + 1;
            setLevel(nextLevel); 
            fetchSequence(nextLevel);
          }}>
            NEXT LEVEL
          </button>
        )}

        {gameState === 'game_over' && (
          <button className="restart-btn" onClick={() => fetchSequence(level)}>
            Start Again
          </button>
        )}
      </div>

      {level > 1 && gameState !== 'playing_sequence' && (
        <button className="full-restart-btn" onClick={handleFullRestart}>
          Restart to Level 1
        </button>
      )}

      {/* --- LIVE LEADERBOARD SECTION --- */}
      <div className="leaderboard-section">
        <h2>🏆 TOP PLAYERS</h2>
        {leaderboard.length === 0 ? (
          <p>No high scores recorded yet!</p>
        ) : (
          <ol className="leaderboard-list">
            {leaderboard.map((item) => (
              <li key={item.id}>
                <span className="player-name">{item.username}</span>
                <span className="player-score">{item.score} pts</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}

export default App