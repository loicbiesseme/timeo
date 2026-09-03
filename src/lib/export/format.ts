import { format } from "date-fns";
import type { Session } from "@/domain/types";
import { formatHm } from "@/lib/time";

/** Table générique (en-têtes + lignes) partagée par les trois formats d'export. */
export interface ExportTable {
  headers: string[];
  rows: (string | number)[][];
}

export interface ExportSummary {
  count: number;
  totalWorkedMs: number;
  totalPausedMs: number;
  from: string;
  to: string;
}

export function buildTable(sessions: Session[]): ExportTable {
  const headers = [
    "Date",
    "Début",
    "Fin",
    "Durée totale",
    "Temps travaillé",
    "Temps de pause",
    "Heures travaillées",
    "Statut",
    "Note",
  ];

  const rows = sessions.map((s) => {
    const start = new Date(s.startTime);
    const end = s.endTime ? new Date(s.endTime) : null;
    const totalMs = end ? end.getTime() - start.getTime() : s.workedMs + s.pausedMs;
    return [
      format(start, "yyyy-MM-dd"),
      format(start, "HH:mm"),
      end ? format(end, "HH:mm") : "",
      formatHm(totalMs),
      formatHm(s.workedMs),
      formatHm(s.pausedMs),
      Number((s.workedMs / 3_600_000).toFixed(2)),
      "Terminée",
      s.note ?? "",
    ];
  });

  return { headers, rows };
}

export function buildSummary(sessions: Session[]): ExportSummary {
  return {
    count: sessions.length,
    totalWorkedMs: sessions.reduce((acc, s) => acc + s.workedMs, 0),
    totalPausedMs: sessions.reduce((acc, s) => acc + s.pausedMs, 0),
    from: sessions.length ? format(new Date(sessions[0].startTime), "yyyy-MM-dd") : "—",
    to: sessions.length
      ? format(new Date(sessions[sessions.length - 1].startTime), "yyyy-MM-dd")
      : "—",
  };
}
