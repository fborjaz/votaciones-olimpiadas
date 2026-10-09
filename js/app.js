import { CURSOS, FIREBASE_CONFIG, RESULTADOS_A, RESULTADOS_TEXTO, VERSION_VOTACION } from "./config.js";

gsap.registerPlugin(ScrollTrigger);

const $ = (s) => document.querySelector(s);
const grid = $("#grid");
const statusEl = $("#voteStatus");
const MODO_PRUEBA = !FIREBASE_CONFIG.projectId;
const LS_DEVICE = "ppv_device";
const LS_VOTE = "ppv_voto";
const params = new URLSearchParams(location.search);
const motionOK = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;
const rand = (a, b) => a + Math.random() * (b - a);

// ---------- identidad del dispositivo ----------
if (localStorage.getItem("ppv_version") !== VERSION_VOTACION) { // votación reiniciada
  localStorage.removeItem(LS_VOTE);
  localStorage.removeItem(LS_DEVICE);
  localStorage.setItem("ppv_version", VERSION_VOTACION);
}
function getDeviceId() {
  let id = localStorage.getItem(LS_DEVICE);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
    localStorage.setItem(LS_DEVICE, id);
  }
  return id;
}
const deviceId = getDeviceId();
let myVote = localStorage.getItem(LS_VOTE);
let counts = Object.fromEntries(CURSOS.map((c) => [c.id, 0]));

// ---------- backend (Firebase Firestore) ----------
let backend = null;
async function initBackend() {
  if (MODO_PRUEBA) return;
  try {
    const [{ initializeApp }, fs] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"),
    ]);
    const db = fs.getFirestore(initializeApp(FIREBASE_CONFIG));
    backend = {
      async vote(cursoId) {
        await fs.setDoc(fs.doc(db, "votos", deviceId), { curso: cursoId, t: fs.serverTimestamp() });
      },
      listen(cb) {
        fs.onSnapshot(fs.collection(db, "votos"), (snap) => {
          const c = Object.fromEntries(CURSOS.map((x) => [x.id, 0]));
          snap.forEach((d) => { const k = d.data().curso; if (k in c) c[k]++; });
          cb(c, snap.docs.find((d) => d.id === deviceId)?.data().curso);
        });
      },
    };
  } catch (e) {
    console.error(e);
    toast("No se pudo conectar. Revise su internet.");
  }
}

// ---------- utilidades ----------
function placeholder(nombre) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#e6f4fd"/><rect x="30" y="30" width="740" height="540" fill="none" stroke="#12a8ee" stroke-width="6" stroke-dasharray="18 14"/><text x="400" y="290" font-family="sans-serif" font-size="64" font-weight="800" text-anchor="middle" fill="#0a2f78">${nombre}</text><text x="400" y="350" font-family="sans-serif" font-size="30" text-anchor="middle" fill="#35507f">Pancarta próximamente</text></svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}
let toastTween;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  toastTween?.kill();
  toastTween = gsap.timeline()
    .to(t, { y: 0, xPercent: 0, opacity: 1, duration: .35, ease: "back.out(1.6)" })
    .to(t, { y: 96, opacity: 0, duration: .3, delay: 3 });
}
const nombreDe = (id) => CURSOS.find((c) => c.id === id)?.nombre ?? "";

// ---------- tarjetas ----------
function buildCards() {
  grid.innerHTML = CURSOS.map((c) => `
    <article class="card" data-id="${c.id}">
      <svg class="strings" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <path d="M50 4 L5 40 M50 4 L95 40" vector-effect="non-scaling-stroke"/>
        <circle cx="50" cy="4" r="3.2"/>
      </svg>
      <button class="cloth" type="button" aria-label="Ver pancarta de ${c.nombre} en grande">
        <img src="${c.foto}" alt="Pancarta del curso ${c.nombre}" loading="lazy">
      </button>
      <div class="card-foot">
        <h3>${c.nombre}</h3>
        <button class="btn btn-gold vote-btn" type="button">Votar</button>
      </div>
    </article>`).join("");

  grid.querySelectorAll("img").forEach((img, i) => {
    img.addEventListener("error", () => { img.src = placeholder(CURSOS[i].nombre); }, { once: true });
  });
  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card");
    if (!card) return;
    const id = card.dataset.id;
    if (e.target.closest(".cloth")) openViewer(id);
    else if (e.target.closest(".vote-btn")) askVote(id);
  });
}

