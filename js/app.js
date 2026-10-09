import { CURSOS, FIREBASE_CONFIG } from "./config.js";

gsap.registerPlugin(ScrollTrigger);

const $ = (s) => document.querySelector(s);
const grid = $("#grid");
const statusEl = $("#voteStatus");
const MODO_PRUEBA = !FIREBASE_CONFIG.projectId;
const LS_DEVICE = "ppv_device";
const LS_VOTE = "ppv_voto";

// ---------- identidad del dispositivo ----------
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
const viewer = $("#viewer");
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
  viewer.showModal();
  gsap.fromTo(viewer, { scale: .9, opacity: 0 }, { scale: 1, opacity: 1, duration: .3, ease: "power3.out" });
}
viewer.addEventListener("click", (e) => { if (e.target === viewer) viewer.close(); });
$("#viewerVote").addEventListener("click", () => { viewer.close(); askVote(viewerId); });

// ---------- votar ----------
const confirmDlg = $("#confirm");
let pending = null;
function askVote(id) {
  if (myVote) return toast("Ya votó desde este celular. ¡Gracias!");
  pending = id;
  $("#confirmTitle").textContent = `¿Votar por ${nombreDe(id)}?`;
  confirmDlg.showModal();
}
$("#confirmNo").addEventListener("click", () => confirmDlg.close());
$("#confirmYes").addEventListener("click", async () => {
  const id = pending;
  confirmDlg.close();
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
  showResults();
}

// ---------- resultados (carriles) ----------
function showResults() {
  const sec = $("#resultados");
  const first = sec.hidden;
  sec.hidden = false;
  if (MODO_PRUEBA) $("#resultsNote").textContent = "Modo de prueba: solo se cuentan los votos de este dispositivo.";
  renderLanes(first);
  if (first) ScrollTrigger.refresh();
}
function renderLanes(animateIn) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(counts));
  const sorted = [...CURSOS].sort((a, b) => counts[b.id] - counts[a.id]);
  const ol = $("#lanes");
  if (!ol.children.length) {
    ol.innerHTML = CURSOS.map((c) => `<li class="lane" data-id="${c.id}"><div class="runner"></div><div class="label"><span>${c.nombre}</span><span class="n">0</span></div></li>`).join("");
  }
  // reordenar con FLIP simple
  const state = new Map([...ol.children].map((el) => [el, el.getBoundingClientRect().top]));
  sorted.forEach((c, i) => {
    const el = ol.querySelector(`[data-id="${c.id}"]`);
    ol.appendChild(el);
    el.classList.toggle("first", i === 0 && counts[c.id] > 0);
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
  // el escudo del curso votado se asienta
  const card = grid.querySelector(`[data-id="${id}"]`);
  gsap.fromTo(card, { rotation: -4 }, { rotation: 0, duration: 1.4, ease: "elastic.out(1, .25)" });
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
if (matchMedia("(prefers-reduced-motion: reduce)").matches) $("#grid").style.opacity = 1;

await initBackend();
if (backend) {
  backend.listen((c, serverVote) => {
    counts = c;
    if (serverVote && !myVote) { myVote = serverVote; localStorage.setItem(LS_VOTE, serverVote); markVoted(serverVote); }
    if (!$("#resultados").hidden) renderLanes(false);
  });
}
if (myVote) markVoted(myVote);
// El organizador puede ver los resultados sin votar: ...?resultados
if (new URLSearchParams(location.search).has("resultados")) showResults();
