
// --- Color Palette Definitions (C64 style) ---
const COLORS = {
  wall: "#120485",        // Dark blue for walls
  background: "#000",     // Black background
  pacman: "#ffe800",      // Yellow Pacman
  ghostRed: "#f44336",    // Ghost #1 (red)
  ghostPink: "#e91e63",   // Ghost #2 (pink)
  ghostCyan: "#00e6e6",   // Ghost #3 (cyan)
  ghostOrange: "#ff9800", // Ghost #4 (orange)
  pellet: "#fff",         // Small pellet, white
  powerPellet: "#ffb6ff", // Power pellet, pinkish
  fruit: "#43ff00",       // Fruit (green apple, for now)
  hudText: "#fff"         // HUD text
};

// --- Canvas Setup ---
let canvas, ctx;

window.onload = function initGame() {
  canvas = document.getElementById("gameCanvas");
  ctx = canvas.getContext("2d");
  setupGameObjects();
  requestAnimationFrame(gameLoop);
};

// --- Object Definitions (Empty, filled later) ---
let maze, pacman, ghosts, pellets, powerPellets, fruit, score, lives, level, gameState;

// --- Setup (placeholder, will expand) ---
function setupGameObjects() {
  // Maze, pellets, ghosts, fruit, etc. to be created and positioned here
  score = 0;
  lives = 3;
  level = 1;
  gameState = "playing";
  // ... detailed setup comes next chunk
}

// --- Main Game Loop Skeleton ---
let lastLogicTime = 0;
const logicInterval = 100; // ms, adjust for responsiveness

function gameLoop() {
  const now = performance.now();
  if (now - lastLogicTime > logicInterval && gameState === "playing") {
    updateGame();
    lastLogicTime = now;
  }
  drawGame(ctx);
  requestAnimationFrame(gameLoop);
}

// --- Update Logic (stub) ---
function updateGame() {
  movePacman(pacman, maze);
  updateGhostModes();
  ghosts.forEach(g => moveGhost(g, maze));
  handleFruitSpawning();
  handlePelletEating();
  handleFruitEating();
  handleGhostCollision();
}


// --- Draw Logic (stub) ---
function drawGame(ctx) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Next: drawMaze(ctx, maze), drawPacman(ctx, pacman), drawGhosts, drawPellets, drawFruit, drawHUD...
}

// --- Maze Structure ---
function initMaze() {
  // 28 cols x 21 rows fits well and compresses for 640x480
  // Use a template for basic layout, will refine later for accuracy
  maze = [
    // 28 columns, 'W'=wall, 'P'=pellet, 'O'=power-pellet, '.'=empty, 'T'=tunnel, 'F'=fruit
    // Top row
    ["W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W"],
    // Example middle rows...
    ["W","P","P","P","W","P","P","P","W","P","P","P","W","P","P","P","W","P","P","P","W","P","P","P","W","P","P","W"],
    ["T",".",".",".","W",".",".",".",".",".",".",".","W",".",".",".",".",".",".",".","W",".",".",".",".",".",".","T"], // Tunnels
    // more rows...
    ["W","O",".",".",".",".",".","W",".",".",".",".",".",".",".","W",".",".",".",".",".",".",".",".",".",".","O","W"],
    // ... you can fill in/expand using Pac-Man mazes as reference ...
    // Bottom row
    ["W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W","W"]
  ];
}

initMaze();

function drawMaze(ctx, maze) {
  const rows = maze.length;
  const cols = maze[0].length;
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cell = maze[row][col];
      let x = col * cellWidth;
      let y = row * cellHeight;
      if (cell === "W") {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, cellWidth, cellHeight);
      } else if (cell === "P") {
        // pellet (small white dot)
        ctx.fillStyle = COLORS.pellet;
        ctx.beginPath();
        ctx.arc(x + cellWidth/2, y + cellHeight/2, cellWidth / 8, 0, Math.PI*2);
        ctx.fill();
      } else if (cell === "O") {
        // power-pellet (big pink dot)
        ctx.fillStyle = COLORS.powerPellet;
        ctx.beginPath();
        ctx.arc(x + cellWidth/2, y + cellHeight/2, cellWidth / 4, 0, Math.PI*2);
        ctx.fill();
      } else if (cell === "T") {
        // tunnel: single line (draw line across cell)
        ctx.strokeStyle = COLORS.pellet;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + cellHeight/2);
        ctx.lineTo(x + cellWidth, y + cellHeight/2);
        ctx.stroke();
      } else if (cell === "F") {
        // fruit (green circle)
        ctx.fillStyle = COLORS.fruit;
        ctx.beginPath();
        ctx.arc(x + cellWidth/2, y + cellHeight/2, cellWidth / 3, 0, Math.PI*2);
        ctx.fill();
      }
      // background is already black
    }
  }
}

