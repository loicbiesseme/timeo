import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { computeKpis, dailySeries, type Kpis, type DayPoint } from "@/domain/stats";
import { useSettingsStore } from "@/store/settingsStore";
import { useTimerStore, computeElapsed } from "@/store/timerStore";
import { useDataVersion } from "@/store/dataStore";
import { Card } from "@/components/Card";
import { GoalProgress } from "@/components/GoalProgress";
import { formatHm } from "@/lib/time";

export function Dashboard() {
  const settings = useSettingsStore((s) => s.settings);
  const session = useTimerStore((s) => s.session);
  const now = useTimerStore((s) => s.now);
  const dataVersion = useDataVersion((s) => s.version);

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [series, setSeries] = useState<DayPoint[]>([]);
  const [goalsExpanded, setGoalsExpanded] = useState(() => {
    try {
      return localStorage.getItem("timeo.dash.goalsExpanded") === "1";
    } catch {
      return false;
    }
  });

  const toggleGoals = () =>
    setGoalsExpanded((expanded) => {
      const next = !expanded;
      try {
        localStorage.setItem("timeo.dash.goalsExpanded", next ? "1" : "0");
      } catch {
        /* localStorage indisponible : simple confort, on ignore */
      }
      return next;
    });

  // Recharge les agrégats à l'ouverture, quand la session change d'état,
  // et une fois par minute tant qu'une session tourne.
  const minuteBucket = Math.floor(now / 60_000);
  useEffect(() => {
    let alive = true;
    void Promise.all([
      computeKpis(settings?.weekStartsMonday ?? true),
      dailySeries(14),
    ]).then(([k, s]) => {
      if (alive) {
        setKpis(k);
        setSeries(s);
      }
    });
    return () => {
      alive = false;
    };
  }, [settings?.weekStartsMonday, session?.status, minuteBucket, dataVersion]);

  if (!kpis || !settings) {
    return (
      <div className="page">
        <div className="loading">Chargement…</div>
      </div>
    );
  }

  const liveMs = session ? computeElapsed(session, now).workedMs : 0;
  const todayTotal = kpis.todayWorkedMs + liveMs;

  return (
    <div className="page dashboard">
      <h1 className="page-title">Tableau de bord</h1>

      <Card
        title="Objectifs"
        actions={
          <button
            type="button"
            className="card-toggle"
            onClick={toggleGoals}
            aria-expanded={goalsExpanded}
          >
            {goalsExpanded ? "Réduire" : "Tout afficher"}
            <span className={"chevron" + (goalsExpanded ? " is-up" : "")}>⌄</span>
          </button>
        }
      >
        <div className="goals-list">
          <GoalProgress
            label="Aujourd'hui"
            workedMs={todayTotal}
            goalMs={settings.dailyGoalMin * 60_000}
          />
          {goalsExpanded && (
            <>
              <GoalProgress
                label="Cette semaine"
                workedMs={kpis.weekWorkedMs + liveMs}
                goalMs={settings.weeklyGoalMin * 60_000}
              />
              <GoalProgress
                label="Ce mois"
                workedMs={kpis.monthWorkedMs + liveMs}
                goalMs={settings.monthlyGoalMin * 60_000}
              />
              <GoalProgress
                label="Cette année"
                workedMs={kpis.yearWorkedMs + liveMs}
                goalMs={settings.yearlyGoalMin * 60_000}
              />
            </>
          )}
        </div>
      </Card>

      <div className="kpi-grid">
        <Kpi label="Aujourd'hui" value={formatHm(todayTotal)} />
        <Kpi label="Sessions aujourd'hui" value={String(kpis.todaySessions + (session ? 1 : 0))} />
        <Kpi label="Cette semaine" value={formatHm(kpis.weekWorkedMs + liveMs)} />
        <Kpi label="Ce mois" value={formatHm(kpis.monthWorkedMs + liveMs)} />
        <Kpi label="Cette année" value={formatHm(kpis.yearWorkedMs + liveMs)} />
        <Kpi label="Moyenne / jour" value={formatHm(kpis.dailyAvgMs)} />
        <Kpi
          label="Meilleure journée"
          value={kpis.bestDay ? formatHm(kpis.bestDay.workedMs) : "—"}
          sub={kpis.bestDay?.date}
        />
        <Kpi label="Total cumulé" value={formatHm(kpis.totalWorkedMs)} />
      </div>

      <Card title="Évolution sur 14 jours">
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--text-faint)" fontSize={12} tickMargin={8} />
              <YAxis stroke="var(--text-faint)" fontSize={12} width={48} unit="h" tickMargin={4} />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text)",
                }}
                labelStyle={{ color: "var(--text-muted)" }}
                formatter={(value: number) => [`${value} h`, "Travaillé"]}
              />
              <Area
                type="monotone"
                dataKey="hours"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#areaFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
