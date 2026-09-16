export function downloadCsv<T extends object>(rows: T[], filename: string) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const content = [headers.map(escape).join(','), ...rows.map((row) => { const values = row as Record<string, unknown>; return headers.map((header) => escape(values[header])).join(','); })].join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