function drawGame(ctx) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawMaze(ctx, maze);
  // Next: drawPacman(ctx, pacman), drawGhosts(ctx, ghosts), drawHUD(ctx), etc.
}

// --- Pac-Man Object ---
function initPacman() {
  pacman = {
    row: 15,           // Start position (adjust as needed)
    col: 14,
    direction: "left", // ["up", "down", "left", "right"]
    nextDirection: "left", // Buffer for next key
    radius: (canvas.width / maze[0].length) * 0.45
  };
}

// --- Ghosts Array ---
function initGhosts() {
  ghosts = [
    {name: "blinky", color: COLORS.ghostRed,    row: 13, col: 14, direction: "left", mode: "chase"},
    {name: "pinky",  color: COLORS.ghostPink,   row: 13, col: 13, direction: "up",   mode: "scatter"},
    {name: "inky",   color: COLORS.ghostCyan,   row: 13, col: 15, direction: "right",mode: "scatter"},
    {name: "clyde",  color: COLORS.ghostOrange, row: 14, col: 14, direction: "down", mode: "scatter"}
  ];
}

function drawPacman(ctx, pacman) {
  const cellWidth  = canvas.width  / maze[0].length;
  const cellHeight = canvas.height / maze.length;
  const centerX = pacman.col * cellWidth + cellWidth/2;
  const centerY = pacman.row * cellHeight + cellHeight/2;
  // Determine mouth angle by direction
  let angleMap = {
    right: {start: 0.25, end: 1.75, rotate: 0},
    left:  {start: 1.25, end: 2.75, rotate: Math.PI},
    up:    {start: 1.75, end: 2.25, rotate: -Math.PI/2},
    down:  {start: 0.75, end: 1.25, rotate: Math.PI/2}
  };
  let angle = angleMap[pacman.direction] || angleMap["right"];
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(angle.rotate);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, pacman.radius, angle.start * Math.PI, angle.end * Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = COLORS.pacman;
  ctx.fill();
  ctx.restore();
}

function drawGhost(ctx, ghost) {
  const cellWidth  = canvas.width  / maze[0].length;
  const cellHeight = canvas.height / maze.length;
  const centerX = ghost.col * cellWidth + cellWidth/2;
  const centerY = ghost.row * cellHeight + cellHeight/2;
  const radius = cellWidth * 0.45;

  // Body
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.beginPath();
  ctx.arc(0, 0, radius, Math.PI, 2*Math.PI); // head
  ctx.lineTo(radius, radius); // right side
  // feet: zig-zag
  for (let i = 0; i < 4; i++) {
    ctx.arc(radius - i*radius/2, radius, radius/4, 0, Math.PI, true);
  }
  ctx.closePath();
  ctx.fillStyle = ghost.color;
  ctx.fill();

  // Eyes (white)
  ctx.beginPath();
  ctx.arc(-radius/3, -radius/6, radius/5, 0, Math.PI*2);
  ctx.arc( radius/3, -radius/6, radius/5, 0, Math.PI*2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  // Pupils (blue, direction-based)
  let dx = 0, dy = 0;
  switch (ghost.direction) {
    case "left":  dx = -radius/6; break;
    case "right": dx = radius/6; break;
    case "up":    dy = -radius/8; break;
    case "down":  dy = radius/8; break;
  }
  ctx.beginPath();
  ctx.arc(-radius/3 + dx, -radius/6 + dy, radius/11, 0, Math.PI*2);
  ctx.arc( radius/3 + dx, -radius/6 + dy, radius/11, 0, Math.PI*2);
  ctx.fillStyle = "#00e6ff";
  ctx.fill();

  ctx.restore();
}

function drawGame(ctx) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawMaze(ctx, maze);
  drawPacman(ctx, pacman);
  ghosts.forEach(g => drawGhost(ctx, g));
  // Next: pellets, fruit, HUD...
}


