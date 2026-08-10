import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [level, setLevel] = useState(() => {
    const savedLevel = localStorage.getItem('pathTrackerLevel')
    return savedLevel ? parseInt(savedLevel) : 1
  })

  const [sequence, setSequence] = useState([])
  const [userSequence, setUserSequence] = useState([])
  const [activeTile, setActiveTile] = useState(null)
  const [gameState, setGameState] = useState('idle') 

  useEffect(() => {
    localStorage.setItem('pathTrackerLevel', level)
  }, [level])

  const fetchSequence = async (currentLevel) => {
    setGameState('playing_sequence')
    setUserSequence([]) 
    
    try {
      const response = await fetch(`https://path-tracker-game.onrender.com/generate-sequence?level=${currentLevel}`)
      const data = await response.json()
      
      setSequence(data.path)
      playSequence(data.path, data.speed)
    } catch (error) {
      console.error("Make sure the Python server is running!", error)
      setGameState('idle')
    }
  }

  const playSequence = (path, speed) => {
    let index = 0;
    
    // The aggressive speed math we updated!
    //const speed = Math.max(150, 900 - (currentLevel * 50)); 
    // We deleted the aggressive local speed math! 
    // It is now using the 'speed' variable calculated by Python.

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

  const handleTileClick = (index) => {
    if (gameState !== 'user_turn') return; 

    const newUserSequence = [...userSequence, index];
    setUserSequence(newUserSequence);
    
    setActiveTile(index);
    setTimeout(() => setActiveTile(null), 150);

    const currentClickIndex = newUserSequence.length - 1;
    if (newUserSequence[currentClickIndex] !== sequence[currentClickIndex]) {
      setGameState('game_over');
      return;
    }

    if (newUserSequence.length === sequence.length) {
      setGameState('level_passed');
    }
  }

  // --- NEW LOGIC: Completely resets the game back to Level 1 ---
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

      <div className="status-message">
        {gameState === 'idle' && <p>Press Start to begin your journey.</p>}
        {gameState === 'playing_sequence' && <p className="glow-text">Memorize the path...</p>}
        {gameState === 'user_turn' && <p>Your turn! Repeat the sequence.</p>}
        {gameState === 'level_passed' && <p className="success-text">SEQUENCE TRACKED!</p>}
        {gameState === 'game_over' && <p className="danger-text">Wrong Tile.</p>}
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

      {/* --- NEW BUTTON: Only shows if you are past Level 1 and not actively watching a sequence --- */}
      {level > 1 && gameState !== 'playing_sequence' && (
        <button className="full-restart-btn" onClick={handleFullRestart}>
          Restart to Level 1
        </button>
      )}
    </div>
  )
}

export default App