// Reprograma o cronograma para os sabados: as competencias ja concluidas ficam como estao; as pendentes de cada
// pessoa seguem na mesma ordem, 2 por sabado (manha/tarde), a partir do sabado informado.
// Uso: node sabados.js <index.html> <feitos.json> <primeiro sabado AAAA-MM-DD> <data de hoje DD/MM/AAAA>
const fs = require('fs');
const [arq, feitosArq, PRIMEIRO, HOJE] = process.argv.slice(2);
let html = fs.readFileSync(arq, 'utf8');
const m = /<script id="dados" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
const D = JSON.parse(m[1]), FEITOS = JSON.parse(fs.readFileSync(feitosArq, 'utf8'));
const POR_DIA = 2;
const iso = d => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
if (new Date(PRIMEIRO + 'T12:00:00').getDay() !== 6) throw new Error(PRIMEIRO + ' não é sábado');
const proxSab = s => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + 7); return iso(d); };
const br = s => s.slice(8) + '/' + s.slice(5, 7);

let movidas = 0, mantidas = 0;
const resumo = {};
for (const w of D.av) {
  const minhas = D.tasks.filter(t => t.w === w).sort((a, b) => a.d.localeCompare(b.d) || a.p - b.p);
  const pend = minhas.filter(t => !FEITOS[t.id]);
  let d = PRIMEIRO, p = 0;
  for (const t of pend) {
    if (t.d !== d || t.p !== p) movidas++;
    t.d = d; t.p = p;
    if (++p >= POR_DIA) { p = 0; d = proxSab(d); }
  }
  mantidas += minhas.length - pend.length;
  // n = numero do dia dentro da agenda da pessoa (recontado)
  const dias = [...new Set(minhas.map(t => t.d))].sort();
  minhas.forEach(t => { t.n = dias.indexOf(t.d) + 1; });
  resumo[w] = { feitas: minhas.length - pend.length, pendentes: pend.length, ultimo: pend.length ? pend[pend.length - 1].d : '-' };
}
D.fim = D.tasks.reduce((a, t) => t.d > a ? t.d : a, D.start);
D.ger = (D.ger || '') + ' · reprogramado para os sábados em ' + HOJE;
html = html.slice(0, m.index) + '<script id="dados" type="application/json">' + JSON.stringify(D) + '</script>' + html.slice(m.index + m[0].length);
const fimBR = D.fim.slice(8) + '/' + D.fim.slice(5, 7) + '/' + D.fim.slice(0, 4);
const sub = /plano de 01\/10 a \d\d\/\d\d\/\d{4} · 2 competências por colaborador por dia/;
if (!sub.test(html)) throw new Error('subtítulo não encontrado');
html = html.replace(sub, 'plano de 01/10/2026 a ' + fimBR + ' · aos sábados, 2 competências por colaborador');
fs.writeFileSync(arq, html);
console.log('mantidas (concluídas): ' + mantidas + ' | reprogramadas: ' + movidas + ' | fim do plano: ' + fimBR);
for (const w of D.av) console.log(`  ${w}: ${resumo[w].feitas} feitas, ${resumo[w].pendentes} pendentes, último sábado ${resumo[w].ultimo === '-' ? '-' : br(resumo[w].ultimo)}`);
