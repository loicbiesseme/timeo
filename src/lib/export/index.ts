import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { listCompletedSessions } from "@/domain/sessionRepo";
import { buildTable, buildSummary } from "./format";
import { toCsv } from "./csv";
import { toXlsx } from "./xlsx";
import { toPdf } from "./pdf";

export type ExportKind = "csv" | "xlsx" | "pdf";
export type ExportResult = "saved" | "cancelled";

const EXT: Record<ExportKind, { ext: string; label: string }> = {
  csv: { ext: "csv", label: "CSV" },
  xlsx: { ext: "xlsx", label: "Excel" },
  pdf: { ext: "pdf", label: "PDF" },
};

const UTF8_BOM = "﻿";

export async function runExport(kind: ExportKind): Promise<ExportResult> {
  const sessions = (await listCompletedSessions()).sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
  const table = buildTable(sessions);
  const stamp = new Date().toISOString().slice(0, 10);

  const path = await save({
    defaultPath: `timeo-sessions-${stamp}.${EXT[kind].ext}`,
    filters: [{ name: EXT[kind].label, extensions: [EXT[kind].ext] }],
  });
  if (!path) return "cancelled";

  if (kind === "csv") {
    // BOM UTF-8 : Excel affiche correctement les accents.
    await writeTextFile(path, UTF8_BOM + toCsv(table));
  } else if (kind === "xlsx") {
    await writeFile(path, toXlsx(table));
  } else {
    await writeFile(path, await toPdf(table, buildSummary(sessions)));
  }

  return "saved";
}
