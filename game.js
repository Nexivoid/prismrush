const board = document.querySelector("#board");
const stage = document.querySelector("#stage");
const arena = document.querySelector(".stage-wrap");
const canvas = document.querySelector("#fx");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const comboEl = document.querySelector("#combo");
const levelEl = document.querySelector("#level");
const timeEl = document.querySelector("#time");
const messageEl = document.querySelector("#message");
const targetText = document.querySelector("#targetText");
const streakText = document.querySelector("#streakText");
const chargeText = document.querySelector("#chargeText");
const chargeBar = document.querySelector("#chargeBar");
const startButton = document.querySelector("#startButton");
const blastButton = document.querySelector("#blastButton");
const tiltButton = document.querySelector("#tiltButton");

const palette = [
  { name: "cyan", value: "#39e6ff" }, { name: "green", value: "#69f0ae" },
  { name: "gold", value: "#ffd166" }, { name: "coral", value: "#ff5b7f" },
  { name: "violet", value: "#8a7dff" }, { name: "rose", value: "#ff8cc6" },
  { name: "blue", value: "#4ca3ff" }, { name: "mint", value: "#9cffcb" }
];

const state = { score: 0, best: Number(localStorage.getItem("prismRushBest") || 0), combo: 1, level: 1, time: 60, charge: 0, running: false, autoTilt: false, target: null, activeIndex: 40, timer: null, lastHit: 0, hits: 0 };

function colorAt(index) { return palette[index % palette.length]; }
function cubes() { return [...document.querySelectorAll(".cube")]; }

function buildBoard() {
  board.innerHTML = "";
  for (let i = 0; i < 81; i += 1) {
    const cube = document.createElement("button");
    const color = colorAt(i + Math.floor(i / 9));
    cube.className = "cube";
    cube.type = "button";
    cube.dataset.index = i;
    cube.dataset.color = color.name;
    cube.dataset.kind = "normal";
    cube.style.setProperty("--cube", color.value);
    cube.setAttribute("aria-label", `${color.name} cube`);
    cube.addEventListener("click", () => hitCube(cube));
    board.appendChild(cube);
  }
  setActive(40);
  refreshBoard(true);
}

function setActive(index) {
  const all = cubes();
  const wrapped = (index + all.length) % all.length;
  all.forEach((cube) => cube.classList.remove("active"));
  all[wrapped].classList.add("active");
  all[wrapped].focus({ preventScroll: true });
  state.activeIndex = wrapped;
}

function clearSpecials() {
  cubes().forEach((cube) => {
    cube.classList.remove("hot", "hazard", "power", "wild");
    cube.dataset.kind = "normal";
    cube.setAttribute("aria-label", `${cube.dataset.color} cube`);
  });
}

function pickUnique(count, excluded = new Set()) {
  const picks = [];
  const all = cubes();
  while (picks.length < count && picks.length + excluded.size < all.length) {
    const index = Math.floor(Math.random() * all.length);
    if (!excluded.has(index) && !picks.includes(index)) picks.push(index);
  }
  return picks;
}

function refreshBoard(keepTarget = false) {
  clearSpecials();
  const all = cubes();
  const current = keepTarget && state.target ? palette.find((item) => item.name === state.target) : palette[Math.floor(Math.random() * palette.length)];
  state.target = current.name;
  const targetIndexes = [];
  all.forEach((cube, index) => {
    if (cube.dataset.color === current.name) {
      cube.classList.add("hot");
      targetIndexes.push(index);
    }
  });
  const excluded = new Set(targetIndexes);
  pickUnique(Math.min(4 + state.level, 14), excluded).forEach((index) => {
    excluded.add(index);
    all[index].classList.add("hazard");
    all[index].dataset.kind = "hazard";
    all[index].setAttribute("aria-label", "void cube");
  });
  pickUnique(2, excluded).forEach((index) => {
    excluded.add(index);
    all[index].classList.add("power");
    all[index].dataset.kind = "time";
    all[index].setAttribute("aria-label", "time power cube");
  });
  pickUnique(1, excluded).forEach((index) => {
    all[index].classList.add("wild");
    all[index].dataset.kind = "wild";
    all[index].setAttribute("aria-label", "wild prism cube");
  });
  targetText.textContent = `Target ${current.name} cubes. Gold adds time. White is wild. Dark cubes hurt.`;
}

