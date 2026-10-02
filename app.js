import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, collection, onSnapshot, setDoc, deleteDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=5";
import { DEFAULT_VIG, DEFAULT_LINES, SUBS, LAYOUT, FRONT, BEHIND, KIND, SUB_OF, apSort, distToText, parseDist } from "./dados.js?v=5";

// ---------- Distribuição ativa ----------
let VAGAS = {};     // n -> {n, sub, ap, origem}
let BY_AP = {};     // ap -> n
let AP_LIST = [];
let VIG = DEFAULT_VIG;
function applyDistribution(lines, vig) {
  VAGAS = {}; BY_AP = {};
  lines.forEach(l => { VAGAS[l.vaga] = { n: l.vaga, sub: SUB_OF[l.vaga], ap: l.ap, origem: l.origem || "Sorteio" }; BY_AP[l.ap] = l.vaga; });
  AP_LIST = Object.keys(BY_AP).sort(apSort);
  VIG = vig || DEFAULT_VIG;
}
applyDistribution(DEFAULT_LINES, DEFAULT_VIG);

// ---------- Estado ----------
let veiculos = {};   // ap -> {placa, modelo, cor, nome, obs}
let disp = {};       // ap -> {vaga, de, ate, obs}
let db = null, auth = null;
let user = null, isAdmin = false;
let myAp = loadPref() || null;
let curSub = "-5", selVaga = null, dispSub = "todos", listSub = "todos";
let unsubs = [];
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const apLabel = ap => "Ap. " + ap;
const pad = n => String(n).padStart(2, "0");
const normPlaca = s => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const semAcento = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const today = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const fmtData = s => s ? s.split("-").reverse().join("/") : "";
// versão aberta: todos com o link veem e editam (só a distribuição exige admin)
const approved = () => true;
function loadPref() { try { return localStorage.getItem("vg.ap"); } catch (e) { return null; } }
function savePref(ap) { try { localStorage.setItem("vg.ap", ap); } catch (e) {} }

function veicOf(n) { const v = VAGAS[n]; return v ? veiculos[v.ap] : null; }
function nomeOf(n) { const v = veicOf(n); return v && v.nome ? v.nome : ""; }
// disponibilidade só vale para a vaga que o apartamento tem hoje (após um rodízio, a antiga é ignorada)
function dispRaw(n) { const v = VAGAS[n]; const d = v && disp[v.ap]; return d && d.vaga === n ? d : null; }
function dispOf(n) { const d = dispRaw(n); if (!d) return null; const t = today(); return (!d.de || d.de <= t) && (!d.ate || d.ate >= t) ? d : null; }
function dispFuture(n) { const d = dispRaw(n); return d && d.ate && d.ate >= today() ? d : null; }
const isMine = n => !!myAp && VAGAS[n]?.ap === myAp;
function kindBadge(n) {
  const k = KIND[n];
  if (k === "pcd") return '<span class="badge b-pcd">PCD</span>';
  if (k === "dupla") return '<span class="badge b-dupla">Dupla</span>';
  return '<span class="badge b-livre">Livre</span>';
}
function veicTxt(v) {
  if (!approved()) return '<span class="muted">Entre para ver</span>';
  return v && v.placa ? `<span class="plate">${esc(v.placa)}</span> ${esc([v.modelo, v.cor].filter(Boolean).join(" · "))}` : '<span class="muted">Não cadastrado</span>';
}

