import * as XLSX from 'xlsx';

export async function parseImportFile(file: File): Promise<string[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'json') {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: unknown) => {
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          return (String(obj.address ?? obj.endereco ?? '')).trim();
        }
        return '';
      })
      .filter(Boolean);
  }

  if (ext === 'txt') {
    const text = await file.text();
    return text
      .split('\n')
      .map(line => line.replace(/^\s*\d+[\.\)]\s*/, '').trim())
      .filter(Boolean);
  }

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];
    return rows
      .map(row => {
        const val = row[0];
        return typeof val === 'string' ? val.trim() : String(val ?? '').trim();
      })
      .filter(v => v && v !== 'undefined' && v !== 'null');
  }

  throw new Error('Formato não suportado. Use .xlsx, .json ou .txt');
}
