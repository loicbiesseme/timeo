import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { useTimerStore, computeElapsed } from "@/store/timerStore";
import { useSettingsStore } from "@/store/settingsStore";
import { workedTodayMs } from "@/domain/stats";
import { notify } from "@/lib/notify";
import { formatHm } from "@/lib/time";

const GOAL_KEY = "timeo.notif.goalDate";
const LONG_KEY = "timeo.notif.longSession";
const CHECK_INTERVAL_MS = 30_000;

/**
 * Moteur de notifications, monté une fois au niveau de l'app :
 *  1. objectif quotidien atteint (une fois par jour) ;
 *  2. inactivité prolongée pendant une session active (activité fenêtre) ;
 *  3. session ouverte depuis une durée anormalement longue (une fois par session).
 *
 * Note : la détection d'inactivité s'appuie sur les événements de la fenêtre
 * de l'app (souris / clavier / focus), pas sur l'inactivité système globale.
 */
export function useNotifications(): void {
  const lastActivity = useRef(Date.now());
  const idleNotified = useRef(false);

  useEffect(() => {
    const markActivity = () => {
      lastActivity.current = Date.now();
      idleNotified.current = false;
    };
    const events = ["mousemove", "mousedown", "keydown", "wheel", "touchstart", "focus"];
    events.forEach((evt) => window.addEventListener(evt, markActivity, { passive: true }));

    let cancelled = false;

    const check = async () => {
      const settings = useSettingsStore.getState().settings;
      if (!settings || !settings.notificationsEnabled) return;

      const { session } = useTimerStore.getState();
      const nowMs = Date.now();

      // 1. Objectif quotidien atteint
      const today = format(new Date(), "yyyy-MM-dd");
      if (settings.dailyGoalMin > 0 && localStorage.getItem(GOAL_KEY) !== today) {
        const base = await workedTodayMs();
        if (cancelled) return;
        const live = session ? computeElapsed(session, Date.now()).workedMs : 0;
        if (base + live >= settings.dailyGoalMin * 60_000) {
          localStorage.setItem(GOAL_KEY, today);
          await notify(
            "Objectif quotidien atteint 🎯",
            `Vous avez travaillé ${formatHm(base + live)} aujourd'hui.`
          );
        }
      }

      // 2. Inactivité prolongée pendant une session active
      if (
        session &&
        session.status === "active" &&
        settings.idleThresholdMin > 0 &&
        !idleNotified.current
      ) {
        const idleMs = nowMs - lastActivity.current;
        if (idleMs >= settings.idleThresholdMin * 60_000) {
          idleNotified.current = true;
          await notify(
            "Inactivité détectée 💤",
            `Aucune activité depuis ${formatHm(idleMs)}. Pensez à mettre la session en pause si vous avez fait une coupure.`
          );
        }
      }

      // 3. Session anormalement longue
      if (session && settings.longSessionThresholdMin > 0) {
        const elapsed = nowMs - new Date(session.startTime).getTime();
        if (
          elapsed >= settings.longSessionThresholdMin * 60_000 &&
          localStorage.getItem(LONG_KEY) !== String(session.id)
        ) {
          localStorage.setItem(LONG_KEY, String(session.id));
          await notify(
            "Session très longue ⏰",
            `Votre session est ouverte depuis ${formatHm(elapsed)}. Avez-vous oublié de la terminer ?`
          );
        }
      }
    };

    void check();
    const intervalId = window.setInterval(() => void check(), CHECK_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      events.forEach((evt) => window.removeEventListener(evt, markActivity));
    };
  }, []);
}
