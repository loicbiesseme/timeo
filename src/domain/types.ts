export type SessionStatus = "active" | "paused" | "completed";

/** Ligne brute telle que renvoyée par SQLite (snake_case). */
export interface SessionRow {
  id: number;
  start_time: string;
  end_time: string | null;
  status: SessionStatus;
  worked_ms: number;
  paused_ms: number;
  last_resumed_at: string | null;
  pause_started_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** Modèle applicatif (camelCase). */
export interface Session {
  id: number;
  startTime: string;
  endTime: string | null;
  status: SessionStatus;
  /** Temps travaillé figé (hors segment en cours). */
  workedMs: number;
  /** Temps de pause figé (hors pause en cours). */
  pausedMs: number;
  lastResumedAt: string | null;
  pauseStartedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  dailyGoalMin: number;
  weeklyGoalMin: number;
  monthlyGoalMin: number;
  yearlyGoalMin: number;
  weekStartsMonday: boolean;
  notificationsEnabled: boolean;
  idleThresholdMin: number;
  longSessionThresholdMin: number;
  theme: "system" | "light" | "dark";
}
