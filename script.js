// ==========================
// STATE
// ==========================
let startTime = 0;
let running = false;
let interval;

let inspecting = false;
let inspectionTime = 15;
let inspectionInterval;

const solves3x3 = [];
const solves2x2 = [];

const scrambleHistory = {
  "3x3": [],
  "2x2": []
};

const scrambleIndex = {
  "3x3": -1,
  "2x2": -1
};

const timeDisplay = document.getElementById("time");

// ==========================
// SPACEBAR CONTROL (HOLD-TO-START)
// ==========================
let spaceHeld = false;
let readyToStart = false;
let holdTimer = null;
let justStartedInspection = false;

function resetReadyIndicator() {
  readyToStart = false;
  spaceHeld = false;
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  if (!running && !inspecting) {
    timeDisplay.style.color = "black";
  }
}

document.addEventListener("keydown", (e) => {
  if (e.code !== "Space") return;

  if (spaceHeld) return;
  spaceHeld = true;
  e.preventDefault();

  const useInspection = document.getElementById("inspectionToggle").checked;

  if (!running && !inspecting && useInspection) {
    justStartedInspection = true;
    startInspection();
    return;
  }

  if (!running && inspecting) {
    // While inspection is active, allow hold-to-start
    timeDisplay.style.color = "red";
    holdTimer = setTimeout(() => {
      readyToStart = true;
      timeDisplay.style.color = "green";
    }, 600);
    return;
  }

  if (running) {
    // do nothing until release to stop
    return;
  }

  // Hold-to-ready
  timeDisplay.style.color = "red";
  holdTimer = setTimeout(() => {
    readyToStart = true;
    timeDisplay.style.color = "green";
  }, 600);
});

document.addEventListener("keyup", (e) => {
  if (e.code !== "Space") return;
  if (!spaceHeld) return;
  e.preventDefault();

  if (inspecting) {
    if (justStartedInspection) {
      // first press created inspection; do not immediately stop it on release
      justStartedInspection = false;
      resetReadyIndicator();
      return;
    }

    if (readyToStart) {
      // hold-to-start during inspection finalizes to solve timer
      clearInterval(inspectionInterval);
      inspecting = false;
      startTimer();
      resetReadyIndicator();
      return;
    }

    // stop inspection and start solve according to inspection rules
    let penalty = null;
    if (inspectionTime <= 0 && inspectionTime > -2) penalty = 2;
    else if (inspectionTime <= -2) penalty = "DNF";
    stopInspectionAndStartSolve(penalty);
    resetReadyIndicator();
    return;
  }

  if (running) {
    stopTimer();
    resetReadyIndicator();
    return;
  }

  if (readyToStart) {
    startTimer();
  }

  resetReadyIndicator();
});

// ==========================
// TIMER
// ==========================
function startTimer() {
  running = true;
  startTime = Date.now();

  timeDisplay.textContent = "0.00";
  timeDisplay.style.color = "#111"; // dark text while timer runs for readability

  interval = setInterval(() => {
    let t = (Date.now() - startTime) / 1000;
    timeDisplay.textContent = t.toFixed(2);
  }, 10);
}

function stopTimer() {
  running = false;
  clearInterval(interval);

  let finalTime = (Date.now() - startTime) / 1000;
  addSolve(finalTime);
  timeDisplay.style.color = "black";
}

// ==========================
// INSPECTION (WCA CORRECT)
// ==========================
function startInspection() {
  inspecting = true;
  inspectionTime = 15;
  timeDisplay.style.color = "white";

  timeDisplay.textContent = inspectionTime;

  inspectionInterval = setInterval(() => {
    inspectionTime--;

    timeDisplay.textContent = inspectionTime;

    // Blink at 8 seconds
    if (inspectionTime <= 8) {
      timeDisplay.style.color =
        inspectionTime % 2 === 0 ? "red" : "white";
    }

  }, 1000);
}

function getCurrentMode() {
  const select = document.getElementById("puzzleType");
  return select ? select.value : "3x3";
}

function getActiveSolves() {
  return getCurrentMode() === "2x2" ? solves2x2 : solves3x3;
}

const moves = ["R", "L", "U", "D", "F", "B"];
const modifiers = ["", "'", "2"];
const axis = {
  R: "x",
  L: "x",
  U: "y",
  D: "y",
  F: "z",
  B: "z"
};

function applyScrambleText(scramble, mode) {
  scrambleHistory[mode].push(scramble);
  scrambleIndex[mode] = scrambleHistory[mode].length - 1;
  document.getElementById("scramble").textContent = scramble;
}

function generateScramble() {
  const mode = getCurrentMode();
  const length = mode === "2x2" ? 9 : 20;

  let scramble = [];
  let prevFace = null;
  let prevAxis = null;

  while (scramble.length < length) {
    let candidates = moves.filter((move) => {
      if (move === prevFace) return false;
      if (prevAxis && axis[move] === prevAxis) return false;
      return true;
    });

    if (candidates.length === 0) {
      candidates = moves.filter((move) => move !== prevFace);
    }

    let nextFace = candidates[Math.floor(Math.random() * candidates.length)];
    let nextMod = modifiers[Math.floor(Math.random() * modifiers.length)];

    scramble.push(nextFace + nextMod);
    prevFace = nextFace;
    prevAxis = axis[nextFace];
  }

  applyScrambleText(scramble.join(" "), mode);
}

