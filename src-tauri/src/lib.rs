use tauri_plugin_sql::{Migration, MigrationKind};

/// URL de la base locale. DOIT être identique côté frontend (`Database.load`).
const DB_URL: &str = "sqlite:timeo.db";

/// Migrations appliquées automatiquement à l'ouverture de la base.
/// Ajouter une nouvelle entrée (version incrémentée) pour toute évolution du schéma.
fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_schema",
        sql: include_str!("../migrations/0001_init.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("erreur au démarrage de l'application Tauri");
}
