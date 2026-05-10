window.PrismFX = (() => {
  let canvas;
  let ctx;
  let arena;
  let particles = [];
  let rings = [];

  function init(canvasElement, arenaElement) {
    canvas = canvasElement;
    ctx = canvas.getContext("2d");
    arena = arenaElement;
    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(draw);
  }

  function resize() {
    if (!canvas || !arena) return;
    const rect = arena.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function centerOf(element) {
    const arenaRect = arena.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2 - arenaRect.left, y: rect.top + rect.height / 2 - arenaRect.top };
  }

  function burstFromElement(element, count, color) {
    const point = centerOf(element);
    burst(point.x, point.y, count, color);
  }

  function burst(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1.5, life: 1, size: 2 + Math.random() * 5, color });
    }
    rings.push({ x, y, r: 4, life: 1, color });
  }

  function floatScore(text, element, color) {
    const point = centerOf(element);
    const pop = document.createElement("div");
    pop.className = "score-pop";
    pop.textContent = text;
    pop.style.left = `${point.x}px`;
    pop.style.top = `${point.y}px`;
    pop.style.color = color;
    arena.appendChild(pop);
    window.setTimeout(() => pop.remove(), 820);
  }

  function shake(target) {
    target.classList.remove("shake");
    void target.offsetWidth;
    target.classList.add("shake");
  }

  function levelPulse(target) {
    target.classList.remove("level-up");
    void target.offsetWidth;
    target.classList.add("level-up");
  }

  function draw() {
    if (!ctx || !arena) {
      requestAnimationFrame(draw);
      return;
    }
    const rect = arena.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    particles = particles.filter((particle) => particle.life > 0);
    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.08;
      particle.life -= 0.026;
      ctx.globalAlpha = Math.max(particle.life, 0);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    rings = rings.filter((ring) => ring.life > 0);
    for (const ring of rings) {
      ring.r += 4.6;
      ring.life -= 0.034;
      ctx.globalAlpha = Math.max(ring.life, 0) * 0.7;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  return { init, resize, burstFromElement, floatScore, shake, levelPulse };
})();
