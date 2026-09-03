import { useSettingsStore } from "@/store/settingsStore";
import { Card } from "@/components/Card";
import { InfoHint } from "@/components/InfoHint";
import { notify, ensureNotificationPermission } from "@/lib/notify";
import type { AppSettings } from "@/domain/types";

export function Settings() {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);

  if (!settings) {
    return (
      <div className="page">
        <div className="loading">Chargement…</div>
      </div>
    );
  }

  const setGoalHours = (key: keyof AppSettings, hours: number) => {
    if (Number.isFinite(hours) && hours >= 0) {
      void update({ [key]: Math.round(hours * 60) } as Partial<AppSettings>);
    }
  };

  return (
    <div className="page settings-page">
      <h1 className="page-title">Paramètres</h1>

      <Card
        title="Objectifs"
        actions={
          <button
            className="icon-btn"
            onClick={() =>
              void update({
                dailyGoalMin: 480,
                weeklyGoalMin: 2400,
                monthlyGoalMin: 9600,
                yearlyGoalMin: 115200,
              })
            }
          >
            Valeurs standard (8h / 40h / 160h)
          </button>
        }
      >
        <Field label="Objectif quotidien (heures)">
          <input
            key={`daily-${settings.dailyGoalMin}`}
            type="number"
            min={0}
            step={0.25}
            defaultValue={settings.dailyGoalMin / 60}
            onBlur={(e) => setGoalHours("dailyGoalMin", Number(e.target.value))}
          />
        </Field>
        <Field label="Objectif hebdomadaire (heures)">
          <input
            key={`weekly-${settings.weeklyGoalMin}`}
            type="number"
            min={0}
            step={0.5}
            defaultValue={settings.weeklyGoalMin / 60}
            onBlur={(e) => setGoalHours("weeklyGoalMin", Number(e.target.value))}
          />
        </Field>
        <Field label="Objectif mensuel (heures)">
          <input
            key={`monthly-${settings.monthlyGoalMin}`}
            type="number"
            min={0}
            step={1}
            defaultValue={settings.monthlyGoalMin / 60}
            onBlur={(e) => setGoalHours("monthlyGoalMin", Number(e.target.value))}
          />
        </Field>
        <Field label="Objectif annuel (heures)">
          <input
            key={`yearly-${settings.yearlyGoalMin}`}
            type="number"
            min={0}
            step={10}
            defaultValue={settings.yearlyGoalMin / 60}
            onBlur={(e) => setGoalHours("yearlyGoalMin", Number(e.target.value))}
          />
        </Field>
      </Card>

      <Card title="Apparence & semaine">
        <Field label="Thème">
          <select
            value={settings.theme}
            onChange={(e) => void update({ theme: e.target.value as AppSettings["theme"] })}
          >
            <option value="system">Système</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </Field>
        <Field
          label="La semaine commence le lundi"
          hint="Détermine le premier jour des semaines dans les statistiques et l'objectif hebdomadaire. Décochez pour commencer le dimanche."
        >
          <input
            type="checkbox"
            checked={settings.weekStartsMonday}
            onChange={(e) => void update({ weekStartsMonday: e.target.checked })}
          />
        </Field>
      </Card>

      <Card
        title="Notifications"
        actions={
          <button
            className="icon-btn"
            onClick={() => void notify("Test Timeo", "Les notifications fonctionnent 🎉")}
          >
            Tester
          </button>
        }
      >
        <Field
          label="Activer les notifications"
          hint="Autorise Timeo à afficher des notifications Windows : objectif quotidien atteint, inactivité prolongée, session ouverte depuis trop longtemps."
        >
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={(e) => {
              const on = e.target.checked;
              void update({ notificationsEnabled: on });
              if (on) void ensureNotificationPermission();
            }}
          />
        </Field>
        <Field
          label="Seuil d'inactivité (minutes)"
          hint="Pendant qu'une session tourne, si vous ne touchez plus l'application pendant ce nombre de minutes, Timeo vous rappelle de la mettre en pause (au cas où vous auriez été interrompu). Mettez 0 pour désactiver ce rappel."
        >
          <input
            key={`idle-${settings.idleThresholdMin}`}
            type="number"
            min={0}
            step={1}
            defaultValue={settings.idleThresholdMin}
            onBlur={(e) =>
              void update({ idleThresholdMin: Math.max(0, Math.round(Number(e.target.value))) })
            }
          />
        </Field>
        <Field
          label="Alerte session longue (heures)"
          hint="Si une session reste ouverte plus longtemps que cette durée, Timeo vous prévient : c'est souvent le signe qu'on a oublié de cliquer sur « Terminer la session ». Mettez 0 pour désactiver l'alerte."
        >
          <input
            key={`long-${settings.longSessionThresholdMin}`}
            type="number"
            min={0}
            step={0.5}
            defaultValue={settings.longSessionThresholdMin / 60}
            onBlur={(e) =>
              void update({
                longSessionThresholdMin: Math.max(0, Math.round(Number(e.target.value) * 60)),
              })
            }
          />
        </Field>
      </Card>

      <p className="settings-note">
        Toutes vos données restent sur cet ordinateur. Aucun compte, aucune connexion Internet
        nécessaire.
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="form-row">
      <label>
        {label}
        {hint && <InfoHint text={hint} />}
      </label>
      {children}
    </div>
  );
}
