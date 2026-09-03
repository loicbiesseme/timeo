import Database from "@tauri-apps/plugin-sql";

/**
 * Connexion SQLite unique et partagée.
 * Le fichier est créé/ouvert dans le dossier de données de l'app
 * (%APPDATA%\com.timeo.app\timeo.db sous Windows) et les migrations
 * déclarées côté Rust sont appliquées à ce moment-là.
 */
let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:timeo.db");
  }
  return dbPromise;
}
