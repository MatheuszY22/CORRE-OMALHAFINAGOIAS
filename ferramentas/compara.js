// Compara o que foi lido dos PDFs com os dados do quadro. Uso: node compara.js <dados.json> <lidos.json>
const fs = require('fs');
const [dadosArq, lidosArq] = process.argv.slice(2);
const D = JSON.parse(fs.readFileSync(dadosArq, 'utf8')), P = JSON.parse(fs.readFileSync(lidosArq, 'utf8'));
const dig = s => String(s || '').replace(/\D/g, '');
const montar = o => { // t/r no formato do quadro: Entrada primeiro, depois Saida, tipos na ordem do PDF
  const t = [], r = [];
  for (const op of ['Entrada', 'Saída']) { const x = o.ops[op]; if (!x) continue;
    for (const g of x.grupos) { const gi = t.length; t.push([g.tipo, op]); for (const l of g.r) r.push([gi, l.nf, l.v, l.ch, l.cnpj, l.canc ? 1 : 0]); } }
  return { t, r };
};
let iguais = 0, difs = [], semNT = [], semPdf = [], soma = { ok: 0, dif: [] };
for (const tk of D.tasks) {
  const id = dig(tk.ie) + '-' + tk.r.slice(0, 2) + tk.r.slice(3), p = P[id], n = D.notas[tk.id];
  if (!p) { semPdf.push(tk.id + ' ' + tk.e + ' ' + tk.r + (n ? '' : ' (SEM detalhe no quadro)')); continue; }
  const m = montar(p);
  const qtd = m.r.length, val = Math.round(m.r.reduce((a, x) => a + x[2], 0) * 100) / 100;
  if (Math.abs(val - tk.v) > 0.05 || qtd !== tk.q) soma.dif.push(`${tk.id} ${tk.e} ${tk.r}: quadro q=${tk.q} v=${tk.v} | pdf q=${qtd} v=${val}${n ? '' : ' (sem detalhe)'}`); else soma.ok++;
  if (!n) { semNT.push({ id: tk.id, e: tk.e, r: tk.r, qtd, val, ob: tk.ob }); continue; }
  // mesma lista? compara chave+NF+valor+tipo, na ordem
  const a = n.r.map(x => n.t[x[0]].join('/') + '|' + x[1] + '|' + x[2] + '|' + x[3] + '|' + (x[5] ? 1 : 0)), b = m.r.map(x => m.t[x[0]].join('/') + '|' + x[1] + '|' + x[2] + '|' + x[3] + '|' + x[5]);
  if (a.length === b.length && a.every((x, i) => x === b[i])) iguais++;
  else { const sa = new Set(a), sb = new Set(b); difs.push(`${tk.id} ${tk.e} ${tk.r}: quadro ${a.length} linhas, pdf ${b.length}; so no quadro ${a.filter(x => !sb.has(x)).length}, so no pdf ${b.filter(x => !sa.has(x)).length}; ordem igual=${a.length === b.length && a.every((x, i) => x === b[i])}` + (a.length === b.length && new Set([...sa, ...sb]).size === sa.size ? ' (MESMO CONTEUDO, outra ordem)' : '') + ' | ex quadro: ' + a.filter(x => !sb.has(x))[0] + ' | ex pdf: ' + b.filter(x => !sa.has(x))[0]); }
}
console.log('competencias do quadro: ' + D.tasks.length + ' | com detalhe: ' + Object.keys(D.notas).filter(k => D.tasks.some(t => t.id === k)).length);
console.log('IGUAIS ao PDF (ja com detalhe): ' + iguais + ' | DIFERENTES: ' + difs.length);
difs.slice(0, 40).forEach(x => console.log('  ' + x));
console.log('SEM detalhe no quadro e com PDF (a incluir): ' + semNT.length);
semNT.forEach(x => console.log('  ' + x.id + ' ' + x.e + ' ' + x.r + ' -> ' + x.qtd + ' criticas, R$ ' + x.val.toFixed(2) + ' | ob: ' + (x.ob || '')));
console.log('SEM PDF: ' + semPdf.length); semPdf.forEach(x => console.log('  ' + x));
console.log('totais da competencia (q/v) iguais: ' + soma.ok + ' | diferentes: ' + soma.dif.length); soma.dif.slice(0, 30).forEach(x => console.log('  ' + x));
const ids = new Set(D.tasks.map(t => dig(t.ie) + '-' + t.r.slice(0, 2) + t.r.slice(3)));
const extras = Object.keys(P).filter(k => !ids.has(k));
console.log('competencias com PDF que NAO estao no quadro: ' + extras.length);
const porMes = {}; extras.forEach(k => { const m = k.split('-')[1]; porMes[m] = (porMes[m] || 0) + 1; }); console.log('  por mes: ' + JSON.stringify(porMes));
console.log('  canceladas marcadas nos PDFs: ' + Object.values(P).reduce((a, o) => a + Object.values(o.ops).reduce((b, x) => b + x.grupos.reduce((c, g) => c + g.r.filter(l => l.canc).length, 0), 0), 0) + ' | textos da coluna Cancelado: ' + JSON.stringify([...new Set(Object.values(P).flatMap(o => Object.values(o.ops).flatMap(x => x.grupos.flatMap(g => g.r.map(l => l.cancTxt)))))]));
