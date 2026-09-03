import {
  format,
  isWithinInterval,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import { fr } from "date-fns/locale";
import { listCompletedSessions } from "./sessionRepo";
import type { Session } from "./types";
import { dayRange, weekRange, monthRange, yearRange, type Range } from "@/lib/date";

/**
 * Agrégations calculées en mémoire à partir des sessions terminées.
 * Le volume de données (usage personnel) reste modeste : une lecture complète
 * suivie d'un regroupement JS est largement suffisant et bien plus souple
 * que des requêtes SQL d'agrégation.
 */

const MS_PER_HOUR = 3_600_000;
const hoursOf = (ms: number): number => Number((ms / MS_PER_HOUR).toFixed(2));
const weekOpts = (mondayStart: boolean) => ({ weekStartsOn: (mondayStart ? 1 : 0) as 0 | 1 });
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Barre générique pour tous les graphiques de statistiques. */
export interface Bar {
  key: string;
  label: string;
  hours: number;
  workedMs: number;
}

interface DayBucket {
  date: string; // yyyy-MM-dd
  workedMs: number;
  pausedMs: number;
  sessions: number;
  firstStartMs: number | null;
  lastEndMs: number | null;
}

function bucketByDay(sessions: Session[]): Map<string, DayBucket> {
  const map = new Map<string, DayBucket>();
  for (const s of sessions) {
    const start = new Date(s.startTime);
    const key = format(start, "yyyy-MM-dd");
    let bucket = map.get(key);
    if (!bucket) {
      bucket = {
        date: key,
        workedMs: 0,
        pausedMs: 0,
        sessions: 0,
        firstStartMs: null,
        lastEndMs: null,
      };
      map.set(key, bucket);
    }
    bucket.workedMs += s.workedMs;
    bucket.pausedMs += s.pausedMs;
    bucket.sessions += 1;

    const startMs = start.getTime();
    if (bucket.firstStartMs === null || startMs < bucket.firstStartMs) bucket.firstStartMs = startMs;
    const endMs = s.endTime ? new Date(s.endTime).getTime() : startMs + s.workedMs + s.pausedMs;
    if (bucket.lastEndMs === null || endMs > bucket.lastEndMs) bucket.lastEndMs = endMs;
  }
  return map;
}

function sumWorkedInInterval(byDay: Map<string, DayBucket>, start: Date, end: Date): number {
  let total = 0;
  for (const d of eachDayOfInterval({ start, end })) {
    total += byDay.get(format(d, "yyyy-MM-dd"))?.workedMs ?? 0;
  }
  return total;
}

function countWorkedDays(byDay: Map<string, DayBucket>, start: Date, end: Date): number {
  let count = 0;
  for (const bucket of byDay.values()) {
    if (bucket.workedMs <= 0) continue;
    const d = new Date(`${bucket.date}T00:00:00`);
    if (d >= start && d <= end) count += 1;
  }
  return count;
}

function bestDayInInterval(byDay: Map<string, DayBucket>, start: Date, end: Date): Bar | null {
  let best: Bar | null = null;
  for (const bucket of byDay.values()) {
    if (bucket.workedMs <= 0) continue;
    const d = new Date(`${bucket.date}T00:00:00`);
    if (d < start || d > end) continue;
    if (!best || bucket.workedMs > best.workedMs) {
      best = {
        key: bucket.date,
        label: cap(format(d, "EEEE d MMM", { locale: fr })),
        hours: hoursOf(bucket.workedMs),
        workedMs: bucket.workedMs,
      };
    }
  }
  return best;
}

// ==========================================================================
// Dashboard : KPI globaux + série 14 jours (conservés tels quels)
// ==========================================================================

export interface Kpis {
  todayWorkedMs: number;
  todaySessions: number;
  weekWorkedMs: number;
  monthWorkedMs: number;
  yearWorkedMs: number;
  dailyAvgMs: number;
  bestDay: { date: string; workedMs: number } | null;
  totalWorkedMs: number;
}

export interface DayPoint {
  date: string;
  label: string;
  hours: number;
}

function inRange(s: Session, r: Range): boolean {
  return isWithinInterval(new Date(s.startTime), { start: r.start, end: r.end });
}

function sumWorked(sessions: Session[]): number {
  return sessions.reduce((acc, s) => acc + s.workedMs, 0);
}

export async function computeKpis(mondayStart = true): Promise<Kpis> {
  const all = await listCompletedSessions();
  const byDay = bucketByDay(all);

  let bestDay: Kpis["bestDay"] = null;
  for (const bucket of byDay.values()) {
    if (!bestDay || bucket.workedMs > bestDay.workedMs) {
      bestDay = { date: bucket.date, workedMs: bucket.workedMs };
    }
  }

  const totalWorkedMs = sumWorked(all);
  const activeDays = Math.max(1, byDay.size);
  const today = all.filter((s) => inRange(s, dayRange()));

  return {
    todayWorkedMs: sumWorked(today),
    todaySessions: today.length,
    weekWorkedMs: sumWorked(all.filter((s) => inRange(s, weekRange(new Date(), mondayStart)))),
    monthWorkedMs: sumWorked(all.filter((s) => inRange(s, monthRange()))),
    yearWorkedMs: sumWorked(all.filter((s) => inRange(s, yearRange()))),
    dailyAvgMs: totalWorkedMs / activeDays,
    bestDay,
    totalWorkedMs,
  };
}

/** Temps réellement travaillé aujourd'hui (sessions terminées uniquement). */
export async function workedTodayMs(): Promise<number> {
  const all = await listCompletedSessions();
  return sumWorked(all.filter((s) => inRange(s, dayRange())));
}

export async function dailySeries(days: number): Promise<DayPoint[]> {
  const byDay = bucketByDay(await listCompletedSessions());
  const end = new Date();
  const start = subDays(end, days - 1);
  return eachDayOfInterval({ start, end }).map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { date: key, label: format(d, "dd/MM"), hours: hoursOf(byDay.get(key)?.workedMs ?? 0) };
  });
}

