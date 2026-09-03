import { useEffect } from "react";
import { useTimerStore } from "@/store/timerStore";

/**
 * Fait avancer l'horloge du store chaque seconde tant qu'une session est
 * ouverte. Le rendu du temps se fait donc à partir de `now`, jamais d'un
 * compteur incrémenté à la main (robuste aux pauses du timer JS).
 */
export function useTimerTick(): void {
  const hasSession = useTimerStore((s) => s.session !== null);
  const tick = useTimerStore((s) => s.tick);

  useEffect(() => {
    if (!hasSession) return;
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [hasSession, tick]);
}
