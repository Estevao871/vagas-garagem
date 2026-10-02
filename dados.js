// Distribuição padrão (resumo da AGE de 12/09/2026) e planta dos subsolos.
// Para um novo rodízio sem mexer no código, use a aba "Distribuição" do app (admin).

// Apto:Vaga[:Origem] — Origem: PCD, PNE ou vazio (sorteio geral)
const RAW = `102:63:PCD|106:31:PCD|112:30:PCD|21:3:PNE|31:2:PNE|62:67:PNE|136:35:PNE|I-36:6:PNE|
01:17|02:53|03:81|04:68|05:14|06:4|11:78|12:69|13:8|14:50|15:24|16:77|22:45|23:54|24:39|25:37|26:27|
32:42|33:16|34:36|35:80|36:7|41:86|42:94|43:5|44:91|45:72|46:79|51:47|52:1|53:62|54:25|55:32|56:23|
61:22|63:49|64:82|65:12|66:29|71:48|72:58|73:34|74:90|75:89|76:93|81:44|82:18|83:26|84:59|85:64|86:87|
91:52|92:74|93:15|94:55|95:9|96:88|101:57|103:33|104:38|105:85|111:46|113:61|114:40|115:66|116:75|
121:21|122:70|123:19|124:43|125:65|126:13|131:71|132:51|133:41|134:56|135:83|
I-13:60|I-14:84|I-15:20|I-16:92|I-23:76|I-24:11|I-25:28|I-26:10|I-35:73`;

export const DEFAULT_VIG = "out/2026 – set/2028";
export const DEFAULT_LINES = RAW.replace(/\s+/g, "").split("|").filter(Boolean).map(s => {
  const [ap, n, origem] = s.split(":");
  return { ap, vaga: +n, origem: origem || "Sorteio" };
});

// ---------- Planta (posições aproximadas do mapa oficial, viewBox 500x235) ----------
export const SUBS = ["-5", "-6", "-7"];
export const LAYOUT = { "-5": [], "-6": [], "-7": [] };
export const FRONT = {};   // vaga do fundo -> vaga da frente
export const BEHIND = {};  // vaga da frente -> vaga do fundo
function slot(sub, n, x, y, w, h, kind, rot) { LAYOUT[sub].push({ n, x, y, w, h, kind, rot: rot || 0 }); }
function pairRows(sub, top, bottom, x0, cw) {
  top.forEach((n, i) => slot(sub, n, x0 + i * cw, 12, cw, 44, "dupla"));
  bottom.forEach((n, i) => slot(sub, n, x0 + i * cw, 56, cw, 44, "dupla"));
  top.forEach((n, i) => { const f = bottom[i]; if (n && f) { FRONT[n] = f; BEHIND[f] = n; } });
}
const range = (a, b) => { const r = []; for (let i = a; i <= b; i += 2) r.push(i); return r; };
// -5
pairRows("-5", [...range(9, 29), 60], [...range(8, 28), 7], 4, 27.5);
[[356, 6], [378, 6], [400, 6], [422, 6]].forEach(([x, y]) => slot("-5", null, x, y, 22, 24, "moto"));
[[466, 6], [466, 28], [466, 50], [466, 72]].forEach(([x, y]) => slot("-5", null, x, y, 28, 22, "moto"));
slot("-5", 31, 382, 62, 28, 50, "pcd"); slot("-5", 30, 382, 142, 28, 50, "pcd");
slot("-5", 6, 307, 142, 28, 50, "livre");
slot("-5", 4, 113, 160, 55, 27, "livre"); slot("-5", 5, 168, 160, 55, 27, "livre");
slot("-5", 3, 4, 142, 55, 28, "livre"); slot("-5", 2, 4, 170, 55, 28, "livre"); slot("-5", 1, 4, 198, 55, 28, "livre");
// -6
pairRows("-6", range(40, 58), [...range(39, 57), 59], 4, 27.5);
slot("-6", 62, 323, 4, 28, 48, "livre");
slot("-6", 61, 337, 60, 25, 50, "livre", 35);
slot("-6", 63, 383, 58, 28, 54, "pcd");
slot("-6", 37, 306, 146, 28, 52, "livre"); slot("-6", 38, 381, 146, 28, 52, "livre");
slot("-6", 34, 4, 146, 55, 28, "livre"); slot("-6", 33, 4, 174, 55, 28, "livre"); slot("-6", 32, 4, 202, 55, 28, "livre");
slot("-6", 35, 113, 163, 55, 27, "livre"); slot("-6", 36, 168, 163, 55, 27, "livre");
// -7
pairRows("-7", range(76, 90), [...range(75, 89), 91], 64, 28);
slot("-7", 74, 30, 36, 28, 50, "dupla");
slot("-7", 92, 320, 6, 28, 52, "livre");
slot("-7", 94, 368, 50, 55, 27, "livre"); slot("-7", 93, 368, 82, 55, 27, "livre");
slot("-7", 66, 4, 116, 55, 27, "livre"); slot("-7", 65, 4, 143, 55, 27, "livre"); slot("-7", 64, 4, 170, 55, 27, "livre");
slot("-7", 67, 125, 162, 55, 27, "livre"); slot("-7", 68, 180, 134, 27, 55, "livre");
slot("-7", 69, 222, 172, 25, 50, "livre", -40);
slot("-7", 70, 262, 146, 55, 27, "livre");
slot("-7", 72, 317, 136, 55, 27, "livre"); slot("-7", 73, 372, 136, 55, 27, "livre");
slot("-7", 71, 277, 176, 25, 50, "livre", -40);

