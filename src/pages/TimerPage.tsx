import { useTimerStore, computeElapsed } from "@/store/timerStore";
import { Button } from "@/components/Button";
import { formatHms, formatHm, formatClock } from "@/lib/time";

export function TimerPage() {
  const session = useTimerStore((s) => s.session);
  const now = useTimerStore((s) => s.now);
  const busy = useTimerStore((s) => s.busy);
  const error = useTimerStore((s) => s.error);
  const { start, pause, resume, stop } = useTimerStore.getState();

  const { workedMs, pausedMs } = computeElapsed(session, now);
  const status = session?.status ?? "idle";

  return (
    <div className="page timer-page">
      <h1 className="page-title">Chronomètre</h1>

      <div className={`timer-hero status-${status}`}>
        <div className="timer-status-chip">
          {status === "active" && (
            <>
              <span className="dot dot-live" /> En cours
            </>
          )}
          {status === "paused" && (
            <>
              <span className="dot dot-paused" /> En pause
            </>
          )}
          {status === "idle" && <>Prêt à démarrer</>}
        </div>

        <div className="timer-value">{formatHms(workedMs)}</div>

        <div className="timer-meta">
          <div>
            <span>Début</span>
            <strong>{formatClock(session?.startTime ?? null)}</strong>
          </div>
          <div>
            <span>Pause cumulée</span>
            <strong>{formatHm(pausedMs)}</strong>
          </div>
        </div>

        <div className="timer-actions">
          {status === "idle" && (
            <Button variant="primary" size="lg" disabled={busy} onClick={() => void start()}>
              Démarrer une session
            </Button>
          )}
          {status === "active" && (
            <>
              <Button variant="secondary" size="lg" disabled={busy} onClick={() => void pause()}>
                Pause
              </Button>
              <Button variant="danger" size="lg" disabled={busy} onClick={() => void stop()}>
                Terminer la session
              </Button>
            </>
          )}
          {status === "paused" && (
            <>
              <Button variant="success" size="lg" disabled={busy} onClick={() => void resume()}>
                Reprendre
              </Button>
              <Button variant="danger" size="lg" disabled={busy} onClick={() => void stop()}>
                Terminer la session
              </Button>
            </>
          )}
        </div>

        {error && <p className="timer-error">{error}</p>}
      </div>

      <p className="timer-hint">
        Votre session est sauvegardée automatiquement : vous pouvez fermer l'application sans rien
        perdre, le chronomètre reprendra à sa réouverture.
      </p>
    </div>
  );
}
