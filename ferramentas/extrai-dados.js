// Tira do index.html o JSON embutido em <script id="dados">. Uso: node extrai-dados.js <index.html> <saida.json>
const fs = require('fs');
const [arq, saida] = process.argv.slice(2);
const m = /<script id="dados" type="application\/json">([\s\S]*?)<\/script>/.exec(fs.readFileSync(arq, 'utf8'));
if (!m) { console.log('bloco de dados nao encontrado'); process.exit(1); }
fs.writeFileSync(saida, m[1]);
console.log('ok: ' + m[1].length + ' caracteres');