// ==========================================================================
// Statistiques par période
// ==========================================================================

export interface DailyStats {
  kind: "day";
  label: string;
  workedMs: number;
  pausedMs: number;
  sessions: number;
  avgSessionMs: number;
  firstStartMs: number | null;
  lastEndMs: number | null;
  deltaVsPrevMs: number;
  context: Bar[]; // 7 jours glissants finissant à la date choisie
}

export interface WeeklyStats {
  kind: "week";
  label: string;
  totalMs: number;
  dailyAvgMs: number;
  workedDays: number;
  mostProductive: Bar | null;
  leastProductive: Bar | null;
  deltaVsPrevMs: number;
  byDay: Bar[]; // 7 entrées
}

export interface MonthlyStats {
  kind: "month";
  label: string;
  totalMs: number;
  dailyAvgMs: number;
  workedDays: number;
  bestDay: Bar | null;
  deltaVsPrevMs: number;
  byWeek: Bar[];
}

export interface YearlyStats {
  kind: "year";
  label: string;
  totalMs: number;
  monthlyAvgMs: number;
  workedDays: number;
  bestMonth: Bar | null;
  deltaVsPrevMs: number;
  byMonth: Bar[]; // 12 entrées
}

export async function dailyStats(ref: Date): Promise<DailyStats> {
  const byDay = bucketByDay(await listCompletedSessions());
  const bucket = byDay.get(format(ref, "yyyy-MM-dd"));
  const prev = byDay.get(format(subDays(ref, 1), "yyyy-MM-dd"));
  const workedMs = bucket?.workedMs ?? 0;

  const context = eachDayOfInterval({ start: subDays(ref, 6), end: ref }).map<Bar>((d) => {
    const key = format(d, "yyyy-MM-dd");
    const ms = byDay.get(key)?.workedMs ?? 0;
    return { key, label: cap(format(d, "EEE", { locale: fr })), hours: hoursOf(ms), workedMs: ms };
  });

  return {
    kind: "day",
    label: cap(format(ref, "EEEE d MMMM yyyy", { locale: fr })),
    workedMs,
    pausedMs: bucket?.pausedMs ?? 0,
    sessions: bucket?.sessions ?? 0,
    avgSessionMs: bucket && bucket.sessions > 0 ? bucket.workedMs / bucket.sessions : 0,
    firstStartMs: bucket?.firstStartMs ?? null,
    lastEndMs: bucket?.lastEndMs ?? null,
    deltaVsPrevMs: workedMs - (prev?.workedMs ?? 0),
    context,
  };
}