// ---------- visor ----------
const viewerOv = $("#viewerOv");
const confirmOv = $("#confirmOv");
let lastFocus = null;
function openOv(ov) {
  lastFocus = document.activeElement;
  ov.hidden = false;
  document.body.style.overflow = "hidden";
  ov.querySelector("button")?.focus({ preventScroll: true });
}
function closeOv(ov) {
  ov.hidden = true;
  if (viewerOv.hidden && confirmOv.hidden) document.body.style.overflow = "";
  lastFocus?.focus?.({ preventScroll: true });
}
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!confirmOv.hidden) closeOv(confirmOv);
  else if (!viewerOv.hidden) closeOv(viewerOv);
});
[viewerOv, confirmOv].forEach((ov) =>
  ov.addEventListener("click", (e) => { if (e.target === ov || e.target.closest("[data-close]")) closeOv(ov); }));
let viewerId = null;
function openViewer(id) {
  const c = CURSOS.find((x) => x.id === id);
  viewerId = id;
  const img = $("#viewerImg");
  img.src = grid.querySelector(`[data-id="${id}"] img`).src;
  img.alt = `Pancarta del curso ${c.nombre}`;
  $("#viewerName").textContent = c.nombre;
  const vb = $("#viewerVote");
  vb.style.display = myVote ? "none" : "";
  openOv(viewerOv);
  gsap.fromTo("#viewer", { scale: .9, opacity: 0 }, { scale: 1, opacity: 1, duration: .3, ease: "power3.out" });
}
$("#viewerVote").addEventListener("click", () => { closeOv(viewerOv); askVote(viewerId); });

// ---------- votar ----------
let pending = null;
function askVote(id) {
  if (myVote) return toast("Ya votó desde este celular. ¡Gracias!");
  pending = id;
  $("#confirmTitle").textContent = `¿Votar por ${nombreDe(id)}?`;
  openOv(confirmOv);
}
$("#confirmNo").addEventListener("click", () => closeOv(confirmOv));
$("#confirmYes").addEventListener("click", async () => {
  const id = pending;
  closeOv(confirmOv);
  try {
    if (backend) await backend.vote(id);
    else counts[id]++; // modo prueba
  } catch (err) {
    console.error(err);
    if (err.code === "permission-denied") {
      // ya existía un voto de este dispositivo
      toast("Este celular ya había votado.");
      return markVoted(null, true);
    }
    return toast("No se pudo guardar el voto. Intente de nuevo.");
  }
  localStorage.setItem(LS_VOTE, id);
  markVoted(id);
  celebrate(id);
});

function markVoted(id, silent) {
  if (id) myVote = id;
  document.body.classList.add("has-voted");
  grid.querySelectorAll(".card").forEach((c) => {
    c.classList.toggle("voted", c.dataset.id === myVote);
    if (c.dataset.id === myVote) c.querySelector(".vote-btn").textContent = "Su voto";
  });
  statusEl.textContent = myVote ? `Su voto: ${nombreDe(myVote)}. ¡Gracias por participar!` : "Ya votó desde este celular.";
  statusEl.classList.add("done");
  hangMedal(myVote);
  if (!revealed) $("#resultsNote").textContent = `Gracias por votar. Los números se muestran a las ${RESULTADOS_TEXTO}.`;
  refreshResults();
}
function hangMedal(id) {
  const card = id && grid.querySelector(`[data-id="${id}"]`);
  if (!card || card.querySelector(".medal-hang")) return;
  card.insertAdjacentHTML("beforeend", `<div class="medal-hang">${medalSVG("#f6c108", "#b88f00", "1")}</div>`);
  const m = card.querySelector(".medal-hang");
  if (!motionOK()) return;
  gsap.from(m, { y: -90, opacity: 0, duration: .8, ease: "bounce.out" });
  gsap.fromTo(m, { rotation: -14 }, { rotation: 14, duration: 1.6, ease: "sine.inOut", repeat: -1, yoyo: true });
}

