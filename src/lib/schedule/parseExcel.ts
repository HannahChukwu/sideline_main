import type { CsvParseResult } from "@/lib/schedule/parseCsv";

function stringifyCell(value: unknown): string {
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return value.toISOString();
    return "";
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return String(value).trim();
}

/**
 * Reads the first worksheet of an .xlsx / .xls file into the same shape as {@link parseCsv},
 * so column guessing and {@link rowsToImportedEvents} work unchanged.
 */
export async function parseExcelBufferToCsvShape(buf: ArrayBuffer): Promise<CsvParseResult> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | Date | null | undefined)[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];

  const nonEmptyRows = matrix.filter(
    (row) => Array.isArray(row) && row.some((c) => stringifyCell(c) !== "")
  );
  if (nonEmptyRows.length === 0) return { headers: [], rows: [] };

  const headerCells = (nonEmptyRows[0] ?? []).map((c) => stringifyCell(c));
  const maxWidth = Math.max(
    headerCells.length,
    ...nonEmptyRows.map((r) => (Array.isArray(r) ? r.length : 0))
  );

  const headers = Array.from({ length: maxWidth }, (_, i) => {
    const h = headerCells[i] ?? "";
    return h || `Column ${i + 1}`;
  });

  const rows: Record<string, string>[] = [];
  for (const line of nonEmptyRows.slice(1)) {
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = stringifyCell(Array.isArray(line) ? line[idx] : undefined);
    });
    if (Object.values(row).some((v) => v.length > 0)) rows.push(row);
  }

  return { headers, rows };
}
