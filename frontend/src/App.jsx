import { useState, useEffect } from 'react'
import './App.css'

const BACKEND_URL = "https://path-tracker-game.onrender.com";

function App() {
  // Player state & Welcome screen toggle (Permanent handle)
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('pathTrackerUsername') || ''
  })
  const [tempName, setTempName] = useState('')
  const [isNameSet, setIsNameSet] = useState(() => {
    return !!localStorage.getItem('pathTrackerUsername')
  })

  // Sidebar toggle state & loading state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])

  // Game mechanics state
  const [level, setLevel] = useState(() => {
    const savedLevel = localStorage.getItem('pathTrackerLevel')
    return savedLevel ? parseInt(savedLevel) : 1
  })
  const [sequence, setSequence] = useState([])
  const [userSequence, setUserSequence] = useState([])
  const [activeTile, setActiveTile] = useState(null)
  const [gameState, setGameState] = useState('idle') 

  // Save level and username to localStorage
  useEffect(() => {
    localStorage.setItem('pathTrackerLevel', level)
  }, [level])

  useEffect(() => {
    if (username) {
      localStorage.setItem('pathTrackerUsername', username)
    }
  }, [username])

  // Initial fetch on component mount
  useEffect(() => {
    fetchLeaderboard()
  }, [])

  // 1. FETCH LEADERBOARD
  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true)
    try {
      const response = await fetch(`${BACKEND_URL}/leaderboard/`)
      const data = await response.json()
      setLeaderboard(data)
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setIsLoadingLeaderboard(false)
    }
  }

  // 2. SUBMIT SCORE TO BACKEND
  const submitScore = async (finalScore) => {
    if (!username) return;

    try {
      await fetch(`${BACKEND_URL}/scores/?username=${encodeURIComponent(username)}&score=${finalScore}`, {
        method: 'POST',
      })
      fetchLeaderboard()
    } catch (error) {
      console.error("Error saving score:", error)
    }
  }

  // 3. FETCH SEQUENCE
  const fetchSequence = async (currentLevel) => {
    setGameState('playing_sequence')
    setUserSequence([]) 
    
    try {
      const response = await fetch(`${BACKEND_URL}/generate-sequence?level=${currentLevel}`)
      const data = await response.json()
      
      setSequence(data.path)
      playSequence(data.path, data.speed)
    } catch (error) {
      console.error("Make sure the backend server is running!", error)
      setGameState('idle')
    }
  }

  // 4. PLAY ANIMATION
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
      submitScore(level);
      return;
    }

    if (newUserSequence.length === sequence.length) {
      setGameState('level_passed');
    }
  }

  const handleFullRestart = () => {
    setLevel(1);
    setGameState('idle');
  }

  const handleNameSubmit = (e) => {
    e.preventDefault()
    if (tempName.trim()) {
      setUsername(tempName.trim())
      setIsNameSet(true)
    }
  }

  // --- WELCOME / REGISTRATION SCREEN ---
  if (!isNameSet) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <h1>THE PATH TRACKER</h1>
          <p>Choose your player name to start tracking paths.</p>
          
          <form onSubmit={handleNameSubmit} className="name-form">
            <input 
              type="text" 
              placeholder="Enter your player name..." 
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              required
              maxLength={15}
            />
            <button type="submit" className="start-btn">
              START PLAYING
            </button>
          </form>
        </div>
      </div>
    )
  }

  // --- MAIN APPLICATION SCREEN ---
  return (
    <div className="app-layout">
      {/* Top Header Bar */}
      <header className="app-header">
        <div className="user-badge">
          <span>🎮 Player: <strong>{username}</strong></span>
        </div>

        <button 
          className="leaderboard-toggle-btn"
          onClick={() => {
            const nextState = !isSidebarOpen;
            setIsSidebarOpen(nextState);
            if (nextState) fetchLeaderboard();
          }}
        >
          🏆 LEADERBOARD
        </button>
      </header>

      {/* Main Game Container */}
      <main className="game-container">
        <div className="level-bubble">
          LEVEL {level}
        </div>

        <h1>THE PATH TRACKER</h1>

        <div className="status-message">
          {gameState === 'idle' && <p>Press Start to begin your sequence.</p>}
          {gameState === 'playing_sequence' && <p className="glow-text">Memorize the path...</p>}
          {gameState === 'user_turn' && <p>Your turn! Repeat the sequence.</p>}
          {gameState === 'level_passed' && <p className="success-text">SEQUENCE TRACKED!</p>}
          {gameState === 'game_over' && <p className="danger-text">Wrong Tile! High score updated.</p>}
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
      </main>

      {/* Infinite Leaderboard Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>🏆 LEADERBOARD</h2>
          <button className="close-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>

        <div className="sidebar-content">
          {isLoadingLeaderboard ? (
            <p className="no-scores">Loading scores...</p>
          ) : leaderboard.length === 0 ? (
            <p className="no-scores">No scores recorded yet!</p>
          ) : (
            <ol className="leaderboard-list">
              {leaderboard.map((item, index) => (
                <li key={item.id || index} className={item.username === username ? 'current-user-rank' : ''}>
                  <span className="rank">#{index + 1}</span>
                  <span className="player-name">{item.username}</span>
                  <span className="player-score">{item.score} pts</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>

      {/* Overlay backdrop */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}
    </div>
  )
}

export default App