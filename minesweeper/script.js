const DIFFICULTIES = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
};

let currentDiff = DIFFICULTIES.easy;
let board = [];
let mineCount = 0;
let flagCount = 0;
let firstClick = true;
let isGameOver = false;
let cellsRevealed = 0;
let timerId = null;
let seconds = 0;

const boardEl = document.getElementById('board');
const minesCountEl = document.getElementById('mines-count');
const timerEl = document.getElementById('timer');
const restartBtn = document.getElementById('restart-btn');
const difficultySelect = document.getElementById('difficulty');
const modal = document.getElementById('game-over-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const finalTimeEl = document.getElementById('final-time');
const modalRestartBtn = document.getElementById('modal-restart-btn');

function initGame() {
    clearInterval(timerId);
    seconds = 0;
    updateTimerDisplay();
    
    const selectedDiff = difficultySelect.value;
    currentDiff = DIFFICULTIES[selectedDiff];
    mineCount = currentDiff.mines;
    flagCount = 0;
    firstClick = true;
    isGameOver = false;
    cellsRevealed = 0;
    board = [];
    
    minesCountEl.textContent = mineCount;
    modal.classList.add('hidden');
    
    boardEl.style.gridTemplateColumns = `repeat(${currentDiff.cols}, 1fr)`;
    boardEl.innerHTML = '';
    
    for (let r = 0; r < currentDiff.rows; r++) {
        let row = [];
        for (let c = 0; c < currentDiff.cols; c++) {
            const cellState = {
                r, c,
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0,
                element: null
            };
            
            const cellEl = document.createElement('div');
            cellEl.classList.add('cell');
            cellEl.dataset.r = r;
            cellEl.dataset.c = c;
            
            cellEl.addEventListener('click', () => handleLeftClick(cellState));
            cellEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                handleRightClick(cellState);
            });
            
            cellState.element = cellEl;
            row.push(cellState);
            boardEl.appendChild(cellEl);
        }
        board.push(row);
    }
}

function startTimer() {
    timerId = setInterval(() => {
        seconds++;
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    timerEl.textContent = seconds.toString().padStart(3, '0');
}

function placeMines(firstClickR, firstClickC) {
    let minesPlaced = 0;
    while (minesPlaced < currentDiff.mines) {
        const r = Math.floor(Math.random() * currentDiff.rows);
        const c = Math.floor(Math.random() * currentDiff.cols);
        
        const isSafeZone = Math.abs(r - firstClickR) <= 1 && Math.abs(c - firstClickC) <= 1;
        
        if (!board[r][c].isMine && !isSafeZone) {
            board[r][c].isMine = true;
            minesPlaced++;
        }
    }
    
    for (let r = 0; r < currentDiff.rows; r++) {
        for (let c = 0; c < currentDiff.cols; c++) {
            if (!board[r][c].isMine) {
                board[r][c].neighborMines = countNeighborMines(r, c);
            }
        }
    }
}

function countNeighborMines(r, c) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < currentDiff.rows && nc >= 0 && nc < currentDiff.cols) {
                if (board[nr][nc].isMine) count++;
            }
        }
    }
    return count;
}

function handleLeftClick(cell) {
    if (isGameOver || cell.isFlagged || cell.isRevealed) return;
    
    if (firstClick) {
        placeMines(cell.r, cell.c);
        firstClick = false;
        startTimer();
    }
    
    revealCell(cell);
    checkWinCondition();
}

function handleRightClick(cell) {
    if (isGameOver || cell.isRevealed || firstClick) return;
    
    cell.isFlagged = !cell.isFlagged;
    if (cell.isFlagged) {
        cell.element.textContent = '🚩';
        cell.element.classList.add('flag');
        flagCount++;
    } else {
        cell.element.textContent = '';
        cell.element.classList.remove('flag');
        flagCount--;
    }
    
    minesCountEl.textContent = mineCount - flagCount;
}

function revealCell(cell) {
    if (cell.isRevealed || cell.isFlagged) return;
    
    cell.isRevealed = true;
    cell.element.classList.add('revealed');
    cellsRevealed++;
    
    if (cell.isMine) {
        triggerGameOver(false, cell);
        return;
    }
    
    if (cell.neighborMines > 0) {
        cell.element.textContent = cell.neighborMines;
        cell.element.dataset.value = cell.neighborMines;
    } else {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = cell.r + dr;
                const nc = cell.c + dc;
                if (nr >= 0 && nr < currentDiff.rows && nc >= 0 && nc < currentDiff.cols) {
                    revealCell(board[nr][nc]);
                }
            }
        }
    }
}

function checkWinCondition() {
    const totalSafeCells = (currentDiff.rows * currentDiff.cols) - currentDiff.mines;
    if (cellsRevealed === totalSafeCells && !isGameOver) {
        triggerGameOver(true);
    }
}

function triggerGameOver(isWin, clickedMine = null) {
    isGameOver = true;
    clearInterval(timerId);
    
    for (let r = 0; r < currentDiff.rows; r++) {
        for (let c = 0; c < currentDiff.cols; c++) {
            const cell = board[r][c];
            if (cell.isMine) {
                if (!cell.isFlagged) {
                     cell.element.classList.add('revealed', 'mine');
                     cell.element.textContent = '💣';
                }
                if (clickedMine && clickedMine.r === r && clickedMine.c === c) {
                     cell.element.style.backgroundColor = 'var(--danger-color)';
                } else if (isWin && !cell.isFlagged) {
                     cell.element.textContent = '🚩';
                }
            } else if (cell.isFlagged && !isWin) {
                cell.element.classList.add('revealed');
                cell.element.innerHTML = '❌<small style="position:absolute;font-size:0.5em;bottom:2px">💣</small>';
                cell.element.style.color = '#fff';
            }
        }
    }
    
    finalTimeEl.textContent = seconds;
    if (isWin) {
        modalTitle.textContent = '승리!';
        modalTitle.className = 'win-title';
        modalMessage.textContent = '모든 지뢰를 성공적으로 피했습니다!';
        minesCountEl.textContent = '0';
    } else {
        modalTitle.textContent = '게임 오버!';
        modalTitle.className = 'lose-title';
        modalMessage.textContent = '지뢰를 밟았습니다.';
    }
    
    setTimeout(() => {
        modal.classList.remove('hidden');
    }, 1000);
}

restartBtn.addEventListener('click', initGame);
difficultySelect.addEventListener('change', initGame);
modalRestartBtn.addEventListener('click', initGame);

document.addEventListener('contextmenu', e => {
    if(e.target.closest('.board-container')) {
        e.preventDefault();
    }
});

initGame();
