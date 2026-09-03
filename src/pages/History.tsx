import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  listCompletedSessions,
  updateSession,
  deleteSession,
} from "@/domain/sessionRepo";
import type { Session } from "@/domain/types";
import { useDataVersion } from "@/store/dataStore";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { ExportMenu } from "@/components/ExportMenu";
import { formatHm, formatClock } from "@/lib/time";

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

interface Row {
  session: Session;
  start: Date;
  end: Date | null;
  totalMs: number;
}

export function History() {
  const bump = useDataVersion((s) => s.bump);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Session | null>(null);
  const [deleting, setDeleting] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const sessions = await listCompletedSessions();
      setRows(
        sessions.map((session) => {
          const start = new Date(session.startTime);
          const end = session.endTime ? new Date(session.endTime) : null;
          return {
            session,
            start,
            end,
            totalMs: end ? end.getTime() - start.getTime() : session.workedMs + session.pausedMs,
          };
        })
      );
      setError(null);
    } catch (e) {
      setError(String(e));
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleSaved = async () => {
    setEditing(null);
    await reload();
    bump();
  };

  const handleDeleteConfirmed = async () => {
    if (!deleting) return;
    try {
      await deleteSession(deleting.id);
    } catch (e) {
      setError(String(e));
    }
    setDeleting(null);
    await reload();
    bump();
  };

  return (
    <div className="page history-page">
      <div className="page-header">
        <h1 className="page-title">Historique</h1>
        <ExportMenu />
      </div>

      {error && <div className="db-error">{error}</div>}

      {rows === null ? (
        <div className="loading">Chargement…</div>
      ) : rows.length === 0 ? (
        <div className="placeholder">
          Aucune session enregistrée pour le moment. Lancez un chronomètre depuis l'onglet ⏱️.
        </div>
      ) : (
        <div className="history-scroll">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Durée totale</th>
                <th>Travaillé</th>
                <th>Pause</th>
                <th>Statut</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ session, start, end, totalMs }) => (
                <tr key={session.id}>
                  <td>{format(start, "EEE d MMM yyyy", { locale: fr })}</td>
                  <td className="num">{formatClock(session.startTime)}</td>
                  <td className="num">{end ? formatClock(session.endTime) : "—"}</td>
                  <td className="num">{formatHm(totalMs)}</td>
                  <td className="num">{formatHm(session.workedMs)}</td>
                  <td className="num">{formatHm(session.pausedMs)}</td>
                  <td>
                    <span className="badge">Terminée</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" onClick={() => setEditing(session)}>
                        Modifier
                      </button>
                      <button
                        className="icon-btn danger"
                        onClick={() => setDeleting(session)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditSessionModal
          session={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

      {deleting && (
        <Modal
          title="Supprimer la session"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleting(null)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={() => void handleDeleteConfirmed()}>
                Supprimer définitivement
              </Button>
            </>
          }
        >
          <p>
            Session du{" "}
            <strong>
              {format(new Date(deleting.startTime), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
            </strong>{" "}
            ({formatHm(deleting.workedMs)} travaillées). Cette action est irréversible.
          </p>
        </Modal>
      )}
    </div>
  );
}

function EditSessionModal({
  session,
  onClose,
  onSaved,
}: {
  session: Session;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const start = useMemo(() => new Date(session.startTime), [session.startTime]);
  const end = useMemo(
    () => (session.endTime ? new Date(session.endTime) : new Date(start.getTime() + session.workedMs + session.pausedMs)),
    [session.endTime, session.workedMs, session.pausedMs, start]
  );

  const [date, setDate] = useState(toDateInput(start));
  const [startT, setStartT] = useState(toTimeInput(start));
  const [endT, setEndT] = useState(toTimeInput(end));
  const [workedH, setWorkedH] = useState(Math.floor(session.workedMs / 3_600_000));
  const [workedM, setWorkedM] = useState(Math.round((session.workedMs % 3_600_000) / 60_000));
  const [note, setNote] = useState(session.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startDate = new Date(`${date}T${startT || "00:00"}:00`);
  const endDate = new Date(`${date}T${endT || "00:00"}:00`);
  const totalMs = endDate > startDate ? endDate.getTime() - startDate.getTime() : 0;
  const workedMs = (workedH * 60 + workedM) * 60_000;
  const pausedMs = Math.max(0, totalMs - workedMs);

  const valid =
    Boolean(date && startT && endT) &&
    endDate > startDate &&
    workedMs >= 0 &&
    workedMs <= totalMs;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateSession(session.id, {
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        workedMs,
        pausedMs,
        note: note.trim() || null,
      });
      await onSaved();
    } catch (e) {
      setSaveError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Modifier la session"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!valid || saving} onClick={() => void save()}>
            Enregistrer
          </Button>
        </>
      }
    >
      <div className="field">
        <label>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="field-row">
        <div className="field">
          <label>Heure de début</label>
          <input type="time" value={startT} onChange={(e) => setStartT(e.target.value)} />
        </div>
        <div className="field">
          <label>Heure de fin</label>
          <input type="time" value={endT} onChange={(e) => setEndT(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Temps réellement travaillé</label>
        <div className="worked-inputs">
          <input
            type="number"
            min={0}
            value={workedH}
            onChange={(e) => setWorkedH(Math.max(0, Number(e.target.value)))}
          />
          <span>h</span>
          <input
            type="number"
            min={0}
            max={59}
            value={workedM}
            onChange={(e) => setWorkedM(Math.min(59, Math.max(0, Number(e.target.value))))}
          />
          <span>min</span>
        </div>
      </div>

      <div className="field">
        <label>Note (optionnel)</label>
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <p className="field-hint">
        Durée totale : {formatHm(totalMs)} · Temps de pause calculé : {formatHm(pausedMs)}
      </p>
      {!valid && (
        <p className="field-error">
          Vérifiez que l'heure de fin est après le début et que le temps travaillé ne dépasse pas la
          durée totale.
        </p>
      )}
      {saveError && <p className="field-error">{saveError}</p>}
    </Modal>
  );
}
