// Core 8-puzzle search algorithms. Exposes PuzzleSearch to the browser.
(() => {
  "use strict";

  const keyOf = state => state.join(",");
  const sameState = (a, b) => a.every((value, index) => value === b[index]);

  function neighbours(state) {
    const blank = state.indexOf(0);
    const row = Math.floor(blank / 3);
    const col = blank % 3;
    const indexes = [];
    if (row > 0) indexes.push(blank - 3);
    if (col > 0) indexes.push(blank - 1);
    if (col < 2) indexes.push(blank + 1);
    if (row < 2) indexes.push(blank + 3);

    return indexes.map(index => {
      const next = state.slice();
      const movedTile = next[index];
      [next[blank], next[index]] = [next[index], next[blank]];
      return { state: next, move: movedTile };
    });
  }

  function makeGoalPositions(goal) {
    const positions = new Map();
    goal.forEach((tile, index) => {
      if (tile !== 0) positions.set(tile, index);
    });
    return positions;
  }

  function misplacedTiles(state, goal) {
    let count = 0;
    for (let i = 0; i < state.length; i++) {
      if (state[i] !== 0 && state[i] !== goal[i]) count++;
    }
    return count;
  }

  function manhattanDistance(state, goalPositions) {
    let total = 0;
    state.forEach((tile, index) => {
      if (tile === 0) return;
      const target = goalPositions.get(tile);
      total += Math.abs(Math.floor(index / 3) - Math.floor(target / 3));
      total += Math.abs((index % 3) - (target % 3));
    });
    return total;
  }

  function heuristic(state, goal, goalPositions, type) {
    return type === "misplaced"
      ? misplacedTiles(state, goal)
      : manhattanDistance(state, goalPositions);
  }

  function reconstruct(node) {
    const nodes = [];
    let current = node;
    while (current) {
      nodes.push(current);
      current = current.parent;
    }
    nodes.reverse();
    return {
      path: nodes.map(item => item.state),
      moves: nodes.slice(1).map(item => item.move),
      depth: nodes[nodes.length - 1].depth
    };
  }

  function resultBase(algorithm, startedAt, expanded, generated, maxFrontier) {
    return {
      algorithm,
      expandedNodes: expanded,
      generatedNodes: generated,
      maxFrontier,
      runtimeMs: performance.now() - startedAt
    };
  }

  // Small binary min-heap used by Greedy Best-First and A*.
  class MinHeap {
    constructor() { this.items = []; }
    get size() { return this.items.length; }
    push(item) {
      this.items.push(item);
      let i = this.items.length - 1;
      while (i > 0) {
        const parent = Math.floor((i - 1) / 2);
        if (this.items[parent].priority <= item.priority) break;
        this.items[i] = this.items[parent];
        i = parent;
      }
      this.items[i] = item;
    }
    pop() {
      if (!this.items.length) return null;
      const root = this.items[0];
      const last = this.items.pop();
      if (this.items.length) {
        let i = 0;
        while (true) {
          const left = i * 2 + 1;
          const right = left + 1;
          if (left >= this.items.length) break;
          let child = left;
          if (right < this.items.length && this.items[right].priority < this.items[left].priority) child = right;
          if (this.items[child].priority >= last.priority) break;
          this.items[i] = this.items[child];
          i = child;
        }
        this.items[i] = last;
      }
      return root;
    }
  }

  function breadthFirst(start, goal, options) {
    const startedAt = performance.now();
    const maxExpanded = options.maxExpanded || 150000;
    const root = { state: start.slice(), key: keyOf(start), parent: null, move: null, depth: 0 };
    const queue = [root];
    let head = 0, expanded = 0, generated = 1, maxFrontier = 1;
    const seen = new Set([root.key]);

    while (head < queue.length && expanded < maxExpanded) {
      const node = queue[head++];
      if (sameState(node.state, goal)) {
        return { ...resultBase("BFS", startedAt, expanded, generated, maxFrontier), ...reconstruct(node), found: true, reason: "Solution found." };
      }
      expanded++;
      for (const next of neighbours(node.state)) {
        const key = keyOf(next.state);
        if (seen.has(key)) continue;
        seen.add(key);
        queue.push({ state: next.state, key, parent: node, move: next.move, depth: node.depth + 1 });
        generated++;
      }
      maxFrontier = Math.max(maxFrontier, queue.length - head);
    }
    const limited = expanded >= maxExpanded;
    return { ...resultBase("BFS", startedAt, expanded, generated, maxFrontier), found: false, reason: limited ? `Safety limit reached (${maxExpanded} expanded nodes). Try A* or a simpler board.` : "No solution found." };
  }

  function depthFirst(start, goal, options) {
    const startedAt = performance.now();
    const maxExpanded = options.maxExpanded || 80000;
    const maxDepth = options.depthLimit || 35;
    const root = { state: start.slice(), key: keyOf(start), parent: null, move: null, depth: 0 };
    const stack = [root];
    const bestDepth = new Map([[root.key, 0]]);
    let expanded = 0, generated = 1, maxFrontier = 1;

    while (stack.length && expanded < maxExpanded) {
      const node = stack.pop();
      if (sameState(node.state, goal)) {
        return { ...resultBase("DFS", startedAt, expanded, generated, maxFrontier), ...reconstruct(node), found: true, reason: "Solution found. DFS does not guarantee the shortest path." };
      }
      if (node.depth >= maxDepth) continue;
      expanded++;
      const nextStates = neighbours(node.state);
      // Reverse before pushing so the traversal order stays consistent.
      for (const next of nextStates.reverse()) {
        const key = keyOf(next.state);
        const depth = node.depth + 1;
        if (bestDepth.has(key) && bestDepth.get(key) <= depth) continue;
        bestDepth.set(key, depth);
        stack.push({ state: next.state, key, parent: node, move: next.move, depth });
        generated++;
      }
      maxFrontier = Math.max(maxFrontier, stack.length);
    }
    return { ...resultBase("DFS", startedAt, expanded, generated, maxFrontier), found: false, reason: expanded >= maxExpanded ? `Safety limit reached (${maxExpanded} expanded nodes).` : `No solution found within the depth cap of ${maxDepth}.` };
  }

  function depthLimited(start, goal, limit, maxExpanded = 60000) {
    const startedAt = performance.now();
    const root = { state: start.slice(), key: keyOf(start), parent: null, move: null, depth: 0, ancestors: new Set([keyOf(start)]) };
    const stack = [root];
    let expanded = 0, generated = 1, maxFrontier = 1;

    while (stack.length && expanded < maxExpanded) {
      const node = stack.pop();
      if (sameState(node.state, goal)) {
        return { found: true, node, expanded, generated, maxFrontier, runtimeMs: performance.now() - startedAt, cutoff: false };
      }
      if (node.depth >= limit) continue;
      expanded++;
      for (const next of neighbours(node.state).reverse()) {
        const key = keyOf(next.state);
        if (node.ancestors.has(key)) continue;
        const ancestors = new Set(node.ancestors);
        ancestors.add(key);
        stack.push({ state: next.state, key, parent: node, move: next.move, depth: node.depth + 1, ancestors });
        generated++;
      }
      maxFrontier = Math.max(maxFrontier, stack.length);
    }
    return { found: false, expanded, generated, maxFrontier, runtimeMs: performance.now() - startedAt, cutoff: stack.length > 0 || expanded >= maxExpanded };
  }

  function depthLimitedSearch(start, goal, options) {
    const limit = options.depthLimit || 20;
    const data = depthLimited(start, goal, limit);
    const base = resultBase("DLS", performance.now() - data.runtimeMs, data.expanded, data.generated, data.maxFrontier);
    // runtime is measured directly above; avoid relying on the base timer for this single-run algorithm.
    base.runtimeMs = data.runtimeMs;
    if (data.found) return { ...base, ...reconstruct(data.node), found: true, reason: `Solution found within depth limit ${limit}.` };
    return { ...base, found: false, reason: data.cutoff ? `Depth limit ${limit} or safety cap reached. Increase the limit or try A*.` : `No solution exists within depth limit ${limit}.` };
  }

  function iterativeDeepening(start, goal, options) {
    const startedAt = performance.now();
    const maxDepth = options.depthLimit || 20;
    let expanded = 0, generated = 0, maxFrontier = 0;
    for (let limit = 0; limit <= maxDepth; limit++) {
      const run = depthLimited(start, goal, limit, 60000);
      expanded += run.expanded;
      generated += run.generated;
      maxFrontier = Math.max(maxFrontier, run.maxFrontier);
      if (run.found) {
        return { ...resultBase("IDDFS / IDDLS", startedAt, expanded, generated, maxFrontier), ...reconstruct(run.node), found: true, reason: `Solution found at depth ${limit}; all shallower depth limits were checked first.` };
      }
      if (expanded >= 60000) break;
    }
    return { ...resultBase("IDDFS / IDDLS", startedAt, expanded, generated, maxFrontier), found: false, reason: `No solution found up to depth limit ${maxDepth}, or the search safety cap was reached.` };
  }

  function bestFirst(start, goal, options, useAStar) {
    const startedAt = performance.now();
    const goalPositions = makeGoalPositions(goal);
    const hType = options.heuristic || "manhattan";
    const root = { state: start.slice(), key: keyOf(start), parent: null, move: null, depth: 0, g: 0 };
    const heap = new MinHeap();
    const startH = heuristic(start, goal, goalPositions, hType);
    heap.push({ node: root, priority: useAStar ? startH : startH });
    const bestG = new Map([[root.key, 0]]);
    let expanded = 0, generated = 1, maxFrontier = 1;
    const maxExpanded = options.maxExpanded || 150000;

    while (heap.size && expanded < maxExpanded) {
      const entry = heap.pop();
      const node = entry.node;
      if (bestG.get(node.key) !== node.g) continue;
      if (sameState(node.state, goal)) {
        const name = useAStar ? "A*" : "GBFS";
        return { ...resultBase(name, startedAt, expanded, generated, maxFrontier), ...reconstruct(node), found: true, reason: useAStar ? "Solution found. With these unit-cost moves and an admissible heuristic, A* finds an optimal solution." : "Solution found. Greedy Best-First prioritizes the heuristic and does not guarantee the shortest path.", heuristic: hType };
      }
      expanded++;
      for (const next of neighbours(node.state)) {
        const key = keyOf(next.state);
        const g = node.g + 1;
        if (bestG.has(key) && bestG.get(key) <= g) continue;
        bestG.set(key, g);
        const h = heuristic(next.state, goal, goalPositions, hType);
        const child = { state: next.state, key, parent: node, move: next.move, depth: node.depth + 1, g };
        heap.push({ node: child, priority: useAStar ? g + h : h });
        generated++;
      }
      maxFrontier = Math.max(maxFrontier, heap.size);
    }
    const name = useAStar ? "A*" : "GBFS";
    return { ...resultBase(name, startedAt, expanded, generated, maxFrontier), found: false, reason: expanded >= maxExpanded ? `Safety limit reached (${maxExpanded} expanded nodes). Try a simpler board.` : "No solution found.", heuristic: hType };
  }

  function solve(start, goal, options = {}) {
    if (!Array.isArray(start) || !Array.isArray(goal) || start.length !== 9 || goal.length !== 9) {
      return { found: false, reason: "Both states must contain 9 tiles." };
    }
    const valid = state => [...state].sort((a, b) => a - b).join(",") === "0,1,2,3,4,5,6,7,8";
    if (!valid(start) || !valid(goal)) return { found: false, reason: "Each state must contain 0–8 exactly once, with 0 representing the blank." };
    if (!sameState(start, goal)) {
      const goalPositions = makeGoalPositions(goal);
      const startRanked = start.filter(tile => tile !== 0).map(tile => goalPositions.get(tile));
      let inversions = 0;
      for (let i = 0; i < startRanked.length; i++) for (let j = i + 1; j < startRanked.length; j++) if (startRanked[i] > startRanked[j]) inversions++;
      if (inversions % 2 !== 0) return { found: false, reason: "This initial state cannot reach the selected goal state." };
    }
    if (sameState(start, goal)) {
      return { algorithm: options.algorithm || "A*", found: true, path: [start.slice()], moves: [], depth: 0, expandedNodes: 0, generatedNodes: 1, maxFrontier: 1, runtimeMs: 0, reason: "The initial state is already the goal state." };
    }

    switch (options.algorithm || "astar") {
      case "bfs": return breadthFirst(start, goal, options);
      case "dfs": return depthFirst(start, goal, options);
      case "dls": return depthLimitedSearch(start, goal, options);
      case "iddfs": return iterativeDeepening(start, goal, options);
      case "gbfs": return bestFirst(start, goal, options, false);
      case "astar": return bestFirst(start, goal, options, true);
      default: return { found: false, reason: "Unknown search algorithm selected." };
    }
  }

  window.PuzzleSearch = {
    solve,
    neighbours: state => neighbours(state).map(item => item.state),
    heuristics: {
      misplacedTiles,
      manhattanDistance: (state, goal) => manhattanDistance(state, makeGoalPositions(goal))
    }
  };
})();
