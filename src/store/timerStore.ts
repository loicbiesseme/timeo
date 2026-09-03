import { create } from "zustand";
import type { Session } from "@/domain/types";
import * as repo from "@/domain/sessionRepo";
import { useDataVersion } from "./dataStore";

/**
 * État global du chronomètre.
 * La base de données reste la source de vérité : le store n'est qu'un cache
 * réactif rafraîchi à chaque transition et re-synchronisé à l'ouverture de
 * l'app / au retour de focus.
 */

interface TimerState {
  session: Session | null;
  /** Horloge courante, poussée chaque seconde par le hook de tick. */
  now: number;
  ready: boolean;
  busy: boolean;
  error: string | null;

  init: () => Promise<void>;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<Session | null>;
  tick: () => void;
}

/** Temps travaillé / en pause "live" à l'instant `now`. */
export function computeElapsed(
  session: Session | null,
  now: number
): { workedMs: number; pausedMs: number } {
  if (!session) return { workedMs: 0, pausedMs: 0 };

  let workedMs = session.workedMs;
  let pausedMs = session.pausedMs;

  if (session.status === "active" && session.lastResumedAt) {
    workedMs += Math.max(0, now - new Date(session.lastResumedAt).getTime());
  } else if (session.status === "paused" && session.pauseStartedAt) {
    pausedMs += Math.max(0, now - new Date(session.pauseStartedAt).getTime());
  }
  return { workedMs, pausedMs };
}

export const useTimerStore = create<TimerState>((set, get) => ({
  session: null,
  now: Date.now(),
  ready: false,
  busy: false,
  error: null,

  init: async () => {
    if (get().busy) return;
    try {
      const session = await repo.getActiveSession();
      set({ session, now: Date.now(), ready: true, error: null });
    } catch (e) {
      console.error("[timeo] échec de la lecture de la session active :", e);
      set({ ready: true, error: String(e) });
    }
  },

  start: async () => {
    if (get().busy || get().session) return;
    set({ busy: true, error: null });
    try {
      set({ session: await repo.startSession(), now: Date.now() });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ busy: false });
    }
  },

  pause: async () => {
    const s = get().session;
    if (!s || get().busy || s.status !== "active") return;
    set({ busy: true, error: null });
    try {
      set({ session: await repo.pauseSession(s.id), now: Date.now() });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ busy: false });
    }
  },

  resume: async () => {
    const s = get().session;
    if (!s || get().busy || s.status !== "paused") return;
    set({ busy: true, error: null });
    try {
      set({ session: await repo.resumeSession(s.id), now: Date.now() });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ busy: false });
    }
  },

  stop: async () => {
    const s = get().session;
    if (!s || get().busy) return null;
    set({ busy: true, error: null });
    try {
      const done = await repo.stopSession(s.id);
      set({ session: null, now: Date.now() });
      useDataVersion.getState().bump();
      return done;
    } catch (e) {
      set({ error: String(e) });
      return null;
    } finally {
      set({ busy: false });
    }
  },

  tick: () => set({ now: Date.now() }),
}));
