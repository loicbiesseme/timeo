import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  isBefore,
} from "date-fns";
import {
  dailyStats,
  weeklyStats,
  monthlyStats,
  yearlyStats,
  type DailyStats,
  type WeeklyStats,
  type MonthlyStats,
  type YearlyStats,
} from "@/domain/stats";
import { useSettingsStore } from "@/store/settingsStore";
import { useDataVersion } from "@/store/dataStore";
import { StatTile } from "@/components/StatTile";
import { Delta } from "@/components/Delta";
import { BarsCard } from "@/components/BarsCard";
import { formatHm, formatClock } from "@/lib/time";

type Tab = "day" | "week" | "month" | "year";
type Stats = DailyStats | WeeklyStats | MonthlyStats | YearlyStats;

const TABS: { key: Tab; label: string }[] = [
  { key: "day", label: "Jour" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
];

const SHIFT: Record<Tab, (d: Date, dir: number) => Date> = {
  day: (d, dir) => addDays(d, dir),
  week: (d, dir) => addWeeks(d, dir),
  month: (d, dir) => addMonths(d, dir),
  year: (d, dir) => addYears(d, dir),
};

const PERIOD_START: Record<Tab, (d: Date, mondayStart: boolean) => Date> = {
  day: (d) => startOfDay(d),
  week: (d, mondayStart) => startOfWeek(d, { weekStartsOn: mondayStart ? 1 : 0 }),
  month: (d) => startOfMonth(d),
  year: (d) => startOfYear(d),
};

const isoOrNull = (ms: number | null) => (ms == null ? null : new Date(ms).toISOString());

export function Statistics() {
  const settings = useSettingsStore((s) => s.settings);
  const mondayStart = settings?.weekStartsMonday ?? true;

  const dataVersion = useDataVersion((s) => s.version);
  const [tab, setTab] = useState<Tab>("day");
  const [ref, setRef] = useState<Date>(() => new Date());
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let alive = true;
    setStats(null);
    const query: Promise<Stats> =
      tab === "day"
        ? dailyStats(ref)
        : tab === "week"
          ? weeklyStats(ref, mondayStart)
          : tab === "month"
            ? monthlyStats(ref, mondayStart)
            : yearlyStats(ref);
    void query.then((result) => {
      if (alive) setStats(result);
    });
    return () => {
      alive = false;
    };
  }, [tab, ref, mondayStart, dataVersion]);

  const canGoNext = useMemo(
    () => isBefore(PERIOD_START[tab](ref, mondayStart), PERIOD_START[tab](new Date(), mondayStart)),
    [tab, ref, mondayStart]
  );

  const selectTab = (next: Tab) => {
    setTab(next);
    setRef(new Date());
  };

  return (
    <div className="page stats-page">
      <h1 className="page-title">Statistiques</h1>

      <div className="stats-toolbar">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={"tab" + (tab === t.key ? " is-active" : "")}
              onClick={() => selectTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="period-nav">
          <button onClick={() => setRef((d) => SHIFT[tab](d, -1))} aria-label="Période précédente">
            ‹
          </button>
          <span className="period-label">{stats?.label ?? "…"}</span>
          <button
            onClick={() => setRef((d) => SHIFT[tab](d, 1))}
            disabled={!canGoNext}
            aria-label="Période suivante"
          >
            ›
          </button>
        </div>
      </div>

      {!stats || !settings ? (
        <div className="loading">Chargement…</div>
      ) : stats.kind === "day" ? (
        <DailyView s={stats} goalMin={settings.dailyGoalMin} />
      ) : stats.kind === "week" ? (
        <WeeklyView s={stats} goalMin={settings.weeklyGoalMin} />
      ) : stats.kind === "month" ? (
        <MonthlyView s={stats} goalMin={settings.monthlyGoalMin} />
      ) : (
        <YearlyView s={stats} goalMin={settings.yearlyGoalMin} />
      )}
    </div>
  );
}

function GoalBar({ workedMs, goalMs }: { workedMs: number; goalMs: number }) {
  const pct = goalMs > 0 ? Math.min(100, Math.round((workedMs / goalMs) * 100)) : 0;
  return (
    <div className="goal-inline">
      <div className="progress">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="progress-pct">
        {formatHm(workedMs)} / {formatHm(goalMs)} · {pct}%
      </span>
    </div>
  );
}

