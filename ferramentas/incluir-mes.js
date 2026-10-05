// Inclui no quadro as competencias de um mes (MMAAAA) lidas dos PDFs e encaixa no cronograma.
// Regras: empresa que ja esta no quadro vai para o responsavel do ultimo mes dela; empresa nova vai para quem tiver
// o primeiro horario livre. Cada pessoa continua com 2 competencias por dia util (sem 12/10, 02/11 e 20/11), a
// partir do primeiro horario livre depois do que ja esta marcado. Uso: node incluir-mes.js <index.html> <lidos.json> <data> <MMAAAA>
const fs = require('fs');
const [arq, lidosArq, data, MES] = process.argv.slice(2);
const MESBR = MES.slice(0, 2) + '/' + MES.slice(2);
let html = fs.readFileSync(arq, 'utf8');
const m = /<script id="dados" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
const D = JSON.parse(m[1]), P = JSON.parse(fs.readFileSync(lidosArq, 'utf8'));
const dig = s => String(s || '').replace(/\D/g, '');
const fmtIE = d => d.length === 9 ? d.slice(0, 2) + '.' + d.slice(2, 5) + '.' + d.slice(5, 8) + '-' + d.slice(8) : d;
const FERIADOS = ['2026-10-12', '2026-11-02', '2026-11-20', '2026-12-25', '2027-01-01'];
const iso = d => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
const util = s => { const d = new Date(s + 'T12:00:00'); return d.getDay() > 0 && d.getDay() < 6 && !FERIADOS.includes(s); };
const proxDia = s => { const d = new Date(s + 'T12:00:00'); do { d.setDate(d.getDate() + 1); } while (!util(iso(d))); return iso(d); };

// agenda de cada pessoa: quantas competencias em cada dia e o ultimo dia
const agenda = {}; for (const w of D.av) agenda[w] = { dias: {}, ult: D.start, n: {} };
for (const t of D.tasks) { const a = agenda[t.w]; a.dias[t.d] = (a.dias[t.d] || 0) + 1; if (t.d > a.ult) a.ult = t.d; a.n[t.d] = t.n; }
function proximo(w) { // primeiro horario livre a partir do ultimo dia marcado
  const a = agenda[w]; let d = a.ult; while ((a.dias[d] || 0) >= 2) d = proxDia(d); return d;
}
function marcar(w, d) { const a = agenda[w]; const p = a.dias[d] || 0; a.dias[d] = p + 1; if (d > a.ult) a.ult = d; if (!a.n[d]) { const dias = Object.keys(a.dias).sort(); a.n[d] = dias.indexOf(d) + 1; } return { p, n: a.n[d] }; }

// empresa -> responsavel do ultimo mes e dados cadastrais
const emp = {}; for (const t of D.tasks) { const k = dig(t.ie); emp[k] = emp[k] || { e: t.e, mu: t.mu, ult: '' }; if (t.r > emp[k].ult) { emp[k].ult = t.r; emp[k].w = t.w; } }
const ag = Object.entries(P).filter(([k]) => k.endsWith('-' + MES)).map(([k, o]) => ({ k, o, ie: k.split('-')[0], nova: !emp[k.split('-')[0]] }));
// primeiro as empresas conhecidas (responsavel certo), depois as novas, das maiores para as menores, no primeiro horario livre
const qde = o => Object.values(o.ops).reduce((a, x) => a + x.grupos.reduce((b, g) => b + g.r.length, 0), 0);
ag.sort((a, b) => (a.nova - b.nova) || (qde(b.o) - qde(a.o)) || a.o.e.localeCompare(b.o.e));
const novas = [];
for (const x of ag) {
  const { o, ie } = x, id = ie + '-' + MES;
  if (D.tasks.some(t => t.id === id)) continue;
  const t = [], r = [], dt = [];
  for (const op of ['Entrada', 'Saída']) { const g0 = o.ops[op]; if (!g0) continue; for (const g of g0.grupos) { const gi = t.length; t.push([g.tipo, op]); dt.push([op, g.tipo, g.r.length, Math.round(g.r.reduce((a, l) => a + l.v, 0) * 100) / 100]); for (const l of g.r) r.push([gi, l.nf, l.v, l.ch, l.cnpj, l.canc ? 1 : 0]); } }
  if (!r.length) continue;
  let w;
  if (!x.nova) w = emp[ie].w; else w = D.av.map(c => ({ c, d: proximo(c) })).sort((a, b) => a.d.localeCompare(b.d) || (agenda[a.c].dias[a.d] || 0) - (agenda[b.c].dias[b.d] || 0))[0].c;
  const d = proximo(w), { p, n } = marcar(w, d);
  const tk = { id, w, d, p, n, e: x.nova ? o.e : emp[ie].e, ie: x.nova ? fmtIE(ie) : D.tasks.find(t => dig(t.ie) === ie).ie, mu: x.nova ? '' : (emp[ie].mu || ''), r: MESBR, q: r.length, v: Math.round(r.reduce((a, l) => a + l[2], 0) * 100) / 100, c: 'própria', rm: w, ra: w, st: '', dt, ob: 'Competência de ' + MESBR + ' incluída em ' + data + ' a partir dos PDFs da SEFAZ.' + (x.nova ? ' Empresa sem outras competências no quadro: responsável definido pelo encaixe no cronograma.' : '') };
  D.tasks.push(tk); D.notas[id] = { t, r };
  novas.push(tk);
}
D.fim = Object.values(agenda).reduce((a, x) => x.ult > a ? x.ult : a, D.fim);
D.ger = (D.ger || '') + ' · ' + MESBR + ' incluído em ' + data;
html = html.slice(0, m.index) + '<script id="dados" type="application/json">' + JSON.stringify(D) + '</script>' + html.slice(m.index + m[0].length);
const fimBR = D.fim.slice(8) + '/' + D.fim.slice(5, 7) + '/' + D.fim.slice(0, 4);
console.log('Ajuste a mao o subtitulo da pagina (competencias e fim do plano): ' + D.fim);
fs.writeFileSync(arq, html);
const br = s => s.slice(8) + '/' + s.slice(5, 7);
console.log('incluidas: ' + novas.length + ' | fim do plano: ' + D.fim);
for (const w of D.av) { const l = novas.filter(t => t.w === w); if (!l.length) continue; console.log(`\n${w} (+${l.length}, termina em ${br(agenda[w].ult)}):`); l.forEach(t => console.log(`  ${br(t.d)} ${t.p ? 'tarde' : 'manhã'}  ${t.e}  ${t.q} crit. R$ ${t.v.toFixed(2)}${/Empresa sem outras/.test(t.ob) ? '  [empresa nova]' : ''}`)); }