// ---------- resultados (cronómetro + carriles) ----------
let revealed = false;
let skew = 0; // diferencia entre el reloj del celular y el del servidor
const now = () => Date.now() + skew;
async function syncClock() {
  try {
    const r = await fetch(location.pathname, { method: "HEAD", cache: "no-store" });
    const d = r.headers.get("date");
    if (d) skew = new Date(d).getTime() - Date.now();
  } catch { /* se usa el reloj del celular */ }
}
function revealResults(withConfetti) {
  if (revealed) return;
  revealed = true;
  $("#clockWrap").hidden = true;
  $("#lanesWrap").hidden = false;
  $("#resultsTitle").textContent = "Así va la carrera";
  $("#resultsNote").textContent = MODO_PRUEBA
    ? "Modo de prueba: solo se cuentan los votos de este dispositivo."
    : "Los números se actualizan en vivo.";
  renderLanes(true);
  ScrollTrigger.refresh();
  if (withConfetti && motionOK()) confettiBurst();
}
function refreshResults() { if (revealed) renderLanes(false); }

function startClock() {
  if (params.has("resultados")) return revealResults(false); // vista del organizador
  const target = params.get("prueba") ? Date.now() + (+params.get("prueba")) * 1000 : new Date(RESULTADOS_A).getTime();
  const units = Object.fromEntries([...document.querySelectorAll("#clock .unit")].map((u) => [u.dataset.u, u]));
  const last = {};
  const set = (k, v) => {
    const txt = String(v).padStart(2, "0");
    if (last[k] === txt) return;
    last[k] = txt;
    const num = units[k].querySelector(".num");
    num.textContent = txt;
    if (motionOK()) gsap.fromTo(num, { yPercent: -35, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .35, ease: "back.out(2)" });
  };
  let timer;
  const tick = () => {
    const ms = target - now();
    if (ms <= 0) { clearInterval(timer); revealResults(shown); return; }
    const sec = Math.ceil(ms / 1000);
    const d = Math.floor(sec / 86400);
    units.d.hidden = d === 0;
    if (d) set("d", d);
    set("h", Math.floor((sec % 86400) / 3600));
    set("m", Math.floor((sec % 3600) / 60));
    set("s", sec % 60);
    shown = true;
  };
  let shown = false; // si el cronómetro llegó a mostrarse, al llegar a cero hay festejo
  timer = setInterval(tick, 250);
  tick();
}
function renderLanes(animateIn) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(counts));
  const sorted = [...CURSOS].sort((a, b) => counts[b.id] - counts[a.id]);
  const ol = $("#lanes");
  if (!ol.children.length) {
    ol.innerHTML = CURSOS.map((c) => `<li class="lane" data-id="${c.id}"><div class="runner"></div><div class="label"><span><i class="rank"></i>${c.nombre}</span><span class="n">0</span></div></li>`).join("");
  }
  // reordenar con FLIP simple
  const state = new Map([...ol.children].map((el) => [el, el.getBoundingClientRect().top]));
  const medals = [["#f6c108", "#b88f00"], ["#d5dbe3", "#8c96a4"], ["#d98a4a", "#8f5527"]];
  sorted.forEach((c, i) => {
    const el = ol.querySelector(`[data-id="${c.id}"]`);
    ol.appendChild(el);
    el.classList.toggle("first", i === 0 && counts[c.id] > 0);
    el.querySelector(".rank").innerHTML = i < 3 && counts[c.id] > 0 ? medalSVG(...medals[i], String(i + 1)) : "";
  });
  [...ol.children].forEach((el) => {
    gsap.killTweensOf(el);
    gsap.set(el, { clearProps: "transform" });
    const dy = state.get(el) - el.getBoundingClientRect().top;
    if (dy) gsap.from(el, { y: dy, duration: .6, ease: "power3.out" });
  });
  sorted.forEach((c) => {
    const el = ol.querySelector(`[data-id="${c.id}"]`);
    const n = el.querySelector(".n");
    const from = +n.textContent;
    const runner = el.querySelector(".runner");
    // matar tweens previos: si no, uno viejo (ej. a 0%) pisa al nuevo
    gsap.killTweensOf(runner);
    gsap.killTweensOf(n);
    gsap.to(runner, { width: `${(counts[c.id] / max) * 100}%`, duration: animateIn ? 1.4 : .6, ease: "power3.out" });
    gsap.to(n, { duration: .8, onUpdate() { n.textContent = Math.round(gsap.utils.interpolate(from, counts[c.id], this.progress())); } });
  });
  $("#totalVotes").textContent = total;
}