export async function weeklyStats(ref: Date, mondayStart = true): Promise<WeeklyStats> {
  const byDay = bucketByDay(await listCompletedSessions());
  const opts = weekOpts(mondayStart);
  const start = startOfWeek(ref, opts);
  const end = endOfWeek(ref, opts);

  const byDayBars = eachDayOfInterval({ start, end }).map<Bar>((d) => {
    const key = format(d, "yyyy-MM-dd");
    const ms = byDay.get(key)?.workedMs ?? 0;
    return { key, label: cap(format(d, "EEE", { locale: fr })), hours: hoursOf(ms), workedMs: ms };
  });

  const worked = byDayBars.filter((b) => b.workedMs > 0);
  const totalMs = byDayBars.reduce((acc, b) => acc + b.workedMs, 0);
  const prevTotalMs = sumWorkedInInterval(
    byDay,
    startOfWeek(subWeeks(ref, 1), opts),
    endOfWeek(subWeeks(ref, 1), opts)
  );

  return {
    kind: "week",
    label: cap(`semaine du ${format(start, "d MMMM yyyy", { locale: fr })}`),
    totalMs,
    dailyAvgMs: worked.length > 0 ? totalMs / worked.length : 0,
    workedDays: worked.length,
    mostProductive: worked.reduce<Bar | null>((m, b) => (!m || b.workedMs > m.workedMs ? b : m), null),
    leastProductive: worked.reduce<Bar | null>((m, b) => (!m || b.workedMs < m.workedMs ? b : m), null),
    deltaVsPrevMs: totalMs - prevTotalMs,
    byDay: byDayBars,
  };
}

export async function monthlyStats(ref: Date, mondayStart = true): Promise<MonthlyStats> {
  const byDay = bucketByDay(await listCompletedSessions());
  const opts = weekOpts(mondayStart);
  const start = startOfMonth(ref);
  const end = endOfMonth(ref);

  const byWeek = eachWeekOfInterval({ start, end }, opts).map<Bar>((weekStart) => {
    const from = weekStart < start ? start : weekStart;
    const to = endOfWeek(weekStart, opts) > end ? end : endOfWeek(weekStart, opts);
    const ms = sumWorkedInInterval(byDay, from, to);
    return {
      key: format(weekStart, "yyyy-MM-dd"),
      label: format(from, "d MMM", { locale: fr }),
      hours: hoursOf(ms),
      workedMs: ms,
    };
  });

  const totalMs = sumWorkedInInterval(byDay, start, end);
  const workedDays = countWorkedDays(byDay, start, end);
  const prevTotalMs = sumWorkedInInterval(
    byDay,
    startOfMonth(subMonths(ref, 1)),
    endOfMonth(subMonths(ref, 1))
  );

  return {
    kind: "month",
    label: cap(format(ref, "MMMM yyyy", { locale: fr })),
    totalMs,
    dailyAvgMs: workedDays > 0 ? totalMs / workedDays : 0,
    workedDays,
    bestDay: bestDayInInterval(byDay, start, end),
    deltaVsPrevMs: totalMs - prevTotalMs,
    byWeek,
  };
}

export async function yearlyStats(ref: Date): Promise<YearlyStats> {
  const byDay = bucketByDay(await listCompletedSessions());
  const start = startOfYear(ref);
  const end = endOfYear(ref);

  const byMonth = eachMonthOfInterval({ start, end }).map<Bar>((monthStart) => {
    const ms = sumWorkedInInterval(byDay, monthStart, endOfMonth(monthStart));
    return {
      key: format(monthStart, "yyyy-MM"),
      label: cap(format(monthStart, "MMM", { locale: fr })),
      hours: hoursOf(ms),
      workedMs: ms,
    };
  });

  const totalMs = byMonth.reduce((acc, b) => acc + b.workedMs, 0);
  const prevTotalMs = sumWorkedInInterval(
    byDay,
    startOfYear(subYears(ref, 1)),
    endOfYear(subYears(ref, 1))
  );

  return {
    kind: "year",
    label: format(ref, "yyyy"),
    totalMs,
    monthlyAvgMs: totalMs / 12,
    workedDays: countWorkedDays(byDay, start, end),
    bestMonth: byMonth.reduce<Bar | null>(
      (best, bar) => (bar.workedMs > 0 && (!best || bar.workedMs > best.workedMs) ? bar : best),
      null
    ),
    deltaVsPrevMs: totalMs - prevTotalMs,
    byMonth,
  };
}
