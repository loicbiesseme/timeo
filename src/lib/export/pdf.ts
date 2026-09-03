import type { ExportTable, ExportSummary } from "./format";
import { formatHm } from "@/lib/time";

/** PDF paysage : titre + résumé + tableau. jsPDF est chargé à la demande. */
export async function toPdf(table: ExportTable, summary: ExportSummary): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text("Timeo · Export des sessions", 40, 42);

  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `${summary.count} session(s) · du ${summary.from} au ${summary.to} · ` +
      `total travaillé ${formatHm(summary.totalWorkedMs)} · pauses ${formatHm(summary.totalPausedMs)}`,
    40,
    60
  );

  autoTable(doc, {
    startY: 78,
    head: [table.headers],
    body: table.rows.map((row) => row.map(String)),
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [79, 70, 229], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 246, 249] },
    margin: { left: 40, right: 40 },
  });

  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}
