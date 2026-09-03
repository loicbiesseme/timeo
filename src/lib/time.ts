/** Formatage des durées et des horaires (helpers purs, sans dépendance). */

/** "HH:MM:SS" : affichage principal du chronomètre. */
export function formatHms(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** "6h45" ou "45 min" : statistiques et tableau de bord. */
export function formatHm(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m} min`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** "08:00" à partir d'une date ISO ; "--:--" si null. */
export function formatClock(iso: string | null): string {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function minutesToMs(min: number): number {
  return min * 60_000;
}

export function msToHours(ms: number): number {
  return ms / 3_600_000;
}
