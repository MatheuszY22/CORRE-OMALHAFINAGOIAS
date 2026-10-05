// Le todos os PDFs "Relatorio de Criticas" da SEFAZ-GO e monta, por competencia (IE-MMAAAA), a lista de criticas no
// formato do quadro: t = [[tipo, operacao]...], r = [[indice do tipo, NF, valor, chave, CNPJ/CPF, cancelada]...].
// A pagina e girada (rotate 90): cada linha da tabela e um x, e cada coluna uma faixa de y.
// Uso: node lerpdfs.mjs <pasta> <saida.json>
import fs from 'fs';
import path from 'path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
const [pasta, saida] = process.argv.slice(2);
const num = s => parseFloat(String(s).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
const COL = y => y >= 560 ? 'ch' : y >= 460 ? 'dt' : y >= 340 ? 'cnpj' : y >= 230 ? 'v' : y >= 180 ? 'canc' : y >= 100 ? 'nf' : y >= 40 ? 'ser' : 'cab';
async function lerPdf(arq) {
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(arq)), useSystemFonts: true }).promise;
  const grupos = []; let g = null; const avisos = []; let cab = null;
  for (let p = 1; p <= doc.numPages; p++) {
    const pg = await doc.getPage(p), tc = await pg.getTextContent();
    const its = tc.items.filter(i => i.str.trim()).map(i => ({ x: Math.round(i.transform[4]), y: Math.round(i.transform[5]), s: i.str.trim() }));
    const qt = its.find(i => i.s === 'Qtde:');
    if (qt) {
      const mesmoX = its.filter(i => Math.abs(i.x - qt.x) <= 2);
      const tipo = mesmoX.find(i => i.y < 45), qtde = mesmoX.find(i => i.y > 335 && i.y < 360), total = mesmoX.find(i => i.y > 425 && i.y < 450);
      g = { tipo: tipo ? tipo.s : '?', qtde: qtde ? +qtde.s : null, total: total ? num(total.s) : null, r: [] };
      grupos.push(g);
      if (!cab) {
        const ie = its.find(i => /^\d{2}\.\d{3}\.\d{3}-\d$/.test(i.s)), ref = its.find(i => /^\d{2}\/\d{4}$/.test(i.s)), op = its.find(i => /Opera[cç][aã]o de/.test(i.s)), qc = its.find(i => Math.abs(i.y - 146) <= 3 && /^\d+$/.test(i.s)), vt = its.find(i => Math.abs(i.y - 146) <= 3 && /^R\$/.test(i.s));
        cab = { ie: ie ? ie.s : '', ref: ref ? ref.s : '', op: op ? (/Entrada/i.test(op.s) ? 'Entrada' : 'Saída') : '', qtd: qc ? +qc.s : null, vt: vt ? num(vt.s) : null };
      }
    }
    if (!g) { avisos.push('pagina ' + p + ' sem cabecalho de grupo'); continue; }
    // linhas da tabela: itens com x maior que o dos titulos das colunas (Chave/Numero...) ou, nas continuacoes, todos
    const tit = its.find(i => i.s === 'Chave'), x0 = tit ? tit.x + 3 : 0;
    const linhas = new Map();
    for (const i of its) {
      if (i.x < x0 || i.y > 650 || COL(i.y) === 'cab') continue;
      const k = [...linhas.keys()].find(kx => Math.abs(kx - i.x) <= 2) ?? i.x;
      if (!linhas.has(k)) linhas.set(k, {});
      const c = COL(i.y), l = linhas.get(k);
      l[c] = l[c] ? l[c] + ' ' + i.s : i.s;
    }
    [...linhas.entries()].sort((a, b) => a[0] - b[0]).forEach(([x, l]) => {
      if (!l.ch || !/^\d{44}$/.test(l.ch)) { if (l.ch || l.nf || l.v) avisos.push('pagina ' + p + ' linha x=' + x + ' sem chave valida: ' + JSON.stringify(l)); return; }
      g.r.push({ nf: l.nf || '', v: num(l.v || '0'), ch: l.ch, cnpj: l.cnpj || '', canc: !!(l.canc && l.canc.trim()), cancTxt: l.canc || '', ser: l.ser || '', dt: l.dt || '' });
    });
  }
  return { cab, grupos, avisos };
}
const saidaObj = {}, log = [];
const arqs = fs.readdirSync(pasta).filter(f => /\.pdf$/i.test(f)).sort();
let n = 0;
for (const f of arqs) {
  const m = /^(.*)_(\d{8,9})_(\d{2})-(\d{4})_(Entrada|Saida)\.pdf$/i.exec(f);
  if (!m) { log.push('NOME FORA DO PADRAO: ' + f); continue; }
  const id = m[2] + '-' + m[3] + m[4], op = m[5] === 'Entrada' ? 'Entrada' : 'Saída';
  let r;
  try { r = await lerPdf(path.join(pasta, f)); } catch (e) { log.push('ERRO ao ler ' + f + ': ' + e.message); continue; }
  const o = saidaObj[id] = saidaObj[id] || { e: m[1], ie: m[2], r: m[3] + '/' + m[4], ops: {} };
  o.ops[op] = { arq: f, cab: r.cab, grupos: r.grupos.map(g => ({ tipo: g.tipo, qtde: g.qtde, total: g.total, n: g.r.length, soma: Math.round(g.r.reduce((a, x) => a + x.v, 0) * 100) / 100, r: g.r })), avisos: r.avisos };
  for (const g of r.grupos) if (g.qtde !== null && g.qtde !== g.r.length) log.push('QTDE DIFERENTE em ' + f + ' [' + g.tipo + ']: cabecalho ' + g.qtde + ', linhas lidas ' + g.r.length);
  for (const g of r.grupos) if (g.total !== null && Math.abs(g.total - g.r.reduce((a, x) => a + x.v, 0)) > 0.02) log.push('TOTAL DIFERENTE em ' + f + ' [' + g.tipo + ']: cabecalho ' + g.total + ', soma ' + g.r.reduce((a, x) => a + x.v, 0).toFixed(2));
  r.avisos.forEach(a => log.push('AVISO ' + f + ': ' + a));
  if (++n % 50 === 0) console.log(n + ' de ' + arqs.length + ' lidos');
}
fs.writeFileSync(saida, JSON.stringify(saidaObj));
console.log('competencias com PDF: ' + Object.keys(saidaObj).length + ' | arquivos: ' + arqs.length);
console.log(log.length ? log.join('\n') : 'sem avisos');
