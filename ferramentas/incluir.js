// Inclui no quadro o detalhe nota a nota das competencias que nao tinham, a partir dos PDFs lidos.
// So mexe nas competencias SEM detalhe: as que ja tem ficam como estao (as marcacoes da equipe sao por posicao da critica).
// Uso: node incluir.js <index.html> <lidos.json> <data>
const fs = require('fs');
const [arq, lidosArq, data] = process.argv.slice(2);
let html = fs.readFileSync(arq, 'utf8');
const m = /<script id="dados" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
const D = JSON.parse(m[1]), P = JSON.parse(fs.readFileSync(lidosArq, 'utf8'));
const dig = s => String(s || '').replace(/\D/g, '');
let inc = [], aviso = [];
for (const tk of D.tasks) {
  if (D.notas[tk.id]) continue;
  const id = dig(tk.ie) + '-' + tk.r.slice(0, 2) + tk.r.slice(3), p = P[id];
  if (!p) continue;
  const t = [], r = [], dt = [];
  for (const op of ['Entrada', 'Saída']) { const x = p.ops[op]; if (!x) continue;
    for (const g of x.grupos) { const gi = t.length; t.push([g.tipo, op]); dt.push([op, g.tipo, g.r.length, Math.round(g.r.reduce((a, l) => a + l.v, 0) * 100) / 100]);
      for (const l of g.r) r.push([gi, l.nf, l.v, l.ch, l.cnpj, l.canc ? 1 : 0]); } }
  if (!r.length) continue;
  const q = r.length, v = Math.round(r.reduce((a, l) => a + l[2], 0) * 100) / 100;
  D.notas[tk.id] = { t, r };
  tk.dt = dt;
  if (q !== tk.q || Math.abs(v - tk.v) > 0.05) { aviso.push(tk.id + ' ' + tk.e + ' ' + tk.r + ': quadro ' + tk.q + ' criticas / R$ ' + tk.v + ', PDF ' + q + ' / R$ ' + v); tk.ob = 'Detalhe nota a nota incluído em ' + data + ' a partir dos PDFs da SEFAZ, que trazem ' + q + (q === 1 ? ' crítica' : ' críticas') + ' (R$ ' + v.toFixed(2).replace('.', ',') + '); o total da competência no quadro continua o do print (' + tk.q + ' críticas).'; }
  else tk.ob = 'Detalhe nota a nota incluído em ' + data + ' a partir dos PDFs da SEFAZ.';
  inc.push(tk.id + ' ' + tk.e + ' ' + tk.r + ' -> ' + q + ' criticas em ' + t.length + ' tipo(s)');
}
D.ger = (D.ger || '').split(' ·')[0] + ' · detalhe de ' + inc.length + ' competências incluído em ' + data;
html = html.slice(0, m.index) + '<script id="dados" type="application/json">' + JSON.stringify(D) + '</script>' + html.slice(m.index + m[0].length);
fs.writeFileSync(arq, html);
console.log('incluidas: ' + inc.length); inc.forEach(x => console.log('  ' + x));
console.log('com total diferente do print (anotado na observacao): ' + aviso.length); aviso.forEach(x => console.log('  ' + x));
console.log('ger: ' + D.ger);
