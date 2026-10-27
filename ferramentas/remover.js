// Tira empresas do quadro (todas as competencias delas), pela IE. As demais competencias mantem data e responsavel.
// Uso: node remover.js <index.html> <data DD/MM/AAAA> <IE> [IE...]
const fs = require('fs');
const [arq, data, ...ies] = process.argv.slice(2);
let html = fs.readFileSync(arq, 'utf8');
const m = /<script id="dados" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
const D = JSON.parse(m[1]);
const dig = s => String(s || '').replace(/\D/g, '');
const alvo = new Set(ies.map(dig));
const fora = D.tasks.filter(t => alvo.has(dig(t.ie)));
const achadas = new Set(fora.map(t => dig(t.ie)));
const naoAchadas = [...alvo].filter(ie => !achadas.has(ie));
if (naoAchadas.length) throw new Error('IE não encontrada no quadro: ' + naoAchadas.join(', '));
D.tasks = D.tasks.filter(t => !alvo.has(dig(t.ie)));
fora.forEach(t => { delete D.notas[t.id]; });
// n = numero do dia dentro da agenda de cada pessoa (recontado)
for (const w of D.av) { const minhas = D.tasks.filter(t => t.w === w); const dias = [...new Set(minhas.map(t => t.d))].sort(); minhas.forEach(t => { t.n = dias.indexOf(t.d) + 1; }); }
D.fim = D.tasks.reduce((a, t) => t.d > a ? t.d : a, D.start);
const nomes = [...new Set(fora.map(t => t.e))];
D.ger = (D.ger || '') + ' · ' + nomes.length + ' empresas retiradas em ' + data;
html = html.slice(0, m.index) + '<script id="dados" type="application/json">' + JSON.stringify(D) + '</script>' + html.slice(m.index + m[0].length);
fs.writeFileSync(arq, html);
console.log('retiradas: ' + nomes.length + ' empresas, ' + fora.length + ' competências | restam ' + D.tasks.length + ' competências | fim do plano ' + D.fim);
nomes.forEach(n => console.log('  - ' + n + ' (' + fora.filter(t => t.e === n).map(t => t.r + ' ' + t.w).join(', ') + ')'));
