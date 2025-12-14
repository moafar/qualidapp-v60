#!/usr/bin/env node
/*
Genera examples/sample.xlsx a partir de examples/sample.csv usando la librería 'xlsx' de Node.
Uso:
  npm install xlsx
  node scripts/make_sample_xlsx.js --out examples/sample.xlsx
Opciones:
  --csv <ruta>   Ruta al CSV de entrada (por defecto: examples/sample.csv)
  --out <ruta>   Ruta al xlsx de salida (por defecto: examples/sample.xlsx)
*/
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const argv = process.argv.slice(2);
let csvPath = 'examples/sample.csv';
let outPath = 'examples/sample.xlsx';
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--csv' && argv[i + 1]) { csvPath = argv[i + 1]; i++; }
  if (argv[i] === '--out' && argv[i + 1]) { outPath = argv[i + 1]; i++; }
}

if (!fs.existsSync(csvPath)) {
  console.error(`CSV no encontrado: ${csvPath}`);
  process.exit(1);
}

const csv = fs.readFileSync(csvPath, 'utf8');
const rows = csv.split(/\r?\n/).filter(r => r.length > 0).map(r => r.split(','));
const ws = XLSX.utils.aoa_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
XLSX.writeFile(wb, outPath);
console.log(`Generado: ${outPath}`);
