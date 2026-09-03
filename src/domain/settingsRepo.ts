import { getDb } from "@/lib/db";
import type { AppSettings } from "./types";

interface SettingsRow {
  daily_goal_min: number;
  weekly_goal_min: number;
  monthly_goal_min: number;
  yearly_goal_min: number;
  week_starts_monday: number;
  notifications_enabled: number;
  idle_threshold_min: number;
  long_session_threshold_min: number;
  theme: string;
}

const COLUMNS: Record<keyof AppSettings, string> = {
  dailyGoalMin: "daily_goal_min",
  weeklyGoalMin: "weekly_goal_min",
  monthlyGoalMin: "monthly_goal_min",
  yearlyGoalMin: "yearly_goal_min",
  weekStartsMonday: "week_starts_monday",
  notificationsEnabled: "notifications_enabled",
  idleThresholdMin: "idle_threshold_min",
  longSessionThresholdMin: "long_session_threshold_min",
  theme: "theme",
};

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
  const [r] = await db.select<SettingsRow[]>("SELECT * FROM app_settings WHERE id = 1");
  return {
    dailyGoalMin: r.daily_goal_min,
    weeklyGoalMin: r.weekly_goal_min,
    monthlyGoalMin: r.monthly_goal_min,
    yearlyGoalMin: r.yearly_goal_min,
    weekStartsMonday: !!r.week_starts_monday,
    notificationsEnabled: !!r.notifications_enabled,
    idleThresholdMin: r.idle_threshold_min,
    longSessionThresholdMin: r.long_session_threshold_min,
    theme: (r.theme as AppSettings["theme"]) ?? "system",
  };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  for (const [key, value] of Object.entries(patch)) {
    const col = COLUMNS[key as keyof AppSettings];
    if (!col) continue;
    sets.push(`${col} = $${i++}`);
    values.push(typeof value === "boolean" ? (value ? 1 : 0) : value);
  }
  if (sets.length === 0) return;

  values.push(new Date().toISOString());
  const db = await getDb();
  await db.execute(`UPDATE app_settings SET ${sets.join(", ")}, updated_at = $${i} WHERE id = 1`, values);
}
