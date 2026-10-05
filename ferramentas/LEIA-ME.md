# Ferramentas do quadro da Malha Fina

Scripts usados para alimentar o `index.html` a partir dos PDFs "Relatório de
Críticas" da SEFAZ-GO (um PDF por empresa, competência e operação, com o nome
`EMPRESA_IE_MM-AAAA_Entrada.pdf` ou `_Saida.pdf`).

Precisa do Node.js e, uma vez só, da biblioteca de leitura de PDF:

```
cd ferramentas
npm install pdfjs-dist@4.10.38
```

## Passo a passo

1. **Ler os PDFs** (confere, em cada grupo, a quantidade e o total do cabeçalho
   contra as linhas lidas e avisa qualquer diferença):

   ```
   node lerpdfs.mjs "G:\Meu Drive\SERVIDOR\COLABORADORES\Matheus\Malha GO\pdfs" lidos.json
   ```

2. **Comparar com o quadro** (quais competências já têm detalhe igual ao PDF,
   quais não têm detalhe, quais não têm PDF e quais PDFs não estão no quadro):

   ```
   node extrai-dados.js ..\index.html dados.json
   node compara.js dados.json lidos.json
   ```

3. **Incluir no quadro** o detalhe das competências que ainda não têm. Só mexe
   nessas: as que já têm detalhe ficam como estão, porque as marcações da equipe
   são guardadas pela posição de cada crítica.

   ```
   node incluir.js ..\index.html lidos.json 05/10/2026
   ```

Depois é só publicar o `index.html` (commit e push no `main`).

O `lerpdfs.mjs` entende a página girada do relatório: cada linha da tabela é
uma posição horizontal e cada coluna uma faixa vertical (chave, data de
processamento, CNPJ/CPF, valor, cancelada, número e série).