function hitCube(cube) {
  if (!state.running) startGame();
  const now = performance.now();
  const kind = cube.dataset.kind;
  const color = getComputedStyle(cube).getPropertyValue("--cube").trim();
  const isMatch = cube.dataset.color === state.target || kind === "wild";
  const speedBonus = now - state.lastHit < 760 ? 90 : 0;
  state.lastHit = now;

  if (kind === "hazard") {
    state.combo = 1;
    state.charge = Math.max(0, state.charge - 28);
    state.time = Math.max(0, state.time - 4);
    state.score = Math.max(0, state.score - 80);
    messageEl.textContent = "Void hit. Combo shattered.";
    streakText.textContent = "Stay off the dark cubes when the board gets crowded.";
    PrismFX.shake(arena);
    PrismFX.burstFromElement(cube, 16, "#ff5b7f");
    PrismFX.floatScore("VOID", cube, "#ff5b7f");
    PrismAudio.miss();
    renderStats();
    return;
  }

  if (kind === "time") {
    state.time = Math.min(90, state.time + 6);
    state.charge = Math.min(100, state.charge + 18);
    const points = 180 * state.combo;
    state.score += points;
    messageEl.textContent = "+6 seconds. Prism charge boosted.";
    PrismFX.burstFromElement(cube, 34, "#ffd166");
    PrismFX.floatScore(`+TIME +${points}`, cube, "#ffd166");
    PrismAudio.power();
    refreshBoard(true);
    renderStats();
    return;
  }

  if (isMatch) {
    const points = 140 * state.combo + speedBonus + state.level * 20;
    state.score += points;
    state.combo = Math.min(state.combo + 1, 18);
    state.charge = Math.min(100, state.charge + 9 + state.combo);
    state.time = Math.min(90, state.time + (kind === "wild" ? 2 : 1));
    state.hits += 1;
    cube.classList.remove("burst");
    void cube.offsetWidth;
    cube.classList.add("burst");
    PrismFX.burstFromElement(cube, kind === "wild" ? 40 : 26, color || "#39e6ff");
    PrismFX.floatScore(`+${points}`, cube, color || "#39e6ff");
    PrismAudio.hit(state.combo);
    if (state.hits % 7 === 0) levelUp();
    messageEl.textContent = kind === "wild" ? "Wild prism hit. Combo protected." : `Clean hit +${points}. Keep climbing.`;
    streakText.textContent = state.combo >= 8 ? "You are in overdrive. Blast is worth more now." : "Chain target colors to build charge fast.";
    refreshBoard();
  } else {
    state.score += 25;
    state.combo = 1;
    state.charge = Math.max(0, state.charge - 10);
    messageEl.textContent = "Wrong color. Small points, combo reset.";
    streakText.textContent = "The glowing target color is where the big points live.";
    PrismFX.burstFromElement(cube, 10, color || "#ffffff");
    PrismFX.floatScore("+25", cube, "#a8adc5");
    PrismAudio.miss();
  }
  renderStats();
}

function levelUp() {
  state.level += 1;
  state.time = Math.min(90, state.time + 3);
  messageEl.textContent = `Level ${state.level}. More void cubes, bigger rewards.`;
  PrismFX.levelPulse(arena);
  PrismAudio.power();
}

