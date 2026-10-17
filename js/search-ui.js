// Connects Puzzle Lab controls to the search engine.
document.addEventListener("DOMContentLoaded", () => {
  const algorithmSelect = document.getElementById("algorithmSelect");
  const heuristicControl = document.getElementById("heuristicControl");
  const depthControl = document.getElementById("depthControl");
  const runButton = document.getElementById("runSearchBtn");
  const status = document.getElementById("searchStatus");
  const results = document.getElementById("searchResults");
  const solutionPath = document.getElementById("solutionPath");

  function syncOptions() {
    const algorithm = algorithmSelect.value;
    heuristicControl.hidden = !["gbfs", "astar"].includes(algorithm);
    depthControl.hidden = !["dls", "iddfs"].includes(algorithm);
  }

  function setStatus(kind, heading, body) {
    status.className = `search-status search-status-${kind}`;
    status.querySelector("strong").textContent = heading;
    status.querySelector("p").textContent = body;
    status.querySelector(".search-status-mark").textContent = kind === "success" ? "✓" : kind === "error" ? "!" : "▶";
  }

  function readState(id) {
    return Array.from(document.querySelectorAll(`#${id} select`)).map(select => Number(select.value));
  }

  function renderPath(path, moves) {
    solutionPath.innerHTML = "";
    path.forEach((state, index) => {
      const step = document.createElement("div");
      step.className = "solution-step";
      const label = document.createElement("div");
      label.className = "solution-step-label";
      label.textContent = index === 0 ? "START" : index === path.length - 1 ? "GOAL" : `STEP ${index}`;
      const board = document.createElement("div");
      board.className = "mini-board";
      state.forEach(tile => {
        const cell = document.createElement("span");
        cell.className = `mini-tile${tile === 0 ? " mini-blank" : ""}`;
        cell.textContent = tile === 0 ? "_" : String(tile);
        board.appendChild(cell);
      });
      const move = document.createElement("small");
      move.className = "solution-move";
      move.textContent = index === 0 ? "Initial state" : `Move ${index}: slide tile ${moves[index - 1]} into blank`;
      step.append(label, board, move);
      solutionPath.appendChild(step);
    });
  }

  function displayResult(result) {
    results.hidden = false;
    document.getElementById("resultTitle").textContent = result.found ? "Solution found!" : "Search ended";
    document.getElementById("resultBadge").textContent = result.found ? "SUCCESS" : "NO SOLUTION";
    document.getElementById("resultBadge").className = `result-badge ${result.found ? "badge-success" : "badge-error"}`;
    document.getElementById("statDepth").textContent = result.found ? result.depth : "—";
    document.getElementById("statExpanded").textContent = Number(result.expandedNodes || 0).toLocaleString();
    document.getElementById("statGenerated").textContent = Number(result.generatedNodes || 0).toLocaleString();
    document.getElementById("statFrontier").textContent = Number(result.maxFrontier || 0).toLocaleString();
    document.getElementById("statTime").textContent = `${Number(result.runtimeMs || 0).toFixed(2)} ms`;
    document.getElementById("statCost").textContent = result.found ? result.depth : "—";
    document.getElementById("pathSummary").textContent = result.found ? `${result.path.length} states · ${result.moves.length} moves` : "No path available";
    if (result.found) renderPath(result.path, result.moves);
    else {
      solutionPath.innerHTML = "";
      const note = document.createElement("p");
      note.className = "no-path-message";
      note.textContent = result.reason || "The selected search did not find a solution.";
      solutionPath.appendChild(note);
    }
    setStatus(result.found ? "success" : "error", result.found ? `${result.algorithm} COMPLETE` : `${result.algorithm || "SEARCH"} DID NOT FIND A PATH`, result.reason || "");
  }

  runButton.addEventListener("click", () => {
    if (!window.PuzzleSearch) {
      setStatus("error", "SEARCH ENGINE NOT LOADED", "Check that js/search.js is in the correct folder.");
      return;
    }
    const start = readState("initialBoard");
    const goal = readState("goalBoard");
    const algorithm = algorithmSelect.value;
    const options = {
      algorithm,
      heuristic: document.getElementById("heuristicSelect").value,
      depthLimit: Number(document.getElementById("depthLimit").value)
    };

    setStatus("info", "SEARCH RUNNING", "Exploring puzzle states…");
    results.hidden = true;
    // Search is synchronous for this milestone; worker-based/animated progress is not needed yet.
    window.setTimeout(() => {
      try {
        const result = window.PuzzleSearch.solve(start, goal, options);
        displayResult(result);
        document.dispatchEvent(new CustomEvent("puzzle-search-result", { detail: result }));
      } catch (error) {
        console.error(error);
        setStatus("error", "SEARCH ERROR", "An unexpected error occurred. Open the browser console for details.");
      }
    }, 20);
  });

  algorithmSelect.addEventListener("change", syncOptions);
  syncOptions();
});