// ---------- confeti ----------
function celebrate(id) {
  toast(`¡Voto registrado por ${nombreDe(id)}!`);
  confettiBurst();
  // el escudo del curso votado se asienta
  const card = grid.querySelector(`[data-id="${id}"]`);
  gsap.fromTo(card, { rotation: -4 }, { rotation: 0, duration: 1.4, ease: "elastic.out(1, .25)" });
}
function confettiBurst() {
  const cv = $("#confetti"), ctx = cv.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cols = ["#f6c108", "#12a8ee", "#d6262b", "#ffffff", "#7b55a0"];
  const ps = Array.from({ length: 140 }, () => ({
    x: cv.width / 2, y: cv.height * .6, r: (3 + Math.random() * 5) * dpr,
    c: cols[(Math.random() * cols.length) | 0], rot: Math.random() * 6,
    vx: (Math.random() - .5) * 22 * dpr, vy: (-8 - Math.random() * 16) * dpr,
  }));
  const tw = { t: 0 };
  gsap.to(tw, {
    t: 1, duration: 2.6, ease: "none",
    onUpdate() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach((p) => {
        p.vy += .5 * dpr; p.x += p.vx; p.y += p.vy; p.rot += .15; p.vx *= .99;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = 1 - tw.t * .8; ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        ctx.restore();
      });
    },
    onComplete: () => ctx.clearRect(0, 0, cv.width, cv.height),
  });
}