function useBlast() {
  if (!state.running || state.charge < 100) return;
  const all = cubes();
  const targetCubes = all.filter((cube) => cube.dataset.color === state.target || cube.dataset.kind === "wild");
  const blastPoints = (500 + targetCubes.length * 45) * state.combo;
  state.score += blastPoints;
  state.charge = 0;
  state.combo = Math.min(18, state.combo + 2);
  state.time = Math.min(90, state.time + 4);
  targetCubes.forEach((cube) => PrismFX.burstFromElement(cube, 10, getComputedStyle(cube).getPropertyValue("--cube").trim() || "#ffffff"));
  PrismFX.floatScore(`BLAST +${blastPoints}`, targetCubes[0] || all[40], "#ffd166");
  PrismFX.shake(arena);
  PrismAudio.blast();
  messageEl.textContent = "Prism Blast cleared the target wave.";
  refreshBoard();
  renderStats();
}

function startGame() {
  PrismAudio.ensure();
  PrismAudio.start();
  state.score = 0;
  state.combo = 1;
  state.level = 1;
  state.time = 60;
  state.charge = 0;
  state.running = true;
  state.lastHit = performance.now();
  state.hits = 0;
  startButton.textContent = "Restart";
  messageEl.textContent = "Run started. Chain the glowing color.";
  refreshBoard();
  renderStats();
  clearInterval(state.timer);
  state.timer = setInterval(tick, 1000);
}

function endGame() {
  state.running = false;
  clearInterval(state.timer);
  startButton.textContent = "Start Run";
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("prismRushBest", String(state.best));
    messageEl.textContent = `New best: ${state.score.toLocaleString()}. That run had teeth.`;
  } else {
    messageEl.textContent = `Run complete. Final score: ${state.score.toLocaleString()}.`;
  }
  cubes().forEach((cube) => cube.classList.remove("hot", "hazard", "power", "wild"));
  renderStats();
}

function tick() {
  state.time -= state.level >= 6 ? 2 : 1;
  if (state.time <= 0) {
    state.time = 0;
    renderStats();
    endGame();
    return;
  }
  renderStats();
}

function renderStats() {
  scoreEl.textContent = state.score.toLocaleString();
  bestEl.textContent = state.best.toLocaleString();
  comboEl.textContent = `x${state.combo}`;
  levelEl.textContent = state.level.toString();
  timeEl.textContent = state.time.toString();
  chargeBar.style.width = `${state.charge}%`;
  blastButton.disabled = state.charge < 100 || !state.running;
  blastButton.classList.toggle("ready", state.charge >= 100 && state.running);
  chargeText.textContent = state.charge >= 100 ? "Blast ready. Fire it into the target wave." : `Prism charge ${Math.round(state.charge)}%.`;
}

function animateTilt() {
  if (state.autoTilt) {
    const t = performance.now() / 1000;
    board.style.setProperty("--rx", `${56 + Math.sin(t * 0.8) * 8}deg`);
    board.style.setProperty("--rz", `${-42 + Math.cos(t * 0.7) * 9}deg`);
  }
  requestAnimationFrame(animateTilt);
}

function steerBoard(event) {
  if (state.autoTilt) return;
  const rect = stage.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  board.style.setProperty("--rx", `${58 - y * 18}deg`);
  board.style.setProperty("--rz", `${-42 + x * 22}deg`);
}

function handleKeys(event) {
  const keyMoves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -9, ArrowDown: 9 };
  if (keyMoves[event.key]) {
    event.preventDefault();
    setActive(state.activeIndex + keyMoves[event.key]);
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    cubes()[state.activeIndex].click();
  }
  if (event.key.toLowerCase() === "b") {
    event.preventDefault();
    useBlast();
  }
}

startButton.addEventListener("click", startGame);
blastButton.addEventListener("click", useBlast);
tiltButton.addEventListener("click", () => {
  state.autoTilt = !state.autoTilt;
  tiltButton.setAttribute("aria-pressed", String(state.autoTilt));
});
stage.addEventListener("pointermove", steerBoard);
window.addEventListener("keydown", handleKeys);
document.addEventListener("contextmenu", (event) => event.preventDefault());

PrismFX.init(canvas, arena);
buildBoard();
renderStats();
animateTilt();
