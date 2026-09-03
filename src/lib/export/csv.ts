import type { ExportTable } from "./format";

/** Échappe une valeur pour un CSV séparé par des points-virgules (convention FR). */
function escapeCell(value: string | number): string {
  const s = String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv({ headers, rows }: ExportTable): string {
  return [headers, ...rows].map((row) => row.map(escapeCell).join(";")).join("\r\n");
}