// ---------- decoración ----------
function medalSVG(fill, dark, n) {
  return `<svg viewBox="0 0 48 74" aria-hidden="true"><polygon points="6,0 20,0 30,36 20,36" fill="#d6262b"/><polygon points="42,0 28,0 18,36 28,36" fill="#0a2f78"/><circle cx="24" cy="52" r="20" fill="${fill}" stroke="${dark}" stroke-width="3"/><circle cx="24" cy="52" r="14.5" fill="none" stroke="${dark}" stroke-width="2" opacity=".6"/><text x="24" y="59" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="20" fill="${dark}">${n}</text></svg>`;
}
const STAR = "<svg viewBox=\"0 0 24 24\"><path d=\"M12 1.5l3 7 7.5.6-5.7 4.9 1.8 7.4L12 17.5 5.4 21.4l1.8-7.4L1.5 9.1 9 8.5z\"/></svg>";
function runnerSVG(shirt, hair) {
  const limb = (cls, x, y, l1, l2, w, c1, c2, foot) =>
    `<g transform="translate(${x} ${y})"><g class="${cls}-up"><line x2="0" y2="${l1}" stroke="${c1}" stroke-width="${w}" stroke-linecap="round"/><g transform="translate(0 ${l1})"><g class="${cls}-lo"><line x2="0" y2="${l2}" stroke="${c2}" stroke-width="${w * .9}" stroke-linecap="round"/>${foot ? `<line x1="0" y1="${l2 + 1}" x2="7" y2="${l2 + 1}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>` : ""}</g></g></g></g>`;
  const skin = "#f0b48a", shorts = "#0a2f78";
  return `<svg viewBox="0 0 64 100"><g class="bob">
    ${limb("ab", 30, 28, 13, 12, 4.5, shirt, skin)}
    ${limb("lb", 27, 55, 19, 19, 6.5, shorts, skin, true)}
    <line x1="30" y1="26" x2="27" y2="52" stroke="${shirt}" stroke-width="12" stroke-linecap="round"/>
    <line x1="27" y1="53" x2="27" y2="57" stroke="${shorts}" stroke-width="13" stroke-linecap="round"/>
    <circle cx="34" cy="13" r="8.5" fill="${skin}"/>
    <path d="M25.5 13 A8.5 8.5 0 0 1 42.5 11 Q36 5 25.5 13Z" fill="${hair}"/>
    <circle cx="38" cy="14" r="1.2" fill="#2b1a10"/>
    ${limb("lf", 27, 55, 19, 19, 6.5, shorts, skin, true)}
    ${limb("af", 30, 28, 13, 12, 4.5, shirt, skin)}
  </g></svg>`;
}
const tweens = [];
function animateRunner(el, speed) {
  const q = (c) => el.querySelector("." + c);
  const rot = (c, a) => q(c).setAttribute("transform", `rotate(${a})`);
  const lerp = (a, b, t) => a + (b - a) * t;
  const st = { p: Math.random() };
  tweens.push(gsap.to(st, {
    p: 1, duration: .34 / speed, ease: "sine.inOut", repeat: -1, yoyo: true,
    onUpdate() {
      const p = st.p;
      rot("lf-up", lerp(-52, 38, p)); rot("lf-lo", lerp(14, 105, p));
      rot("lb-up", lerp(38, -52, p)); rot("lb-lo", lerp(105, 14, p));
      rot("af-up", lerp(48, -52, p)); rot("af-lo", -78);
      rot("ab-up", lerp(-52, 48, p)); rot("ab-lo", -78);
      q("bob").setAttribute("transform", `translate(0 ${-3 * Math.sin(Math.PI * p)})`);
    },
  }));
}
function buildRunners() {
  const defs = [ // carril (0 = abajo), camiseta, pelo, alto (rem), segundos en cruzar, retraso
    { lane: 0, shirt: "#f6c108", hair: "#2b1a10", h: 6, dur: 16, delay: 0 },
    { lane: 1, shirt: "#12a8ee", hair: "#7a3b12", h: 5.4, dur: 19, delay: -9 },
    { lane: 1, shirt: "#ffffff", hair: "#2b1a10", h: 5.4, dur: 19, delay: -2 },
    { lane: 2, shirt: "#7b55a0", hair: "#c98b2b", h: 4.8, dur: 22, delay: -5 },
  ];
  const wrap = $("#runners");
  defs.forEach((d) => {
    const el = document.createElement("div");
    el.className = "runner-kid";
    el.style.height = d.h + "rem";
    el.style.bottom = (0.5 + d.lane * 2.67) + "rem";
    el.innerHTML = runnerSVG(d.shirt, d.hair);
    wrap.appendChild(el);
    animateRunner(el, 14 / d.dur + .55);
    tweens.push(gsap.fromTo(el, { x: "-12vw" }, { x: "112vw", duration: d.dur, ease: "none", repeat: -1, delay: d.delay }));
  });
  // solo corren mientras se ve la pista
  ScrollTrigger.create({
    trigger: ".hero", start: "top bottom", end: "bottom top",
    onToggle: (self) => tweens.forEach((t) => (self.isActive ? t.resume() : t.pause())),
  });
}
function buildBunting() {
  const cols = ["#f6c108", "#12a8ee", "#d6262b", "#ffffff", "#7b55a0"];
  document.querySelectorAll("[data-bunting]").forEach((el) => {
    const dark = el.classList.contains("bunting-dark");
    const n = Math.ceil(screen.width / 44) + 2;
    for (let i = 0; i < n; i++) {
      const f = document.createElement("i");
      f.className = "flag";
      f.style.background = dark && cols[i % 5] === "#ffffff" ? "#f6c108" : cols[i % 5];
      el.appendChild(f);
    }
    if (motionOK()) gsap.fromTo(el.querySelectorAll(".flag"), { rotation: -5 }, {
      rotation: 5, duration: () => rand(1.3, 2), ease: "sine.inOut", repeat: -1, yoyo: true, stagger: { each: .12, repeat: -1, yoyo: true },
    });
  });
}
function buildMedals() {
  const m = [["#f6c108", "#b88f00", "1"], ["#d5dbe3", "#8c96a4", "2"], ["#d98a4a", "#8f5527", "3"]];
  const wrap = $("#hangMedals");
  wrap.innerHTML = m.map((x) => medalSVG(...x)).join("");
  if (motionOK()) {
    gsap.from(wrap.children, { y: -140, opacity: 0, duration: 1.2, ease: "bounce.out", stagger: .15, delay: .6 });
    gsap.fromTo(wrap.children, { rotation: -9 }, { rotation: 9, duration: 2, ease: "sine.inOut", repeat: -1, yoyo: true, stagger: { each: .35, repeat: -1, yoyo: true } });
  }
}
function buildTicker() {
  const words = ["🏃 Esfuerzo", "🤝 Compañerismo", "🏅 Juego limpio", "☮️ Paz", "🥇 Respeto", "🎉 Alegría", "🏆 ¡Vamos, Paz para Vivir!"];
  const track = $("#tickerTrack");
  const row = words.map((w) => `<span>${w}</span>`).join("");
  track.innerHTML = row + row + row + row;
  if (motionOK()) gsap.to(track, { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
}
function buildStars() {
  const cols = ["#f6c108", "#12a8ee", "#d6262b", "#7b55a0"];
  document.querySelectorAll("[data-stars]").forEach((box) => {
    const n = +box.dataset.stars;
    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.className = "star";
      el.style.cssText = `left:${Math.random() < .5 ? rand(1, 7) : rand(91, 96)}%;top:${rand(4, 90)}%;--s:${rand(1.2, 2.8)}rem;`;
      el.innerHTML = STAR;
      el.querySelector("path").setAttribute("fill", cols[i % cols.length]);
      box.appendChild(el);
      if (motionOK()) gsap.to(el, { y: rand(-120, 120), rotation: rand(-90, 90), ease: "none", scrollTrigger: { trigger: box.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    }
  });
}

// ---------- animación de entrada ----------
function animate() {
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    // un solo momento: las pancartas caen colgadas y se balancean
    gsap.from(".hero h1 .line", { yPercent: 100, opacity: 0, duration: .8, stagger: .12, ease: "power4.out" });
    gsap.from(".hero-logo img", { scale: .8, opacity: 0, duration: 1.1, ease: "back.out(1.4)", delay: .2 });
    gsap.to(".hero-logo img", { y: -10, duration: 2.4, ease: "sine.inOut", repeat: -1, yoyo: true });
    gsap.from(".card", {
      scrollTrigger: { trigger: "#grid", start: "top 85%", once: true },
      y: -80, opacity: 0, rotation: () => gsap.utils.random(-9, 9),
      duration: 1.6, ease: "elastic.out(1, .35)", stagger: { each: .1, from: "random" },
    });
  });
  return mm;
}

// ---------- inicio ----------
buildCards();
animate();
buildBunting();
buildMedals();
buildTicker();
buildStars();
if (motionOK()) buildRunners();
if (matchMedia("(prefers-reduced-motion: reduce)").matches) $("#grid").style.opacity = 1;

await initBackend();
if (backend) {
  backend.listen((c, serverVote) => {
    counts = c;
    if (serverVote && !myVote) { myVote = serverVote; localStorage.setItem(LS_VOTE, serverVote); markVoted(serverVote); }
    refreshResults();
  });
}
await syncClock();
startClock();
if (myVote) markVoted(myVote);