export const KIND = {}, SUB_OF = {};
SUBS.forEach(s => LAYOUT[s].forEach(o => { if (o.n) { KIND[o.n] = o.kind; SUB_OF[o.n] = s; } }));

export const apSort = (a, b) => {
  const ia = a.startsWith("I-"), ib = b.startsWith("I-");
  if (ia !== ib) return ia ? 1 : -1;
  return parseInt(a.replace("I-", ""), 10) - parseInt(b.replace("I-", ""), 10) || a.localeCompare(b);
};

export function distToText(lines) {
  return lines.slice().sort((a, b) => apSort(a.ap, b.ap)).map(l => `${l.ap};${l.vaga}${l.origem && l.origem !== "Sorteio" ? ";" + l.origem : ""}`).join("\n");
}

export function parseDist(txt) {
  const lines = [], errs = [], seenAp = {}, seenV = {};
  txt.split(/\r?\n/).forEach((row, i) => {
    const s = row.trim(); if (!s) return;
    const p = s.split(/[;,\t]/).map(x => x.trim());
    const ap = p[0].toUpperCase().replace(/^(AP\.?|APTO)\s*/, "").replace(/^I\s*-?\s*/, "I-");
    const vaga = parseInt(String(p[1] || "").replace(/\D/g, ""), 10);
    const og = (p[2] || "Sorteio").toUpperCase();
    const origem = og === "PCD" ? "PCD" : og === "PNE" ? "PNE" : "Sorteio";
    if (!ap || !vaga) { errs.push(`Linha ${i + 1}: use o formato Apto;Vaga.`); return; }
    if (!SUB_OF[vaga]) { errs.push(`Linha ${i + 1}: a vaga ${vaga} não existe no mapa.`); return; }
    if (seenAp[ap]) { errs.push(`Linha ${i + 1}: o Ap. ${ap} já aparece na linha ${seenAp[ap]}.`); return; }
    if (seenV[vaga]) { errs.push(`Linha ${i + 1}: a vaga ${vaga} já é do Ap. ${seenV[vaga]}.`); return; }
    seenAp[ap] = i + 1; seenV[vaga] = ap;
    lines.push({ ap, vaga, origem });
  });
  const total = Object.keys(SUB_OF).length;
  const semDono = Object.keys(SUB_OF).map(Number).filter(n => !seenV[n]);
  return { lines, errs, aviso: lines.length && semDono.length ? `${semDono.length} de ${total} vagas ficam sem apartamento: ${semDono.slice(0, 15).join(", ")}${semDono.length > 15 ? "…" : ""}.` : "" };
}