function DailyView({ s, goalMin }: { s: DailyStats; goalMin: number }) {
  return (
    <>
      <div className="stat-tiles">
        <StatTile
          label="Heures travaillées"
          value={formatHm(s.workedMs)}
          hint={<Delta ms={s.deltaVsPrevMs} zeroLabel="= la veille" />}
        />
        <StatTile label="Sessions" value={s.sessions} />
        <StatTile label="Durée moyenne / session" value={formatHm(s.avgSessionMs)} />
        <StatTile label="Première prise de poste" value={formatClock(isoOrNull(s.firstStartMs))} />
        <StatTile label="Dernière fin" value={formatClock(isoOrNull(s.lastEndMs))} />
        <StatTile label="Temps en pause" value={formatHm(s.pausedMs)} />
      </div>

      <div className="card">
        <div className="card-head">
          <span className="card-title">Objectif quotidien</span>
        </div>
        <GoalBar workedMs={s.workedMs} goalMs={goalMin * 60_000} />
      </div>

      <BarsCard title="7 derniers jours" data={s.context} />
    </>
  );
}

function WeeklyView({ s, goalMin }: { s: WeeklyStats; goalMin: number }) {
  return (
    <>
      <div className="stat-tiles">
        <StatTile
          label="Total travaillé"
          value={formatHm(s.totalMs)}
          hint={<Delta ms={s.deltaVsPrevMs} zeroLabel="= sem. précédente" />}
        />
        <StatTile label="Moyenne / jour travaillé" value={formatHm(s.dailyAvgMs)} />
        <StatTile label="Jours travaillés" value={`${s.workedDays} / 7`} />
        <StatTile
          label="Jour le plus productif"
          value={s.mostProductive ? formatHm(s.mostProductive.workedMs) : "—"}
          hint={s.mostProductive?.label}
        />
        <StatTile
          label="Jour le moins productif"
          value={s.leastProductive ? formatHm(s.leastProductive.workedMs) : "—"}
          hint={s.leastProductive?.label}
        />
        <StatTile label="Objectif hebdo" value={<GoalBar workedMs={s.totalMs} goalMs={goalMin * 60_000} />} />
      </div>

      <BarsCard title="Heures travaillées par jour" data={s.byDay} />
    </>
  );
}

function MonthlyView({ s, goalMin }: { s: MonthlyStats; goalMin: number }) {
  return (
    <>
      <div className="stat-tiles">
        <StatTile
          label="Total travaillé"
          value={formatHm(s.totalMs)}
          hint={<Delta ms={s.deltaVsPrevMs} zeroLabel="= mois précédent" />}
        />
        <StatTile label="Moyenne / jour travaillé" value={formatHm(s.dailyAvgMs)} />
        <StatTile label="Jours travaillés" value={s.workedDays} />
        <StatTile
          label="Meilleure journée"
          value={s.bestDay ? formatHm(s.bestDay.workedMs) : "—"}
          hint={s.bestDay?.label}
        />
        <StatTile label="Objectif mensuel" value={<GoalBar workedMs={s.totalMs} goalMs={goalMin * 60_000} />} />
      </div>

      <BarsCard title="Heures travaillées par semaine" data={s.byWeek} />
    </>
  );
}

function YearlyView({ s, goalMin }: { s: YearlyStats; goalMin: number }) {
  return (
    <>
      <div className="stat-tiles">
        <StatTile
          label="Total travaillé"
          value={formatHm(s.totalMs)}
          hint={<Delta ms={s.deltaVsPrevMs} zeroLabel="= année précédente" />}
        />
        <StatTile label="Moyenne / mois" value={formatHm(s.monthlyAvgMs)} />
        <StatTile label="Jours travaillés" value={s.workedDays} />
        <StatTile
          label="Meilleur mois"
          value={s.bestMonth ? formatHm(s.bestMonth.workedMs) : "—"}
          hint={s.bestMonth?.label}
        />
        <StatTile label="Objectif annuel" value={<GoalBar workedMs={s.totalMs} goalMs={goalMin * 60_000} />} />
      </div>

      <BarsCard title="Heures travaillées par mois" data={s.byMonth} />
    </>
  );
}
