import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import cyberArenaBg from '@/assets/cyber-arena-bg.jpg';

interface PowerUp {
  id: number;
  type: 'explosion' | 'speed' | 'gravity' | 'shield';
  x: number;
  y: number;
  active: boolean;
  timer?: number;
}

interface GameState {
  ball: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    speed: number;
  };
  paddles: {
    left: { y: number; speed: number; shield?: number };
    right: { y: number; speed: number; shield?: number };
  };
  score: {
    left: number;
    right: number;
  };
  powerUps: PowerUp[];
  gameStarted: boolean;
  paused: boolean;
  winner: 'left' | 'right' | null;
  effects: {
    explosion: boolean;
    speedBurst: boolean;
    gravityShift: boolean;
  };
}

const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 400;
const PADDLE_HEIGHT = 80;
const PADDLE_WIDTH = 12;
const BALL_SIZE = 12;
const BASE_BALL_SPEED = 4;
const PADDLE_SPEED = 6;

const CyberPong: React.FC = () => {
  const arenaRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number>();
  const keysRef = useRef<Set<string>>(new Set());
  
  const [gameState, setGameState] = useState<GameState>({
    ball: {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT / 2,
      dx: BASE_BALL_SPEED,
      dy: BASE_BALL_SPEED,
      speed: BASE_BALL_SPEED
    },
    paddles: {
      left: { y: ARENA_HEIGHT / 2 - PADDLE_HEIGHT / 2, speed: PADDLE_SPEED },
      right: { y: ARENA_HEIGHT / 2 - PADDLE_HEIGHT / 2, speed: PADDLE_SPEED }
    },
    score: { left: 0, right: 0 },
    powerUps: [],
    gameStarted: false,
    paused: false,
    winner: null,
    effects: {
      explosion: false,
      speedBurst: false,
      gravityShift: false
    }
  });

  // Initialize power-ups
  const spawnPowerUp = useCallback(() => {
    const types: PowerUp['type'][] = ['explosion', 'speed', 'gravity', 'shield'];
    const newPowerUp: PowerUp = {
      id: Date.now(),
      type: types[Math.floor(Math.random() * types.length)],
      x: Math.random() * (ARENA_WIDTH - 40) + 20,
      y: Math.random() * (ARENA_HEIGHT - 40) + 20,
      active: true
    };
    
    setGameState(prev => ({
      ...prev,
      powerUps: [...prev.powerUps.filter(p => p.active), newPowerUp]
    }));
  }, []);

  // Collision detection
  const checkCollisions = useCallback((state: GameState) => {
    const newState = { ...state };
    const { ball, paddles } = newState;

    // Wall collisions (top/bottom)
    if (ball.y <= BALL_SIZE / 2 || ball.y >= ARENA_HEIGHT - BALL_SIZE / 2) {
      ball.dy = -ball.dy;
    }

    // Paddle collisions
    const leftPaddleCollision = 
      ball.x <= PADDLE_WIDTH + BALL_SIZE / 2 &&
      ball.y >= paddles.left.y &&
      ball.y <= paddles.left.y + PADDLE_HEIGHT;

    const rightPaddleCollision = 
      ball.x >= ARENA_WIDTH - PADDLE_WIDTH - BALL_SIZE / 2 &&
      ball.y >= paddles.right.y &&
      ball.y <= paddles.right.y + PADDLE_HEIGHT;

    if (leftPaddleCollision && ball.dx < 0) {
      ball.dx = Math.abs(ball.dx);
      // Add angle based on hit position
      const hitPos = (ball.y - paddles.left.y) / PADDLE_HEIGHT - 0.5;
      ball.dy += hitPos * 2;
    }

    if (rightPaddleCollision && ball.dx > 0) {
      ball.dx = -Math.abs(ball.dx);
      const hitPos = (ball.y - paddles.right.y) / PADDLE_HEIGHT - 0.5;
      ball.dy += hitPos * 2;
    }

    // Power-up collisions
    newState.powerUps.forEach(powerUp => {
      if (powerUp.active) {
        const distance = Math.sqrt(
          Math.pow(ball.x - powerUp.x, 2) + Math.pow(ball.y - powerUp.y, 2)
        );
        if (distance < 20) {
          powerUp.active = false;
          activatePowerUp(powerUp.type, newState);
        }
      }
    });

    // Score when ball goes off screen
    if (ball.x < 0) {
      newState.score.right++;
      resetBall(newState, 'right');
    } else if (ball.x > ARENA_WIDTH) {
      newState.score.left++;
      resetBall(newState, 'left');
    }

    // Check for winner
    if (newState.score.left >= 11 || newState.score.right >= 11) {
      newState.winner = newState.score.left >= 11 ? 'left' : 'right';
      newState.gameStarted = false;
    }

    return newState;
  }, []);

  const activatePowerUp = (type: PowerUp['type'], state: GameState) => {
    switch (type) {
      case 'explosion':
        state.effects.explosion = true;
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            effects: { ...prev.effects, explosion: false }
          }));
        }, 1000);
        break;
      case 'speed':
        state.ball.speed = BASE_BALL_SPEED * 2;
        state.effects.speedBurst = true;
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            ball: { ...prev.ball, speed: BASE_BALL_SPEED },
            effects: { ...prev.effects, speedBurst: false }
          }));
        }, 5000);
        break;
      case 'gravity':
        state.effects.gravityShift = true;
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            effects: { ...prev.effects, gravityShift: false }
          }));
        }, 8000);
        break;
      case 'shield':
        if (Math.abs(state.ball.dx) > 0) {
          const paddleSide = state.ball.dx > 0 ? 'right' : 'left';
          state.paddles[paddleSide].shield = 3;
        }
        break;
    }
  };

  const resetBall = (state: GameState, lastScorer: 'left' | 'right') => {
    state.ball.x = ARENA_WIDTH / 2;
    state.ball.y = ARENA_HEIGHT / 2;
    state.ball.dx = lastScorer === 'left' ? BASE_BALL_SPEED : -BASE_BALL_SPEED;
    state.ball.dy = (Math.random() - 0.5) * BASE_BALL_SPEED;
    state.ball.speed = BASE_BALL_SPEED;
  };

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameState.gameStarted || gameState.paused) return;

    setGameState(prevState => {
      const newState = { ...prevState };
      
      // Update paddle positions based on keys
      if (keysRef.current.has('KeyW') && newState.paddles.left.y > 0) {
        newState.paddles.left.y -= newState.paddles.left.speed;
      }
      if (keysRef.current.has('KeyS') && newState.paddles.left.y < ARENA_HEIGHT - PADDLE_HEIGHT) {
        newState.paddles.left.y += newState.paddles.left.speed;
      }
      if (keysRef.current.has('ArrowUp') && newState.paddles.right.y > 0) {
        newState.paddles.right.y -= newState.paddles.right.speed;
      }
      if (keysRef.current.has('ArrowDown') && newState.paddles.right.y < ARENA_HEIGHT - PADDLE_HEIGHT) {
        newState.paddles.right.y += newState.paddles.right.speed;
      }

      // Update ball position
      const speedMultiplier = newState.effects.speedBurst ? 1.5 : 1;
      newState.ball.x += newState.ball.dx * speedMultiplier;
      newState.ball.y += newState.ball.dy * speedMultiplier;

      // Apply gravity shift effect
      if (newState.effects.gravityShift) {
        newState.ball.dy += 0.1; // Reverse gravity
      }

      return checkCollisions(newState);
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState.gameStarted, gameState.paused, checkCollisions]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      if (e.code === 'Space' && !gameState.gameStarted) {
        startGame();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameStarted]);

  // Start game loop
  useEffect(() => {
    if (gameState.gameStarted) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.gameStarted, gameLoop]);

  // Spawn power-ups periodically
  useEffect(() => {
    if (!gameState.gameStarted) return;
    
    const interval = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance every 3 seconds
        spawnPowerUp();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [gameState.gameStarted, spawnPowerUp]);

  const startGame = () => {
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      winner: null,
      score: { left: 0, right: 0 },
      powerUps: []
    }));
  };

  const resetGame = () => {
    setGameState({
      ball: {
        x: ARENA_WIDTH / 2,
        y: ARENA_HEIGHT / 2,
        dx: BASE_BALL_SPEED,
        dy: BASE_BALL_SPEED,
        speed: BASE_BALL_SPEED
      },
      paddles: {
        left: { y: ARENA_HEIGHT / 2 - PADDLE_HEIGHT / 2, speed: PADDLE_SPEED },
        right: { y: ARENA_HEIGHT / 2 - PADDLE_HEIGHT / 2, speed: PADDLE_SPEED }
      },
      score: { left: 0, right: 0 },
      powerUps: [],
      gameStarted: false,
      paused: false,
      winner: null,
      effects: {
        explosion: false,
        speedBurst: false,
        gravityShift: false
      }
    });
  };

  const getPowerUpIcon = (type: PowerUp['type']) => {
    switch (type) {
      case 'explosion': return '💥';
      case 'speed': return '⚡';
      case 'gravity': return '🌀';
      case 'shield': return '🛡️';
    }
  };

  const getPowerUpColor = (type: PowerUp['type']) => {
    switch (type) {
      case 'explosion': return 'bg-cyber-hot-pink';
      case 'speed': return 'bg-cyber-electric';
      case 'gravity': return 'bg-cyber-magenta';
      case 'shield': return 'bg-cyber-neon-green';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: `url(${cyberArenaBg})` }}
      />
      
      {/* Title */}
      <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 bg-gradient-cyber bg-clip-text text-transparent animate-cyber-glow">
        CYBER PONG EXPLOSION
      </h1>

      {/* Game Arena */}
      <Card className="relative bg-card/20 backdrop-blur-sm border-2 border-primary rounded-lg overflow-hidden shadow-cyber-glow">
        <div 
          ref={arenaRef}
          className="relative bg-gradient-arena"
          style={{ width: ARENA_WIDTH, height: ARENA_HEIGHT }}
        >
          {/* Grid Effect */}
          <div className="absolute inset-0 opacity-30">
            <div className="w-full h-full" style={{
              backgroundImage: `
                linear-gradient(hsl(var(--cyber-grid)) 1px, transparent 1px),
                linear-gradient(90deg, hsl(var(--cyber-grid)) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px'
            }} />
          </div>

          {/* Center Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-cyber-cyan opacity-60 animate-cyber-pulse" />

          {/* Left Paddle */}
          <div
            className={`absolute bg-cyber-cyan rounded-r-lg shadow-cyber-glow animate-cyber-pulse ${
              gameState.paddles.left.shield ? 'ring-4 ring-cyber-neon-green' : ''
            }`}
            style={{
              left: 0,
              top: gameState.paddles.left.y,
              width: PADDLE_WIDTH,
              height: PADDLE_HEIGHT
            }}
          />

          {/* Right Paddle */}
          <div
            className={`absolute bg-cyber-magenta rounded-l-lg shadow-cyber-magenta animate-cyber-pulse ${
              gameState.paddles.right.shield ? 'ring-4 ring-cyber-neon-green' : ''
            }`}
            style={{
              right: 0,
              top: gameState.paddles.right.y,
              width: PADDLE_WIDTH,
              height: PADDLE_HEIGHT
            }}
          />

          {/* Ball */}
          <div
            className={`absolute bg-primary rounded-full shadow-cyber-electric ${
              gameState.effects.explosion ? 'animate-cyber-pulse scale-150' : ''
            } ${gameState.effects.speedBurst ? 'animate-cyber-glow' : ''}`}
            style={{
              left: gameState.ball.x - BALL_SIZE / 2,
              top: gameState.ball.y - BALL_SIZE / 2,
              width: BALL_SIZE,
              height: BALL_SIZE
            }}
          />

          {/* Power-ups */}
          {gameState.powerUps.map(powerUp => (
            powerUp.active && (
              <div
                key={powerUp.id}
                className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-lg animate-power-up-spawn ${getPowerUpColor(powerUp.type)} shadow-cyber-electric`}
                style={{
                  left: powerUp.x - 16,
                  top: powerUp.y - 16
                }}
              >
                {getPowerUpIcon(powerUp.type)}
              </div>
            )
          ))}

          {/* Game Overlay */}
          {!gameState.gameStarted && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="text-center">
                {gameState.winner ? (
                  <>
                    <h2 className="text-4xl font-bold text-primary mb-4">
                      Player {gameState.winner === 'left' ? '1' : '2'} Wins!
                    </h2>
                    <Button onClick={resetGame} className="bg-gradient-cyber text-primary-foreground">
                      Play Again
                    </Button>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-foreground mb-4">Ready to Start?</h2>
                    <p className="text-muted-foreground mb-4">
                      Player 1: W/S | Player 2: ↑/↓
                    </p>
                    <Button onClick={startGame} className="bg-gradient-cyber text-primary-foreground">
                      Start Game (Space)
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Score Display */}
      <div className="flex items-center gap-8 mt-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-cyber-cyan animate-cyber-pulse">
            {gameState.score.left}
          </div>
          <div className="text-sm text-muted-foreground">Player 1</div>
        </div>
        <div className="text-2xl text-muted-foreground">VS</div>
        <div className="text-center">
          <div className="text-4xl font-bold text-cyber-magenta animate-cyber-pulse">
            {gameState.score.right}
          </div>
          <div className="text-sm text-muted-foreground">Player 2</div>
        </div>
      </div>

      {/* Active Effects */}
      {(gameState.effects.explosion || gameState.effects.speedBurst || gameState.effects.gravityShift) && (
        <div className="mt-4 flex gap-2">
          {gameState.effects.explosion && (
            <div className="px-3 py-1 bg-cyber-hot-pink/20 border border-cyber-hot-pink rounded-full text-cyber-hot-pink text-sm animate-cyber-pulse">
              💥 Explosion Active
            </div>
          )}
          {gameState.effects.speedBurst && (
            <div className="px-3 py-1 bg-cyber-electric/20 border border-cyber-electric rounded-full text-cyber-electric text-sm animate-cyber-pulse">
              ⚡ Speed Burst
            </div>
          )}
          {gameState.effects.gravityShift && (
            <div className="px-3 py-1 bg-cyber-magenta/20 border border-cyber-magenta rounded-full text-cyber-magenta text-sm animate-cyber-pulse">
              🌀 Gravity Shift
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CyberPong;