// --- Keyboard Input Handling ---
document.addEventListener('keydown', function handleInput(e) {
  const keyMap = {
    ArrowUp:    "up",
    ArrowDown:  "down",
    ArrowLeft:  "left",
    ArrowRight: "right"
  };
  if (keyMap[e.key]) {
    pacman.nextDirection = keyMap[e.key];
  }
});

// --- Move Pac-Man Logic ---
function movePacman(pacman, maze) {
  let {row, col, direction, nextDirection} = pacman;
  // Attempt to change direction if possible
  let next = tryMove(row, col, nextDirection, maze);
  if (next.valid) {
    direction = nextDirection;
    row = next.row;
    col = next.col;
  } else {
    // Move in current direction if possible
    let cur = tryMove(row, col, direction, maze);
    if (cur.valid) {
      row = cur.row;
      col = cur.col;
    }
  }
  // Handle warp tunnels (columns 0 and max)
  const maxCol = maze[0].length - 1;
  if (maze[row][col] === "T") {
    if (col === 0) col = maxCol - 1;
    if (col === maxCol) col = 1;
  }
  pacman.row = row;
  pacman.col = col;
  pacman.direction = direction;
}

// Try move returns {valid,row,col}
function tryMove(row, col, dir, maze) {
  let moveMap = {
    up:    {dr: -1, dc: 0},
    down:  {dr: 1, dc: 0},
    left:  {dr: 0, dc: -1},
    right: {dr: 0, dc: 1}
  };
  let {dr, dc} = moveMap[dir] || {dr:0, dc:0};
  let newRow = row + dr, newCol = col + dc;
  if (
    newRow >= 0 && newRow < maze.length &&
    newCol >= 0 && newCol < maze[0].length &&
    maze[newRow][newCol] !== "W"
  ) {
    return {valid: true, row: newRow, col: newCol};
  }
  return {valid: false, row, col};
}

function moveGhost(ghost, maze) {
  // For demo: move randomly - later, add proper AI
  const dirs = ["up", "down", "left", "right"];
  let dir = ghost.direction;
  let moved = false;
  for (let i = 0; i < dirs.length; i++) {
    let testDir = dirs[(dirs.indexOf(dir)+i)%dirs.length];
    let test = tryMove(ghost.row, ghost.col, testDir, maze);
    if (test.valid) {
      ghost.row = test.row;
      ghost.col = test.col;
      ghost.direction = testDir;
      moved = true;
      break;
    }
  }
  if (!moved) {
    // turn around if stuck
    ghost.direction = dirs[Math.floor(Math.random()*4)];
  }
}



function handlePelletEating() {
  const cell = maze[pacman.row][pacman.col];
  if (cell === "P") {
    maze[pacman.row][pacman.col] = ".";
    score += 10;
  } else if (cell === "O") {
    maze[pacman.row][pacman.col] = ".";
    score += 50;
    // Set ghosts to "flee" mode, implement real mode logic later
    ghosts.forEach(g => g.mode = "flee");
  }
}

function handleFruitEating() {
  // Demo: Fruit at fixed position, appears at interval (can expand)
  if (maze[pacman.row][pacman.col] === "F") {
    maze[pacman.row][pacman.col] = ".";
    score += 100;
  }
}

function handleGhostCollision() {
  ghosts.forEach(g => {
    if (g.row === pacman.row && g.col === pacman.col) {
      if (g.mode === "flee") {
        // Pac-Man eats ghost!
        score += 200;
        // Send ghost to "reset" position
        g.row = 13; g.col = 14; g.mode = "scatter";
      } else {
        // Pac-Man loses a life
        lives -= 1;
        resetPositions();
        if (lives <= 0) {
          gameState = "gameover";
        }
      }
    }
  });
}

function resetPositions() {
  pacman.row = 15; pacman.col = 14; pacman.direction = "left";
  ghosts[0].row = 13; ghosts[0].col = 14;
  ghosts[1].row = 13; ghosts[1].col = 13;
  ghosts[2].row = 13; ghosts[2].col = 15;
  ghosts[3].row = 14; ghosts[3].col = 14;
}


