import { useEffect, useState, type FC } from "react";
import { Sidebar, type PageKey } from "@/components/Sidebar";
import { ActiveTimerBar } from "@/components/ActiveTimerBar";
import { Dashboard } from "@/pages/Dashboard";
import { TimerPage } from "@/pages/TimerPage";
import { Statistics } from "@/pages/Statistics";
import { History } from "@/pages/History";
import { Settings } from "@/pages/Settings";
import { useTimerStore } from "@/store/timerStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTimerTick } from "@/hooks/useTimerTick";
import { useNotifications } from "@/hooks/useNotifications";

const PAGES: Record<PageKey, FC> = {
  dashboard: Dashboard,
  timer: TimerPage,
  stats: Statistics,
  history: History,
  settings: Settings,
};

export function App() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const timerReady = useTimerStore((s) => s.ready);
  const settingsReady = useSettingsStore((s) => s.ready);
  const dbError = useSettingsStore((s) => s.error) ?? useTimerStore((s) => s.error);

  useTimerTick();
  useNotifications();

  useEffect(() => {
    void useSettingsStore.getState().load();
    void useTimerStore.getState().init();

    // Re-synchronisation quand la fenêtre reprend le focus (retour de veille,
    // PC redémarré, app rouverte) : on relit l'état depuis la base.
    const resync = () => void useTimerStore.getState().init();
    window.addEventListener("focus", resync);
    document.addEventListener("visibilitychange", resync);
    return () => {
      window.removeEventListener("focus", resync);
      document.removeEventListener("visibilitychange", resync);
    };
  }, []);

  const Page = PAGES[page];
  const ready = timerReady && settingsReady;

  return (
    <div className="app-shell">
      <Sidebar page={page} onNavigate={setPage} />
      <div className="app-main">
        {dbError && (
          <div className="db-error" role="alert">
            <strong>Problème d'accès à la base locale.</strong>
            <span>{dbError}</span>
            <span className="db-error-hint">
              Vérifiez le terminal <code>npm run tauri dev</code> et la console (F12). L'app
              fonctionne en mode dégradé (données non persistées).
            </span>
          </div>
        )}
        <ActiveTimerBar onOpenTimer={() => setPage("timer")} />
        <main className="app-content">
          {ready ? <Page /> : <div className="loading">Chargement…</div>}
        </main>
      </div>
    </div>
  );
}
