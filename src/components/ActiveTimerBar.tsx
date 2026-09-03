import { useTimerStore, computeElapsed } from "@/store/timerStore";
import { formatHms } from "@/lib/time";

/**
 * Bandeau permanent affiché en haut de l'application dès qu'une session est
 * ouverte (en cours ou en pause). Cliquer dessus ouvre la page Chronomètre.
 */
export function ActiveTimerBar({ onOpenTimer }: { onOpenTimer: () => void }) {
  const session = useTimerStore((s) => s.session);
  const now = useTimerStore((s) => s.now);

  if (!session) return null;

  const { workedMs } = computeElapsed(session, now);
  const paused = session.status === "paused";

  return (
    <button
      className={"active-bar" + (paused ? " is-paused" : "")}
      onClick={onOpenTimer}
      type="button"
    >
      <span className="active-bar-pulse" />
      <span className="active-bar-label">{paused ? "Session en pause" : "Session en cours"}</span>
      <span className="active-bar-time">{formatHms(workedMs)}</span>
      <span className="active-bar-cta">Ouvrir le chronomètre →</span>
    </button>
  );
}
