import XLSX from 'xlsx';
import * as path from 'path';

const absolutePath = path.resolve('assignments.xlsx');
const workbook = XLSX.readFile(absolutePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawRows = XLSX.utils.sheet_to_json(worksheet);

// Print all unique keys across all rows
const allKeys = new Set();
rawRows.forEach(row => {
  Object.keys(row).forEach(key => allKeys.add(key));
});

console.log("All unique keys in sheet:", Array.from(allKeys));

// Look for any columns containing "phone", "number", "sim"
const searchTerms = ['phone', 'number', 'sim', 'mob'];
const foundKeys = Array.from(allKeys).filter(k => 
  searchTerms.some(term => k.toLowerCase().includes(term))
);
console.log("Matching keys:", foundKeys);

// Print rows that have values for these keys
rawRows.forEach((row, idx) => {
  const hasValue = foundKeys.some(k => row[k] !== undefined);
  if (hasValue && idx < 10) {
    console.log(`Row ${idx + 2}:`, row);
  }
});
