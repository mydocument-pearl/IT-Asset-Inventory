import XLSX from 'xlsx';
import * as path from 'path';

const absolutePath = path.resolve('assignments.xlsx');
const workbook = XLSX.readFile(absolutePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawRows = XLSX.utils.sheet_to_json(worksheet);

console.log(`Total rows: ${rawRows.length}`);
console.log("\nKeys in Row 0:", Object.keys(rawRows[0] || {}));

// Print first 5 rows that are SIM Card
console.log("\nFirst 5 SIM Card rows:");
let count = 0;
rawRows.forEach((row, idx) => {
  const type = String(row['Asset Type'] || row['Type'] || '').toLowerCase();
  if (type.includes('sim') && count < 5) {
    console.log(`Row ${idx + 2}:`, row);
    count++;
  }
});
