-- Schéma initial de Timeo
-- Toutes les dates sont stockées en ISO 8601 UTC ("2026-09-03T08:00:00.000Z")
-- pour rester comparables lexicographiquement.

PRAGMA foreign_keys = ON;

-- --------------------------------------------------------------------------
-- Sessions de travail
-- --------------------------------------------------------------------------
--  worked_ms        : temps réellement travaillé déjà "figé" (hors segment en cours)
--  paused_ms        : temps de pause déjà "figé" (hors pause en cours)
--  last_resumed_at  : début du segment de travail en cours (NULL si en pause / terminé)
--  pause_started_at : début de la pause en cours (NULL si active / terminé)
--
--  Temps travaillé "live" = worked_ms + (now - last_resumed_at) si status = 'active'
--  Cette approche permet de retrouver l'état exact après fermeture de l'app
--  ou redémarrage du PC : seule l'horloge murale est nécessaire.
CREATE TABLE IF NOT EXISTS sessions (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time       TEXT    NOT NULL,
    end_time         TEXT,
    status           TEXT    NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'paused', 'completed')),
    worked_ms        INTEGER NOT NULL DEFAULT 0,
    paused_ms        INTEGER NOT NULL DEFAULT 0,
    last_resumed_at  TEXT,
    pause_started_at TEXT,
    note             TEXT,
    created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions (start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_status     ON sessions (status);

-- --------------------------------------------------------------------------
-- Paramètres applicatifs (ligne unique, id = 1)
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
    id                         INTEGER PRIMARY KEY CHECK (id = 1),
    daily_goal_min             INTEGER NOT NULL DEFAULT 480,     -- 8 h
    weekly_goal_min            INTEGER NOT NULL DEFAULT 2400,    -- 40 h
    monthly_goal_min           INTEGER NOT NULL DEFAULT 9600,    -- 160 h
    yearly_goal_min            INTEGER NOT NULL DEFAULT 115200,  -- 1920 h
    week_starts_monday         INTEGER NOT NULL DEFAULT 1,
    notifications_enabled      INTEGER NOT NULL DEFAULT 1,
    idle_threshold_min         INTEGER NOT NULL DEFAULT 15,
    long_session_threshold_min INTEGER NOT NULL DEFAULT 600,     -- 10 h
    theme                      TEXT    NOT NULL DEFAULT 'system'
                                       CHECK (theme IN ('system', 'light', 'dark')),
    updated_at                 TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO app_settings (id) VALUES (1);