function showScrambleAt(indexChange) {
  const mode = getCurrentMode();
  let current = scrambleIndex[mode];
  let candidate = current + indexChange;

  if (candidate < 0 || candidate >= scrambleHistory[mode].length) {
    return;
  }

  scrambleIndex[mode] = candidate;
  document.getElementById("scramble").textContent = scrambleHistory[mode][candidate];
}

function prevScramble() {
  showScrambleAt(-1);
}

function nextScramble() {
  const mode = getCurrentMode();
  if (scrambleIndex[mode] < scrambleHistory[mode].length - 1) {
    showScrambleAt(+1);
  } else {
    generateScramble();
  }
}

function switchPuzzleType() {
  renderSolves();
  updateStats();

  const mode = getCurrentMode();
  if (scrambleIndex[mode] >= 0) {
    document.getElementById("scramble").textContent = scrambleHistory[mode][scrambleIndex[mode]];
  } else {
    generateScramble();
  }
}


function stopInspectionAndStartSolve(penalty) {
  clearInterval(inspectionInterval);
  inspecting = false;
  timeDisplay.style.color = "white";

  startTimer();

  // Apply penalty AFTER solve is recorded
  setTimeout(() => {
    const activeSolves = getActiveSolves();
    let last = activeSolves[activeSolves.length - 1];
    if (!last) return;

    if (penalty === 2) last.plus2 = true;
    if (penalty === "DNF") last.dnf = true;

    renderSolves();
    updateStats();
  }, 0);
}


// ==========================
// SOLVE HANDLING
// ==========================
function addSolve(time) {
  const activeSolves = getActiveSolves();
  activeSolves.push({
    time: time,
    plus2: false,
    dnf: false
  });

  renderSolves();
  updateStats();
  generateScramble();
}

// Manual input
function addManual() {
  const input = document.getElementById("manualTime");
  let val = parseFloat(input.value);

  if (!isNaN(val)) {
    addSolve(val);
    input.value = "";
  }
}

// ==========================
// RENDER SOLVES
// ==========================
function renderSolves() {
  const list = document.getElementById("solves");
  list.innerHTML = "";

  const activeSolves = getActiveSolves();
  activeSolves.forEach((solve, index) => {
    let display;

    if (solve.dnf) {
      display = "DNF";
    } else {
      let t = solve.time + (solve.plus2 ? 2 : 0);
      display = t.toFixed(2) + (solve.plus2 ? " (+2)" : "");
    }

    const li = document.createElement("li");
    li.innerHTML = `
      ${display}
      <button onclick="togglePlus2(${index})">+2</button>
      <button onclick="toggleDNF(${index})">DNF</button>
      <button onclick="deleteSolve(${index})">X</button>
    `;

    list.appendChild(li);
  });
}

// ==========================
// MODIFY SOLVES
// ==========================
function togglePlus2(i) {
  const activeSolves = getActiveSolves();
  activeSolves[i].plus2 = !activeSolves[i].plus2;
  renderSolves();
  updateStats();
}

function toggleDNF(i) {
  const activeSolves = getActiveSolves();
  activeSolves[i].dnf = !activeSolves[i].dnf;
  renderSolves();
  updateStats();
}

function deleteSolve(i) {
  const activeSolves = getActiveSolves();
  activeSolves.splice(i, 1);
  renderSolves();
  updateStats();
}

// ==========================
// STATS
// ==========================

function getBest() {
  const activeSolves = getActiveSolves();
  let valid = activeSolves
    .filter(s => !s.dnf)
    .map(s => s.time + (s.plus2 ? 2 : 0));

  if (valid.length === 0) return "-";

  return Math.min(...valid).toFixed(2);
}

function average(n) {
  const activeSolves = getActiveSolves();
  if (activeSolves.length < n) return "-";

  let last = activeSolves.slice(-n);

  let values = last.map(s => {
    if (s.dnf) return Infinity;
    return s.time + (s.plus2 ? 2 : 0);
  });

  if (values.filter(v => v === Infinity).length >= 2) {
    return "DNF";
  }

  let sorted = [...values].sort((a, b) => a - b);

  sorted.pop();
  sorted.shift();

  let avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;

  return avg.toFixed(2);
}

function updateStats() {
  document.getElementById("best").textContent = getBest();
  document.getElementById("ao5").textContent = average(5);
  document.getElementById("ao12").textContent = average(12);
}

document.addEventListener("DOMContentLoaded", () => {
  generateScramble();
  updateStats();
});

window.addEventListener("DOMContentLoaded", () => {
  generateScramble();
  updateStats();
});