function drawHUD(ctx) {
  ctx.font = "bold 24px monospace";
  ctx.fillStyle = COLORS.hudText;
  ctx.textAlign = "left";
  ctx.fillText("SCORE: " + score, 16, 32);
  ctx.fillText("LIVES: " + lives, 540, 32);
  if (gameState === "gameover") {
    ctx.textAlign = "center";
    ctx.font = "bold 48px monospace";
    ctx.fillStyle = "#ff2f2f";
    ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2);
  }
}

function drawGame(ctx) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawMaze(ctx, maze);
  drawPacman(ctx, pacman);
  ghosts.forEach(g => drawGhost(ctx, g));
  drawHUD(ctx);
}

let ghostModeTimer = performance.now();
let modeInterval = 7000; // 7 seconds scatter, then chase

function updateGhostModes() {
  const now = performance.now();
  if (now - ghostModeTimer > modeInterval) {
    ghosts.forEach(g => {
      g.mode = (g.mode === "scatter") ? "chase" : "scatter";
    });
    ghostModeTimer = now;
  }
}

function moveGhost(ghost, maze) {
  let target;
  if (ghost.mode === "scatter") {
    // Assign each ghost a fixed corner
    const targets = [
      {row: 0, col: maze[0].length-1},  // Blinky (top-right)
      {row: 0, col: 0},                 // Pinky (top-left)
      {row: maze.length-1, col: maze[0].length-1}, // Inky (bottom-right)
      {row: maze.length-1, col: 0}      // Clyde (bottom-left)
    ];
    target = targets[ghosts.indexOf(ghost)];
  } else if (ghost.mode === "chase") {
    target = {row: pacman.row, col: pacman.col};
  } else {
    // Flee mode: move away from Pac-Man
    target = {row: maze.length-1 - pacman.row, col: maze[0].length-1 - pacman.col};
  }
  moveGhostTowardTarget(ghost, maze, target);
}

// Move ghost toward target grid cell
function moveGhostTowardTarget(ghost, maze, target) {
  // Calculate simple direction toward target
  let directions = ["up", "down", "left", "right"];
  let bestDir = ghost.direction;
  let minDist = Infinity;
  for (let dir of directions) {
    let test = tryMove(ghost.row, ghost.col, dir, maze);
    if (test.valid) {
      let dist = Math.abs(test.row - target.row) + Math.abs(test.col - target.col);
      if (dist < minDist) {
        minDist = dist;
        bestDir = dir;
      }
    }
  }
  let nxt = tryMove(ghost.row, ghost.col, bestDir, maze);
  if (nxt.valid) {
    ghost.row = nxt.row;
    ghost.col = nxt.col;
    ghost.direction = bestDir;
  }
}

let fruitVisible = false, fruitTimer = 0;
const fruitSpawnInterval = 20000; // every 20 seconds
const fruitDuration = 6000;       // for 6 seconds

function handleFruitSpawning() {
  if (!fruitVisible && performance.now() - fruitTimer > fruitSpawnInterval) {
    // Spawn fruit at fixed cell, e.g., maze[10][14]
    maze[10][14] = "F";
    fruitVisible = true;
    fruitTimer = performance.now();
  }
  if (fruitVisible && performance.now() - fruitTimer > fruitDuration) {
    maze[10][14] = ".";
    fruitVisible = false;
    fruitTimer = performance.now();
  }
}

let powerFleeTimer = 0;
function handlePelletEating() {
  const cell = maze[pacman.row][pacman.col];
  if (cell === "O") {
    maze[pacman.row][pacman.col] = ".";
    score += 50;
    ghosts.forEach(g => g.mode = "flee");
    powerFleeTimer = performance.now();
  } else if (cell === "P") {
    maze[pacman.row][pacman.col] = ".";
    score += 10;
  }
  // Turn off flee after timer
  if (powerFleeTimer && performance.now() - powerFleeTimer > 5000) {
    ghosts.forEach(g => g.mode = "chase");
    powerFleeTimer = 0;
  }
}

function playSound(effect) {
  // Placeholder for retro sound effects
  // e.g., pellet, eat ghost, fruit, lose life
  // Implement using WebAudio API for C64-style beeps, if desired
}



