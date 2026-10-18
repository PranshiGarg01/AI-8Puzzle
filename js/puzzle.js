// Puzzle input, validation, and solvable random-state generation.
document.addEventListener("DOMContentLoaded", () => {
  const DEFAULT_INITIAL = [2, 8, 3, 1, 6, 4, 7, 0, 5];
  const DEFAULT_GOAL = [1, 2, 3, 8, 0, 4, 7, 6, 5];
  const VALUES = [{
      value: "0",
      label: "_"
    },
    {
      value: "1",
      label: "1"
    },
    {
      value: "2",
      label: "2"
    },
    {
      value: "3",
      label: "3"
    },
    {
      value: "4",
      label: "4"
    },
    {
      value: "5",
      label: "5"
    },
    {
      value: "6",
      label: "6"
    },
    {
      value: "7",
      label: "7"
    },
    {
      value: "8",
      label: "8"
    }
  ];

  const initialBoard = document.getElementById("initialBoard");
  const goalBoard = document.getElementById("goalBoard");
  const panel = document.getElementById("validationPanel");
  const title = document.getElementById("validationTitle");
  const message = document.getElementById("validationMessage");
  const icon = document.getElementById("validationIcon");

  function makeBoard(container, state, name) {
    container.innerHTML = "";
    state.forEach((tile, index) => {
      const select = document.createElement("select");
      select.className = "tile-select" + (tile === 0 ? " blank-select" : "");
      select.setAttribute("aria-label", `${name} row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}`);
      select.dataset.index = String(index);
      VALUES.forEach(optionData => {
        const option = document.createElement("option");
        option.value = optionData.value;
        option.textContent = optionData.label;
        select.appendChild(option);
      });
      select.value = String(tile);
      select.addEventListener("change", () => {
        select.classList.toggle("blank-select", select.value === "0");
        setMessage("info", "Board edited", "Remember to validate the puzzle before running a search.");
        updateCellCounts();
      });
      container.appendChild(select);
    });
  }

  function readBoard(container) {
    return Array.from(container.querySelectorAll("select")).map(select => Number(select.value));
  }

  function updateBoard(container, state, name) {
    makeBoard(container, state, name);
    updateCellCounts();
  }

  function updateCellCounts() {
    document.getElementById("initialCount").textContent = `${readBoard(initialBoard).filter(n => n !== 0).length} numbered tiles + blank`;
    document.getElementById("goalCount").textContent = `${readBoard(goalBoard).filter(n => n !== 0).length} numbered tiles + blank`;
  }

  function setMessage(type, heading, body) {
    panel.className = `validation-panel validation-${type}`;
    title.textContent = heading;
    message.textContent = body;
    icon.textContent = type === "success" ? "✓" : type === "error" ? "!" : "i";
  }

  function validateBoard(state, label) {
    if (state.length !== 9) return `${label} must contain exactly 9 cells.`;
    const expected = "0,1,2,3,4,5,6,7,8";
    const actual = [...state].sort((a, b) => a - b).join(",");
    if (actual !== expected) return `${label} must contain 1–8 exactly once and one blank tile (_).`;
    return null;
  }

  // Rank each nonblank tile by its position in the chosen goal, then count inversions.
  // For a 3x3 puzzle, initial and goal states are mutually reachable iff this parity is even.
  function inversionParityRelativeToGoal(initial, goal) {
    const goalRank = new Map();
    let rank = 0;
    goal.forEach(tile => {
      if (tile !== 0) goalRank.set(tile, rank++);
    });
    const ranked = initial.filter(tile => tile !== 0).map(tile => goalRank.get(tile));
    let inversions = 0;
    for (let i = 0; i < ranked.length; i++) {
      for (let j = i + 1; j < ranked.length; j++) {
        if (ranked[i] > ranked[j]) inversions++;
      }
    }
    return inversions % 2;
  }

  function validatePuzzle() {
    const initial = readBoard(initialBoard);
    const goal = readBoard(goalBoard);
    const initialError = validateBoard(initial, "Initial state");
    if (initialError) {
      setMessage("error", "Initial state needs fixing", initialError);
      return false;
    }
    const goalError = validateBoard(goal, "Goal state");
    if (goalError) {
      setMessage("error", "Goal state needs fixing", goalError);
      return false;
    }
    if (inversionParityRelativeToGoal(initial, goal) !== 0) {
      setMessage("error", "This puzzle is unsolvable", "The initial and goal states have different solvability parity. Edit a tile or generate a new puzzle.");
      return false;
    }
    if (initial.every((tile, index) => tile === goal[index])) {
      setMessage("success", "Already solved!", "Your initial state is identical to the goal state. The solution requires 0 moves.");
      return true;
    }
    setMessage("success", "Puzzle is valid and solvable!", "Both boards are valid and the initial state can reach this goal. Ready for search-algorithm integration.");
    return true;
  }

  function getNeighbours(state) {
    const blankIndex = state.indexOf(0);
    const row = Math.floor(blankIndex / 3);
    const col = blankIndex % 3;
    const nextIndexes = [];
    if (row > 0) nextIndexes.push(blankIndex - 3);
    if (row < 2) nextIndexes.push(blankIndex + 3);
    if (col > 0) nextIndexes.push(blankIndex - 1);
    if (col < 2) nextIndexes.push(blankIndex + 1);
    return nextIndexes.map(nextIndex => {
      const next = state.slice();
      [next[blankIndex], next[nextIndex]] = [next[nextIndex], next[blankIndex]];
      return next;
    });
  }

  function generateRandomSolvable() {
    const goal = readBoard(goalBoard);
    const goalError = validateBoard(goal, "Goal state");
    if (goalError) {
      setMessage("error", "Fix the goal state first", goalError);
      return;
    }

    // Walk away from the goal using legal moves; this guarantees solvability.
    let state = goal.slice();
    let previousKey = "";
    const moves = 30 + Math.floor(Math.random() * 31);
    for (let i = 0; i < moves; i++) {
      const neighbours = getNeighbours(state);
      const choices = neighbours.filter(next => next.join(",") !== previousKey);
      const next = choices[Math.floor(Math.random() * choices.length)];
      previousKey = state.join(",");
      state = next;
    }

    if (state.every((tile, index) => tile === goal[index])) {
      const choices = getNeighbours(state);
      state = choices[Math.floor(Math.random() * choices.length)];
    }
    updateBoard(initialBoard, state, "Initial state");
    validatePuzzle();
    setMessage("success", "Random solvable puzzle generated!", `A new board was created by ${moves} legal moves from your goal, so a solution exists.`);
  }

  document.getElementById("randomBtn").addEventListener("click", generateRandomSolvable);
  document.getElementById("validateBtn").addEventListener("click", validatePuzzle);
  document.getElementById("swapBtn").addEventListener("click", () => {
    const initial = readBoard(initialBoard);
    const goal = readBoard(goalBoard);
    updateBoard(initialBoard, goal, "Initial state");
    updateBoard(goalBoard, initial, "Goal state");
    setMessage("info", "States swapped", "The initial and goal boards have been exchanged. Validate them before proceeding.");
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    updateBoard(initialBoard, DEFAULT_INITIAL, "Initial state");
    updateBoard(goalBoard, DEFAULT_GOAL, "Goal state");
    setMessage("info", "Default puzzle restored", "The example initial and goal states from the assignment have been restored.");
  });

  makeBoard(initialBoard, DEFAULT_INITIAL, "Initial state");
  makeBoard(goalBoard, DEFAULT_GOAL, "Goal state");
  updateCellCounts();
  setMessage("info", "Ready to configure", "Choose a value in each cell. Use “_” to represent the blank tile.");
});