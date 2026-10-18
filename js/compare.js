document.addEventListener("DOMContentLoaded", () => {
    const initialEl = document.getElementById("compareInitialBoard"),
        goalEl = document.getElementById("compareGoalBoard");
    const status = document.getElementById("compareStatus"),
        tbody = document.getElementById("compareResultsBody");
    const runBtn = document.getElementById("runComparisonBtn");
    const startDefault = [1, 2, 3, 8, 4, 0, 7, 6, 5],
        goalDefault = [1, 2, 3, 8, 0, 4, 7, 6, 5];

    function createBoard(el, state, label) {
        el.innerHTML = "";
        state.forEach((v, i) => {
            const s = document.createElement("select");
            s.className = "form-select tile-select";
            s.setAttribute("aria-label", label + " position " + (i + 1));
            for (let n = 0; n <= 8; n++) {
                const o = document.createElement("option");
                o.value = n;
                o.textContent = n === 0 ? "·" : n;
                s.appendChild(o)
            }
            s.value = v;
            el.appendChild(s)
        })
    }

    function read(el) {
        return [...el.querySelectorAll("select")].map(s => Number(s.value))
    }

    function valid(a) {
        return a.length === 9 && [...a].sort((x, y) => x - y).join(",") === "0,1,2,3,4,5,6,7,8"
    }

    function setStatus(title, msg) {
        status.innerHTML = "";
        const b = document.createElement("strong");
        b.textContent = title;
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = msg;
        status.append(b, p)
    }

    function reset() {
        createBoard(initialEl, startDefault, "Initial");
        createBoard(goalEl, goalDefault, "Goal");
        tbody.innerHTML = '<tr><td colspan="7">Run a comparison to see results.</td></tr>';
        setStatus("READY TO COMPARE", "Choose a puzzle and run the comparison.")
    }

    function render(results) {
        tbody.innerHTML = "";
        results.forEach(r => {
            const tr = document.createElement("tr");
            const vals = [r.algorithm || "Search", r.found ? "Yes" : "No", r.found ? `${r.depth} / ${r.depth}` : "—", Number(r.expandedNodes || 0).toLocaleString(), Number(r.generatedNodes || 0).toLocaleString(), Number(r.maxFrontier || 0).toLocaleString(), `${Number(r.runtimeMs||0).toFixed(2)} ms`];
            vals.forEach((v, i) => {
                const td = document.createElement("td");
                td.textContent = v;
                if (i === 1) td.className = r.found ? "good" : "bad";
                tr.appendChild(td)
            });
            tbody.appendChild(tr)
        })
    }
    document.getElementById("loadDemoPuzzle").addEventListener("click", reset);
    document.getElementById("resetCompareBtn").addEventListener("click", reset);
    runBtn.addEventListener("click", () => {
        const start = read(initialEl),
            goal = read(goalEl);
        if (!valid(start) || !valid(goal)) {
            setStatus("INVALID BOARD", "Each board must contain tiles 1–8 exactly once and one blank.");
            return
        }
        if (!window.PuzzleSearch) {
            setStatus("SEARCH ENGINE MISSING", "Ensure js/search.js exists in your project.");
            return
        }
        runBtn.disabled = true;
        setStatus("COMPARISON RUNNING", "Running all six algorithms on the same states…");
        setTimeout(() => {
            try {
                const configs = [{
                    algorithm: "bfs",
                    depthLimit: 20
                }, {
                    algorithm: "dfs",
                    depthLimit: 25
                }, {
                    algorithm: "dls",
                    depthLimit: 20
                }, {
                    algorithm: "iddfs",
                    depthLimit: 20
                }, {
                    algorithm: "gbfs",
                    heuristic: "manhattan"
                }, {
                    algorithm: "astar",
                    heuristic: "manhattan"
                }];
                const results = configs.map(c => window.PuzzleSearch.solve(start, goal, c));
                render(results);
                const count = results.filter(r => r.found).length;
                setStatus("COMPARISON COMPLETE", `${count} of 6 algorithms returned a solution for this test case.`)
            } catch (e) {
                console.error(e);
                setStatus("COMPARISON ERROR", "Try a simpler puzzle and check the browser console.")
            } finally {
                runBtn.disabled = false
            }
        }, 30)
    });
    reset();
});