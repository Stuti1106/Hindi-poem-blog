// Kalam: a fountain-pen scrollbar. The pen moves down the page as you read, and the
// track above it fills with ink. Desktop only (fine pointer, wide window); phones,
// tablets, high-contrast mode and no-JavaScript keep the browser's own scrollbar.
(() => {
  const root = document.documentElement;
  const wanted = matchMedia("(pointer: fine) and (min-width: 900px)");
  const forcedColors = matchMedia("(forced-colors: active)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const scroller = () => document.scrollingElement || root;

  const PEN_HEIGHT = 112;
  const KEY_STEP = 60;

  // Slim berry pen, nib down; antique-gold jewel, clip, band, nib outline, breather hole and slit.
  const penSvg = `
<svg viewBox="0 0 22 112" width="22" height="${PEN_HEIGHT}" aria-hidden="true" focusable="false">
  <rect x="5" y="3" width="12" height="44" rx="6" fill="#75465A"/>
  <circle cx="11" cy="6.5" r="2.4" fill="#A9957D"/>
  <path d="M15.5 11 h2.2 v26 a1.6 1.6 0 0 1 -1.1 1.5 l-1.1 .4 z" fill="#A9957D"/>
  <rect x="4.6" y="44" width="12.8" height="3.6" rx=".8" fill="#A9957D"/>
  <rect x="5.5" y="47.6" width="11" height="31" rx="2" fill="#75465A"/>
  <rect x="5.5" y="49" width="11" height="29" rx="2" fill="#000" opacity=".08"/>
  <path d="M6.5 78.6 h9 l-1 7 h-7 z" fill="#5F3848"/>
  <path d="M7.5 85.6 h7 c0 7 -1.4 14 -3.5 22.4 c-2.1 -8.4 -3.5 -15.4 -3.5 -22.4 z" fill="#F6ECE3" stroke="#A9957D" stroke-width="1"/>
  <circle cx="11" cy="94" r="1.25" fill="#A9957D"/>
  <path d="M11 95.4 V107" stroke="#A9957D" stroke-width=".8"/>
</svg>`;

  let el, track, ink, pen, enabled = false;
  let dragging = null, writingTimer = 0, raf = 0;

  function build() {
    el = document.createElement("div");
    el.className = "kalam";
    el.innerHTML = `<div class="kalam-track"><div class="kalam-ink"></div></div>
      <div class="kalam-pen" role="scrollbar" tabindex="0" aria-orientation="vertical"
           aria-label="Page scroll" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${penSvg}</div>`;
    track = el.querySelector(".kalam-track");
    ink = el.querySelector(".kalam-ink");
    pen = el.querySelector(".kalam-pen");
    document.body.appendChild(el);

    pen.addEventListener("pointerdown", startDrag);
    el.addEventListener("pointerdown", jumpToClick);
    pen.addEventListener("keydown", onKey);
  }

  const maxScroll = () => Math.max(0, scroller().scrollHeight - innerHeight);
  const travel = () => Math.max(0, el.clientHeight - PEN_HEIGHT);
  const behavior = () => (reducedMotion.matches ? "auto" : "smooth");

  function update() {
    raf = 0;
    if (!enabled) return;
    const max = maxScroll();
    el.hidden = max < 4; // nothing to scroll
    if (el.hidden) return;
    const progress = Math.min(1, Math.max(0, scroller().scrollTop / max));
    const y = progress * travel();
    pen.style.transform = `translateY(${y}px)`;
    ink.style.height = `${y + 4}px`;
    const pct = Math.round(progress * 100);
    pen.setAttribute("aria-valuenow", String(pct));
    pen.setAttribute("aria-valuetext", `${pct}% read`);
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(update); };

  function onScroll() {
    schedule();
    // Lean the pen a little while the page moves, as if writing.
    el.classList.add("writing");
    clearTimeout(writingTimer);
    writingTimer = setTimeout(() => el.classList.remove("writing"), 220);
  }

  function startDrag(ev) {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    pen.setPointerCapture(ev.pointerId);
    dragging = { startY: ev.clientY, startScroll: scroller().scrollTop };
    el.classList.add("dragging");
    pen.addEventListener("pointermove", onDrag);
    pen.addEventListener("pointerup", endDrag, { once: true });
    pen.addEventListener("pointercancel", endDrag, { once: true });
  }
  function onDrag(ev) {
    if (!dragging) return;
    const t = travel();
    if (!t) return;
    const delta = ((ev.clientY - dragging.startY) / t) * maxScroll();
    scroller().scrollTop = dragging.startScroll + delta;
  }
  function endDrag() {
    dragging = null;
    el.classList.remove("dragging");
    pen.removeEventListener("pointermove", onDrag);
  }

  function jumpToClick(ev) {
    if (ev.button !== 0 || pen.contains(ev.target)) return;
    const rect = el.getBoundingClientRect();
    const t = travel();
    if (!t) return;
    // Centre the pen on the click point.
    const progress = Math.min(1, Math.max(0, (ev.clientY - rect.top - PEN_HEIGHT / 2) / t));
    scroller().scrollTo({ top: progress * maxScroll(), behavior: behavior() });
  }

  function onKey(ev) {
    const s = scroller();
    const moves = {
      ArrowDown: () => s.scrollBy({ top: KEY_STEP, behavior: behavior() }),
      ArrowUp: () => s.scrollBy({ top: -KEY_STEP, behavior: behavior() }),
      PageDown: () => s.scrollBy({ top: innerHeight * 0.9, behavior: behavior() }),
      PageUp: () => s.scrollBy({ top: -innerHeight * 0.9, behavior: behavior() }),
      Home: () => s.scrollTo({ top: 0, behavior: behavior() }),
      End: () => s.scrollTo({ top: maxScroll(), behavior: behavior() }),
    };
    const move = moves[ev.key];
    if (move) { ev.preventDefault(); move(); }
  }

  const resizeObserver = new ResizeObserver(schedule);

  function enable() {
    if (enabled) return;
    if (!el) build();
    enabled = true;
    el.hidden = false;
    root.classList.add("kalam-on");
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", schedule);
    resizeObserver.observe(document.body);
    schedule();
  }
  function disable() {
    if (!enabled) return;
    enabled = false;
    root.classList.remove("kalam-on");
    el.hidden = true;
    removeEventListener("scroll", onScroll);
    removeEventListener("resize", schedule);
    resizeObserver.disconnect();
  }
  const sync = () => (wanted.matches && !forcedColors.matches ? enable() : disable());

  wanted.addEventListener("change", sync);
  forcedColors.addEventListener("change", sync);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sync);
  else sync();
})();