// ---------- Mapa ----------
function renderChips(el, cur, withAll, onPick) {
  const opts = (withAll ? ["todos"] : []).concat(SUBS);
  el.innerHTML = opts.map(s => `<button class="chip num" aria-pressed="${s === cur}" data-s="${s}">${s === "todos" ? "Todos" : "Subsolo " + s}</button>`).join("");
  el.querySelectorAll("button").forEach(b => b.onclick = () => onPick(b.dataset.s));
}
function renderMap() {
  renderChips($("subChips"), curSub, false, s => { curSub = s; renderMap(); });
  const parts = [`<rect x="1" y="1" width="498" height="233" rx="6" fill="var(--concrete)" stroke="var(--line)" stroke-width="2"/>`,
    `<text x="250" y="128" text-anchor="middle" fill="var(--muted)" style="font:600 11px var(--display);letter-spacing:.3em">CORREDOR</text>`];
  LAYOUT[curSub].forEach(o => {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    const tr = o.rot ? ` transform="rotate(${o.rot} ${cx} ${cy})"` : "";
    if (!o.n) {
      parts.push(`<g${tr}><rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="var(--moto)" stroke="var(--line)"/></g>`);
      return;
    }
    const d = dispOf(o.n), mine = isMine(o.n), ve = veicOf(o.n);
    const fill = d ? "var(--disp)" : mine ? "var(--mine-bg)" : `var(--${o.kind}-bg)`;
    const stroke = d ? "var(--disp)" : mine ? "var(--mine)" : `var(--${o.kind})`;
    const sw = mine ? ' stroke-width="3"' : "";
    const txt = d ? "var(--disp-ink)" : "var(--ink)";
    const v = VAGAS[o.n];
    const label = `Vaga ${o.n}, ${v ? apLabel(v.ap) : "sem apartamento"}${mine ? ", minha vaga" : ""}${ve && ve.placa ? ", veículo " + ve.placa : ""}${d ? ", disponível hoje" : ""}`;
    const dot = ve && ve.placa ? `<circle cx="${o.x + o.w - 5.5}" cy="${o.y + 5.5}" r="3.2" fill="${txt}"/>` : "";
    parts.push(`<g class="slot${selVaga === o.n ? " sel" : ""}" tabindex="0" role="button" aria-label="${esc(label)}" data-n="${o.n}"${tr}>
      <rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="2" fill="${fill}" stroke="${stroke}"${sw}/>${dot}
      <text x="${cx}" y="${cy + 4.5}" text-anchor="middle" fill="${txt}">${pad(o.n)}</text></g>`);
  });
  $("mapbox").innerHTML = `<svg viewBox="0 0 500 235" role="img" aria-label="Planta do subsolo ${curSub}">${parts.join("")}</svg>`;
  $("mapbox").querySelectorAll(".slot").forEach(g => {
    const pick = () => selectVaga(+g.dataset.n, false);
    g.addEventListener("click", pick);
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
  });
  renderDetail();
}
function selectVaga(n, jump) {
  selVaga = n;
  if (SUB_OF[n]) curSub = SUB_OF[n];
  if (jump) showTab("mapa");
  renderMap();
  if (jump) $("detail").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function relLine(other, verb) {
  const o = VAGAS[other], ov = veicOf(other);
  const extra = approved() ? `${nomeOf(other) ? ` (${esc(nomeOf(other))})` : ""}${ov && ov.placa ? ` · <span class="plate">${esc(ov.placa)}</span> ${esc(ov.modelo || "")}` : ""}` : "";
  return `<div class="note warn">${verb} <b>vaga ${other}</b> — ${o ? apLabel(o.ap) : "sem apartamento"}${extra}</div>`;
}
function renderDetail() {
  const n = selVaga;
  if (!n) return;
  const v = VAGAS[n];
  const d = dispOf(n), df = dispFuture(n), ve = veicOf(n);
  let html = `<div class="detail-head"><span class="bignum num">Vaga ${pad(n)}</span>${kindBadge(n)}${isMine(n) ? '<span class="badge" style="color:var(--mine);border-color:var(--mine);background:var(--mine-bg)">Minha vaga</span>' : ""}${d ? '<span class="badge b-disp">Disponível hoje</span>' : ""}</div>
    <dl class="kv">
      <dt>Apartamento</dt><dd>${v ? `<b>${apLabel(v.ap)}</b>` : "Sem apartamento nesta distribuição"}</dd>
      ${approved() && nomeOf(n) ? `<dt>Morador</dt><dd>${esc(nomeOf(n))}</dd>` : ""}
      <dt>Subsolo</dt><dd class="num">${SUB_OF[n]}</dd>
      <dt>Definida por</dt><dd>${v ? (v.origem === "Sorteio" ? "Sorteio geral" : v.origem === "PCD" ? "Vaga PCD" : "Escolha prévia (PNE)") : "—"}</dd>
      <dt>Veículo</dt><dd>${veicTxt(ve)}${approved() && ve?.obs ? `<div class="muted small">${esc(ve.obs)}</div>` : ""}</dd>
    </dl>`;
  if (FRONT[n]) html += relLine(FRONT[n], "Presa pela");
  if (BEHIND[n]) html += relLine(BEHIND[n], "Bloqueia a");
  if (df) html += `<div class="note">${d ? "Disponível" : "Ficará disponível"} de ${fmtData(df.de) || "hoje"} até <b>${fmtData(df.ate)}</b>${df.obs ? ` — ${esc(df.obs)}` : ""}</div>`;
  $("detail").innerHTML = html;
}

// ---------- Busca ----------
function search(q) {
  const raw = q.trim();
  if (!raw) return [];
  const up = raw.toUpperCase().replace(/^(AP\.?|APTO|APARTAMENTO)\s*/, "");
  const found = new Set();
  const mVaga = up.match(/^VAGA\s*(\d+)$/);
  if (mVaga) { if (SUB_OF[+mVaga[1]]) found.add(+mVaga[1]); return [...found]; }
  const apNorm = up.replace(/^I\s*-?\s*/, "I-");
  AP_LIST.forEach(ap => { if (ap === apNorm || ap.replace(/^0/, "") === apNorm.replace(/^0/, "")) found.add(BY_AP[ap]); });
  if (/^\d{1,2}$/.test(up) && SUB_OF[+up]) found.add(+up);
  const p = normPlaca(raw);
  if (p.length >= 3) Object.entries(veiculos).forEach(([ap, v]) => { if (normPlaca(v.placa).includes(p) && BY_AP[ap]) found.add(BY_AP[ap]); });
  const qn = semAcento(raw);
  if (/[a-z]{3,}/.test(qn)) Object.entries(veiculos).forEach(([ap, v]) => { if (v.nome && semAcento(v.nome).includes(qn) && BY_AP[ap]) found.add(BY_AP[ap]); });
  return [...found];
}
function cardHtml(n, extra) {
  const v = VAGAS[n], ve = veicOf(n);
  const ap = v ? `<b>${apLabel(v.ap)}</b>${approved() && nomeOf(n) ? " · " + esc(nomeOf(n)) : ""}` : '<span class="muted">Sem apartamento</span>';
  return `<button class="card" data-n="${n}"><span class="n num">${pad(n)}</span>
    <span class="info"><span>${ap} · <span class="num">Subsolo ${SUB_OF[n]}</span> ${kindBadge(n)}${dispOf(n) ? ' <span class="badge b-disp">Disponível</span>' : ""}</span>
    <span class="small">${veicTxt(ve)}</span>${extra || ""}</span></button>`;
}
function bindCards(el) { el.querySelectorAll(".card").forEach(c => c.onclick = () => selectVaga(+c.dataset.n, true)); }
function renderSearch() {
  const q = $("q").value, el = $("results");
  if (!q.trim()) { el.innerHTML = ""; return; }
  const r = search(q);
  el.innerHTML = r.length ? r.map(n => cardHtml(n)).join("") : `<p class="muted small">Nada encontrado para “${esc(q)}”. Tente o número do apartamento (ex.: 101 ou I-13), da vaga, parte da placa ou o nome.</p>`;
  bindCards(el);
}

// ---------- Disponíveis ----------
function renderDisp() {
  renderChips($("dispChips"), dispSub, true, s => { dispSub = s; renderDisp(); });
  const el = $("dispList");
  if (!approved()) { el.innerHTML = '<p class="muted">Entre com sua conta de morador aprovado para ver as vagas disponíveis.</p>'; return; }
  const ns = Object.keys(VAGAS).map(Number).filter(n => dispOf(n) && (dispSub === "todos" || SUB_OF[n] === dispSub)).sort((a, b) => a - b);
  el.innerHTML = ns.length ? ns.map(n => { const d = dispOf(n); return cardHtml(n, `<span class="small">Até <b class="num">${fmtData(d.ate)}</b>${d.obs ? " — " + esc(d.obs) : ""}</span>`); }).join("")
    : `<p class="muted">Nenhuma vaga marcada como disponível hoje${dispSub !== "todos" ? " no subsolo " + dispSub : ""}. Quem quiser emprestar a vaga marca o período na aba Minha unidade.</p>`;
  bindCards(el);
}

// ---------- Lista ----------
function renderList() {
  renderChips($("listChips"), listSub, true, s => { listSub = s; renderList(); });
  const rows = AP_LIST.map(ap => BY_AP[ap]).filter(n => listSub === "todos" || SUB_OF[n] === listSub);
  $("listBody").innerHTML = rows.map(n => {
    const v = VAGAS[n], ve = veicOf(n), ok = approved();
    return `<tr data-n="${n}"><td><b>${esc(v.ap)}</b></td><td>${ok && nomeOf(n) ? esc(nomeOf(n)) : '<span class="muted">—</span>'}</td><td class="num">${pad(n)}</td><td class="num">${SUB_OF[n]}</td><td>${kindBadge(n)}</td>
      <td>${ok && ve && ve.placa ? `<span class="plate">${esc(ve.placa)}</span> ${esc(ve.modelo || "")}` : '<span class="muted">—</span>'}</td>
      <td>${dispOf(n) ? '<span class="badge b-disp">Disponível</span>' : ""}</td></tr>`;
  }).join("");
  $("listBody").querySelectorAll("tr").forEach(tr => tr.onclick = () => selectVaga(+tr.dataset.n, true));
}

// ---------- Minha unidade ----------
// O morador digita apartamento e vaga; o app confere com a distribuição antes de liberar o cadastro.
function normAp(txt) {
  const up = String(txt || "").trim().toUpperCase().replace(/^(AP\.?|APTO|APARTAMENTO)\s*/, "").replace(/^I\s*-?\s*/, "I-");
  return AP_LIST.find(ap => ap === up || ap.replace(/^0+/, "") === up.replace(/^0+/, "")) || null;
}
function renderUnid(fillForms) {
  const ap = myAp && BY_AP[myAp] ? myAp : null, n = ap ? BY_AP[ap] : null;
  $("unidPick").hidden = !!ap;
  $("unidForms").hidden = !ap;
  if (!ap) {
    $("unidInfo").innerHTML = "";
    return;
  }
  $("unidInfo").innerHTML = cardHtml(n);
  bindCards($("unidInfo"));
  if (fillForms) {
    const v = veiculos[ap] || {};
    $("vPlaca").value = v.placa || ""; $("vModelo").value = v.modelo || ""; $("vCor").value = v.cor || ""; $("vObs").value = v.obs || ""; $("vNome").value = v.nome || "";
    const d = dispFuture(n) || {};
    $("dDe").value = d.de || ""; $("dAte").value = d.ate || ""; $("dObs").value = d.obs || "";
    $("vStatus").textContent = ""; $("dStatus").textContent = "";
  }
  $("vDel").hidden = !veiculos[ap];
  $("dDel").hidden = !dispRaw(n);
  const pode = !!db;
  ["vPlaca", "vModelo", "vCor", "vObs", "vNome", "vSave", "vDel", "dDe", "dAte", "dObs", "dSave", "dDel"].forEach(id => $(id).disabled = !pode);
  const ro = $("roNote");
  ro.hidden = pode;
  ro.textContent = "Sem conexão com o banco de dados. Verifique a internet e recarregue a página.";
}
$("fUnid").addEventListener("submit", e => {
  e.preventDefault();
  const st = $("unStatus");
  const ap = normAp($("unAp").value);
  const vaga = parseInt(String($("unVaga").value).replace(/\D/g, ""), 10);
  if (!$("unAp").value.trim()) { st.textContent = "Digite o número do seu apartamento."; return; }
  if (!ap) { st.textContent = `Não encontrei o apartamento "${$("unAp").value.trim()}". Digite só o número, por exemplo 116 ou I-13.`; return; }
  if (!vaga) { st.textContent = "Digite o número da sua vaga."; return; }
  if (BY_AP[ap] !== vaga) {
    st.textContent = `Pela distribuição atual, a vaga do ${apLabel(ap)} é a ${pad(BY_AP[ap])} (Subsolo ${SUB_OF[BY_AP[ap]]}), não a ${pad(vaga)}. Confira o número; se a lista estiver errada, fale com o administrador.`;
    return;
  }
  st.textContent = "";
  myAp = ap; savePref(ap);
  renderUnid(true); renderMap();
});
$("unTrocar").addEventListener("click", e => {
  e.preventDefault();
  $("unAp").value = ""; $("unVaga").value = ""; $("unStatus").textContent = "";
  myAp = null; savePref("");
  renderUnid(true); renderMap();
  $("unAp").focus();
});
async function guarded(statusEl, fn, okMsg) {
  if (!db) { statusEl.textContent = "O app ainda não está ligado ao banco de dados."; return; }
  statusEl.textContent = "Salvando…";
  try { await fn(); statusEl.textContent = okMsg; }
  catch (e) {
    statusEl.textContent = e && e.code === "permission-denied" ? "Algum campo está fora do formato. Confira a placa (7 caracteres) e tente de novo." : "Não foi possível salvar agora. Tente de novo em alguns segundos.";
  }
}
$("fVeic").addEventListener("submit", e => {
  e.preventDefault();
  const ap = myAp;
  const placa = normPlaca($("vPlaca").value);
  const nome = $("vNome").value.trim();
  if (!nome) { $("vStatus").textContent = "Informe seu nome, para os vizinhos saberem de quem é o carro."; return; }
  if (placa.length !== 7) { $("vStatus").textContent = "A placa precisa ter 7 caracteres (ex.: ABC1D23)."; return; }
  const body = { placa, nome, modelo: $("vModelo").value.trim(), cor: $("vCor").value.trim(), obs: $("vObs").value.trim(), atualizadoEm: serverTimestamp() };
  guarded($("vStatus"), () => setDoc(doc(db, "veiculos", ap), body), "Veículo salvo.");
});
$("vDel").addEventListener("click", () => {
  guarded($("vStatus"), () => deleteDoc(doc(db, "veiculos", myAp)), "Veículo removido.");
});
$("fDisp").addEventListener("submit", e => {
  e.preventDefault();
  const ap = myAp, n = BY_AP[ap];
  const de = $("dDe").value || today(), ate = $("dAte").value;
  if (!ate) { $("dStatus").textContent = "Informe até quando a vaga fica disponível."; return; }
  if (ate < de) { $("dStatus").textContent = "A data final precisa ser igual ou depois da inicial."; return; }
  if (ate < today()) { $("dStatus").textContent = "A data final já passou."; return; }
  const body = { vaga: n, de, ate, obs: $("dObs").value.trim(), atualizadoEm: serverTimestamp() };
  guarded($("dStatus"), () => setDoc(doc(db, "disponivel", ap), body), `Vaga ${n} marcada como disponível até ${fmtData(ate)}.`);
});
$("dDel").addEventListener("click", () => {
  guarded($("dStatus"), () => deleteDoc(doc(db, "disponivel", myAp)), "Disponibilidade removida.");
});

// ---------- Distribuição (admin) ----------
function fillDistForm() { $("distVig").value = VIG; $("distTxt").value = distToText(Object.values(VAGAS).map(v => ({ ap: v.ap, vaga: v.n, origem: v.origem }))); }
$("distCheck").addEventListener("click", () => {
  const r = parseDist($("distTxt").value);
  $("distStatus").textContent = r.errs.length ? r.errs.slice(0, 5).join(" ") : `${r.lines.length} apartamentos conferidos, sem repetição. ${r.aviso}`;
});
$("fDist").addEventListener("submit", e => {
  e.preventDefault();
  const r = parseDist($("distTxt").value);
  if (r.errs.length) { $("distStatus").textContent = r.errs.slice(0, 5).join(" "); return; }
  if (!r.lines.length) { $("distStatus").textContent = "A lista está vazia."; return; }
  const vig = $("distVig").value.trim() || VIG;
  guarded($("distStatus"), () => setDoc(doc(db, "config", "distribuicao"), { vigencia: vig, linhas: r.lines, atualizadoEm: serverTimestamp() }),
    `Distribuição salva: ${r.lines.length} apartamentos.`);
});
$("distReset").addEventListener("click", () => guarded($("distStatus"), () => deleteDoc(doc(db, "config", "distribuicao")), "Voltou para a distribuição padrão do código."));

// ---------- Abas ----------
const TABS = ["mapa", "disp", "lista", "unid", "admin"];
function showTab(t) {
  document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-selected", b.dataset.tab === t));
  TABS.forEach(p => $("p-" + p).hidden = p !== t);
}
document.querySelectorAll(".tabs button").forEach(b => b.onclick = () => showTab(b.dataset.tab));
if (["mapa", "disp", "lista", "unid"].includes(location.hash.slice(1))) showTab(location.hash.slice(1));

// ---------- Render ----------
function renderHeader() {
  $("vigencia").textContent = "Vigência " + VIG;
  $("contagem").textContent = AP_LIST.length + " vagas · Subsolos -5, -6 e -7";
}
function renderAuth() {
  $("btnLogin").hidden = !!user || !db;
  $("adminInfo").hidden = !user;
  $("t-admin").hidden = !isAdmin;
  if (user) $("authSub").textContent = isAdmin ? "Administrador: " + (user.email || "") : "Conta sem permissão de administrador";
}
function renderAll() { renderHeader(); renderAuth(); renderMap(); renderDisp(); renderList(); renderSearch(); renderUnid(false); }

let qTimer; $("q").addEventListener("input", () => { clearTimeout(qTimer); qTimer = setTimeout(renderSearch, 120); });

// ---------- Firebase ----------
function startData() {
  let first = true;
  onSnapshot(collection(db, "veiculos"), s => {
    veiculos = {}; s.forEach(d => veiculos[d.id] = d.data()); renderAll(); if (first) { first = false; renderUnid(true); }
  }, () => { const n = $("dbNote"); n.hidden = false; n.textContent = "Não foi possível carregar os veículos. Recarregue a página."; });
  onSnapshot(collection(db, "disponivel"), s => {
    disp = {}; s.forEach(d => disp[d.id] = d.data()); renderAll();
  }, () => {});
}

renderAll();
renderUnid(true);

const configured = firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("COLE");
if (configured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  $("btnLogin").onclick = e => { e.preventDefault(); signInWithPopup(auth, new GoogleAuthProvider()).catch(() => {}); };
  $("btnLogout").onclick = e => { e.preventDefault(); signOut(auth); };

  // distribuição: pública
  onSnapshot(doc(db, "config", "distribuicao"), s => {
    const d = s.exists() ? s.data() : null;
    if (d && Array.isArray(d.linhas) && d.linhas.length) applyDistribution(d.linhas.filter(l => l && l.ap && SUB_OF[l.vaga]), d.vigencia);
    else applyDistribution(DEFAULT_LINES, DEFAULT_VIG);
    if (myAp && !BY_AP[myAp]) myAp = null;
    renderAll(); renderUnid(true);
    if (isAdmin) fillDistForm();
  }, () => {});

  startData();
  onAuthStateChanged(auth, async u => {
    user = u; isAdmin = false;
    if (u) { try { isAdmin = (await getDoc(doc(db, "admins", u.uid))).exists(); } catch (e) { isAdmin = false; } }
    if (isAdmin) fillDistForm();
    else if ($("p-admin").hidden === false) showTab("mapa");
    renderAll();
  });
} else {
  const n = $("dbNote"); n.hidden = false; n.textContent = "O app ainda não está ligado ao Firebase: só o mapa está disponível.";
  renderAll();
}
