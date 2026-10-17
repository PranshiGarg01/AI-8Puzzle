document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const board = $("visualizerBoard"),
    prev = $("previousStepBtn"),
    play = $("playPauseBtn"),
    next = $("nextStepBtn"),
    reset = $("resetPlaybackBtn"),
    speed = $("playbackSpeed");
  let path = [],
    moves = [],
    index = 0,
    timer = null,
    playing = false;
  const notes = {
    bfs: ["Breadth-First Search", "BFS explores states in increasing depth using a queue. For equal-cost moves, its solution is shortest."],
    dfs: ["Depth-First Search", "DFS follows a branch deeply before backtracking. It does not guarantee the shortest path."],
    dls: ["Depth-Limited Search", "DLS is depth-first search with a maximum depth. It cannot find a solution deeper than the selected limit."],
    iddfs: ["Iterative Deepening DFS", "IDDFS repeats depth-limited search with increasing limits and finds a shallowest solution for equal-cost moves."],
    gbfs: ["Greedy Best-First Search", "GBFS chooses the state with the smallest heuristic h(n). It may be fast but is not guaranteed optimal."],
    astar: ["A* Search", "A* uses f(n) = g(n) + h(n), combining cost so far and estimated remaining cost. Both provided heuristics are admissible."]
  };

  function stop() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    playing = false;
    if (play) play.textContent = index >= path.length - 1 ? "✓ Finished" : (index === 0 ? "▶ Run" : "▶ Resume");
  }

  function draw(state) {
    board.innerHTML = "";
    state.forEach(tile => {
      const cell = document.createElement("div");
      cell.className = "visual-tile" + (tile === 0 ? " visual-blank" : "");
      cell.textContent = tile === 0 ? "" : tile;
      cell.setAttribute("aria-label", tile === 0 ? "Blank space" : "Tile " + tile);
      board.appendChild(cell);
    });
  }

  function update() {
    if (!path.length) return;
    draw(path[index]);
    $("visualStepCounter").textContent = `STEP ${index} / ${path.length-1}`;
    $("currentMoveMetric").textContent = index;
    $("totalMovesMetric").textContent = path.length - 1;
    $("stateTypeMetric").textContent = index === 0 ? "Initial" : index === path.length - 1 ? "Goal" : "Intermediate";
    $("visualizerCaption").textContent = index === 0 ? "Initial state — ready to begin." : `Move ${index}: slide tile ${moves[index-1]} into the blank space.`;
    prev.disabled = index === 0;
    next.disabled = index === path.length - 1;
    reset.disabled = false;
    if (index === path.length - 1 && playing) stop();
    else if (!playing) play.textContent = index === path.length - 1 ? "✓ Finished" : index === 0 ? "▶ Run" : "▶ Resume";
  }

  function go(i) {
    if (!path.length) return;
    index = Math.max(0, Math.min(i, path.length - 1));
    update();
  }

  function tick() {
    if (!playing) return;
    if (index >= path.length - 1) {
      stop();
      update();
      return;
    }
    timer = setTimeout(() => {
      index++;
      update();
      if (index < path.length - 1) tick();
      else {
        stop();
        update();
      }
    }, Number(speed.value));
  }

  function start() {
    if (!path.length) return;
    if (index >= path.length - 1) index = 0;
    playing = true;
    play.textContent = "Ⅱ Pause";
    update();
    tick();
  }

  function load(result) {
    stop();
    path = result && result.found && Array.isArray(result.path) ? result.path.map(s => s.slice()) : [];
    moves = result && Array.isArray(result.moves) ? result.moves.slice() : [];
    index = 0;
    const alg = $("algorithmSelect").value;
    const note = notes[alg] || notes.astar;
    $("algorithmNoteTitle").textContent = note[0];
    let extra = "";
    if (alg === "astar" || alg === "gbfs") extra = " Selected heuristic: " + $("heuristicSelect").selectedOptions[0].text + ".";
    if (alg === "dls" || alg === "iddfs") extra = " Selected depth limit: " + $("depthLimit").value + ".";
    $("algorithmNoteText").textContent = note[1] + extra;
    if (!path.length) {
      draw([2, 8, 3, 1, 6, 4, 7, 0, 5]);
      $("visualStepCounter").textContent = "STEP 0 / 0";
      $("visualizerCaption").textContent = "No solution path loaded. Try another algorithm or a simpler puzzle.";
      $("currentMoveMetric").textContent = "0";
      $("totalMovesMetric").textContent = "0";
      $("stateTypeMetric").textContent = "—";
      prev.disabled = next.disabled = reset.disabled = play.disabled = true;
      play.textContent = "▶ Run";
      return;
    }
    prev.disabled = next.disabled = path.length <= 1;
    reset.disabled = false;
    play.disabled = false;
    update();
  }
  prev.addEventListener("click", () => {
    stop();
    go(index - 1);
  });
  next.addEventListener("click", () => {
    stop();
    go(index + 1);
  });
  reset.addEventListener("click", () => {
    stop();
    go(0);
  });
  play.addEventListener("click", () => {
    if (playing) {
      stop();
      return;
    }
    start();
  });
  speed.addEventListener("change", () => {
    if (playing) {
      clearTimeout(timer);
      timer = null;
      tick();
    }
  });
  document.addEventListener("puzzle-search-result", e => load(e.detail));
  $("algorithmSelect").addEventListener("change", () => {
    const n = notes[$("algorithmSelect").value] || notes.astar;
    $("algorithmNoteTitle").textContent = n[0];
    $("algorithmNoteText").textContent = n[1];
  });
  draw([2, 8, 3, 1, 6, 4, 7, 0, 5]);
});