import { formatHm } from "@/lib/time";

interface Props {
  label: string;
  workedMs: number;
  goalMs: number;
}

/** Ligne de progression vers un objectif : barre + pourcentage + reste / dépassement. */
export function GoalProgress({ label, workedMs, goalMs }: Props) {
  const hasGoal = goalMs > 0;
  const ratio = hasGoal ? workedMs / goalMs : 0;
  const pct = Math.round(ratio * 100);
  const clamped = Math.min(100, Math.max(0, pct));
  const reached = hasGoal && workedMs >= goalMs;
  const diffMs = workedMs - goalMs;

  return (
    <div className={"goal-row" + (reached ? " is-reached" : "")}>
      <div className="goal-row-head">
        <span className="goal-row-label">{label}</span>
        <span className="goal-row-values">
          {formatHm(workedMs)} <span className="goal-row-sep">/</span> {formatHm(goalMs)}
        </span>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
      <div className="goal-row-foot">
        <span>{hasGoal ? `${pct} %` : "—"}</span>
        <span>
          {!hasGoal
            ? "Aucun objectif défini"
            : reached
              ? `Objectif atteint · +${formatHm(diffMs)}`
              : `Reste ${formatHm(-diffMs)}`}
        </span>
      </div>
    </div>
  );
}
