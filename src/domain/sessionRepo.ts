import { getDb } from "@/lib/db";
import type { Session, SessionRow } from "./types";

/**
 * Couche d'accès aux données pour les sessions de travail.
 *
 * Modèle de temps : à chaque transition (start / pause / resume / stop) on "fige"
 * le temps écoulé dans `worked_ms` / `paused_ms` et on enregistre l'horodatage
 * mural du nouveau segment (`last_resumed_at` ou `pause_started_at`).
 * Le temps "live" se recalcule ensuite depuis `Date.now()`, ce qui rend l'état
 * robuste à une fermeture de l'app ou à un redémarrage du PC.
 */

function mapRow(r: SessionRow): Session {
  return {
    id: r.id,
    startTime: r.start_time,
    endTime: r.end_time,
    status: r.status,
    workedMs: r.worked_ms,
    pausedMs: r.paused_ms,
    lastResumedAt: r.last_resumed_at,
    pauseStartedAt: r.pause_started_at,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const iso = (ms: number = Date.now()) => new Date(ms).toISOString();

/** Session en cours ou en pause (il ne peut y en avoir qu'une). */
export async function getActiveSession(): Promise<Session | null> {
  const db = await getDb();
  const rows = await db.select<SessionRow[]>(
    "SELECT * FROM sessions WHERE status IN ('active', 'paused') ORDER BY id DESC LIMIT 1"
  );
  return rows.length ? mapRow(rows[0]) : null;
}

export async function getSessionById(id: number): Promise<Session | null> {
  const db = await getDb();
  const rows = await db.select<SessionRow[]>("SELECT * FROM sessions WHERE id = $1", [id]);
  return rows.length ? mapRow(rows[0]) : null;
}

export async function startSession(note?: string): Promise<Session> {
  const existing = await getActiveSession();
  if (existing) return existing; // garde-fou : jamais deux sessions ouvertes

  const db = await getDb();
  const ts = iso();
  const res = await db.execute(
    `INSERT INTO sessions (start_time, status, worked_ms, paused_ms, last_resumed_at, note, created_at, updated_at)
     VALUES ($1, 'active', 0, 0, $1, $2, $1, $1)`,
    [ts, note ?? null]
  );
  return (await getSessionById(res.lastInsertId as number))!;
}

export async function pauseSession(id: number): Promise<Session> {
  const s = await getSessionById(id);
  if (!s || s.status !== "active") return s!;

  const now = Date.now();
  const resumedAt = s.lastResumedAt ? new Date(s.lastResumedAt).getTime() : now;
  const addWorked = Math.max(0, now - resumedAt);

  const db = await getDb();
  const ts = iso(now);
  await db.execute(
    `UPDATE sessions
        SET status = 'paused',
            worked_ms = worked_ms + $1,
            last_resumed_at = NULL,
            pause_started_at = $2,
            updated_at = $2
      WHERE id = $3`,
    [addWorked, ts, id]
  );
  return (await getSessionById(id))!;
}

export async function resumeSession(id: number): Promise<Session> {
  const s = await getSessionById(id);
  if (!s || s.status !== "paused") return s!;

  const now = Date.now();
  const pausedAt = s.pauseStartedAt ? new Date(s.pauseStartedAt).getTime() : now;
  const addPaused = Math.max(0, now - pausedAt);

  const db = await getDb();
  const ts = iso(now);
  await db.execute(
    `UPDATE sessions
        SET status = 'active',
            paused_ms = paused_ms + $1,
            pause_started_at = NULL,
            last_resumed_at = $2,
            updated_at = $2
      WHERE id = $3`,
    [addPaused, ts, id]
  );
  return (await getSessionById(id))!;
}

export async function stopSession(id: number): Promise<Session> {
  const s = await getSessionById(id);
  if (!s || s.status === "completed") return s!;

  const now = Date.now();
  let addWorked = 0;
  let addPaused = 0;
  if (s.status === "active" && s.lastResumedAt) {
    addWorked = Math.max(0, now - new Date(s.lastResumedAt).getTime());
  } else if (s.status === "paused" && s.pauseStartedAt) {
    addPaused = Math.max(0, now - new Date(s.pauseStartedAt).getTime());
  }

  const db = await getDb();
  const ts = iso(now);
  await db.execute(
    `UPDATE sessions
        SET status = 'completed',
            worked_ms = worked_ms + $1,
            paused_ms = paused_ms + $2,
            last_resumed_at = NULL,
            pause_started_at = NULL,
            end_time = $3,
            updated_at = $3
      WHERE id = $4`,
    [addWorked, addPaused, ts, id]
  );
  return (await getSessionById(id))!;
}

// --------------------------------------------------------------------------
// Lecture / édition (historique & statistiques)
// --------------------------------------------------------------------------

export async function listCompletedSessions(opts?: { limit?: number; offset?: number }): Promise<Session[]> {
  const db = await getDb();
  const rows = await db.select<SessionRow[]>(
    "SELECT * FROM sessions WHERE status = 'completed' ORDER BY start_time DESC LIMIT $1 OFFSET $2",
    [opts?.limit ?? 100_000, opts?.offset ?? 0]
  );
  return rows.map(mapRow);
}

export interface SessionPatch {
  startTime?: string;
  endTime?: string | null;
  workedMs?: number;
  pausedMs?: number;
  note?: string | null;
}

export async function updateSession(id: number, patch: SessionPatch): Promise<void> {
  const columns: Record<keyof SessionPatch, string> = {
    startTime: "start_time",
    endTime: "end_time",
    workedMs: "worked_ms",
    pausedMs: "paused_ms",
    note: "note",
  };

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, value] of Object.entries(patch)) {
    const col = columns[key as keyof SessionPatch];
    if (!col) continue;
    sets.push(`${col} = $${i++}`);
    values.push(value ?? null);
  }
  if (sets.length === 0) return;

  values.push(new Date().toISOString(), id);
  const db = await getDb();
  await db.execute(
    `UPDATE sessions SET ${sets.join(", ")}, updated_at = $${i++} WHERE id = $${i}`,
    values
  );
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM sessions WHERE id = $1", [id]);
}
