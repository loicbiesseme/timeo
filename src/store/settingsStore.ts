import { create } from "zustand";
import type { AppSettings } from "@/domain/types";
import * as repo from "@/domain/settingsRepo";

interface SettingsState {
  settings: AppSettings | null;
  ready: boolean;
  error: string | null;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

/** Valeurs de repli si la base n'est pas lisible : l'UI reste utilisable. */
const DEFAULT_SETTINGS: AppSettings = {
  dailyGoalMin: 480,
  weeklyGoalMin: 2400,
  monthlyGoalMin: 9600,
  yearlyGoalMin: 115200,
  weekStartsMonday: true,
  notificationsEnabled: true,
  idleThresholdMin: 15,
  longSessionThresholdMin: 600,
  theme: "system",
};

/** Applique le thème résolu sur <html data-theme>. */
export function applyTheme(theme: AppSettings["theme"]): void {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  ready: false,
  error: null,

  load: async () => {
    try {
      const settings = await repo.getSettings();
      applyTheme(settings.theme);
      set({ settings, ready: true, error: null });
    } catch (e) {
      console.error("[timeo] échec du chargement des paramètres :", e);
      applyTheme(DEFAULT_SETTINGS.theme);
      set({ settings: DEFAULT_SETTINGS, ready: true, error: String(e) });
    }
  },

  update: async (patch) => {
    try {
      await repo.updateSettings(patch);
      const settings = await repo.getSettings();
      if (patch.theme) applyTheme(settings.theme);
      set({ settings, error: null });
    } catch (e) {
      console.error("[timeo] échec de la mise à jour des paramètres :", e);
      set({ error: String(e) });
    }
  },
}));
