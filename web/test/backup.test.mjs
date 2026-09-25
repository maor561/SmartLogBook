// ADR-013: restore accepts only an untouched file exported by SmartLogBook.
// Runs with --conditions=react-server so 'server-only' resolves to its no-op build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';

process.env.SESSION_SECRET = 's'.repeat(48);
const { buildWorkbook, readBackup } = await import('../src/lib/backup.ts');

test('an exported file reads back; a modified one is rejected', async () => {
  const buf = await buildWorkbook([]);                       // no flights → no DB access
  assert.deepEqual(await readBackup(buf), { flights: [], lines: [] });

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const bk = wb.getWorksheet('_backup');
  bk.getRow(2).getCell(1).value = String(bk.getRow(2).getCell(1).value).replace('"flights":[]', '"flights":[{"id":1}]');
  const tampered = Buffer.from(await wb.xlsx.writeBuffer());
  await assert.rejects(readBackup(tampered), /שונה/);
});

test('a file from another installation (other secret) is rejected', async () => {
  const buf = await buildWorkbook([]);
  process.env.SESSION_SECRET = 'x'.repeat(48);
  await assert.rejects(readBackup(buf), /שונה/);
  process.env.SESSION_SECRET = 's'.repeat(48);
});

test('a plain spreadsheet is rejected', async () => {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('flights').addRow(['LLBG', 'LGAV']);
  await assert.rejects(readBackup(Buffer.from(await wb.xlsx.writeBuffer())), /לא יוצא/);
  await assert.rejects(readBackup(Buffer.from('not a zip')), /Excel/);
});
