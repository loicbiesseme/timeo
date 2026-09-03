# Timeo — suivi du temps de travail

Application de bureau Windows, **100 % hors ligne**, pour chronométrer et analyser
son temps de travail. Aucune connexion, aucun compte : les données vivent dans une
base SQLite locale.

## Stack

| Domaine | Choix | Pourquoi |
| --- | --- | --- |
| Enveloppe desktop | **Tauri 2** | Binaire natif, installeur ~3–8 Mo, RAM réduite, `.exe`/`.msi` en une commande |
| UI | **React 18 + TypeScript + Vite** | Écosystème mûr, itération rapide |
| État | **Zustand** | Store minimal, sans boilerplate |
| Base de données | **SQLite** via `tauri-plugin-sql` | Fichier local, migrations versionnées côté Rust |
| Graphiques | **Recharts** | Composants SVG réactifs |
| Dates | **date-fns** | Léger, tree-shakeable |
| Export | **fflate** (XLSX), **jsPDF** (PDF), CSV natif | Chargés à la demande (code-splitting) |

## Prérequis (build local)

1. **Node.js ≥ 18** (testé avec 22)
2. **Rust** stable — https://rustup.rs
3. **Visual Studio Build Tools** avec la charge de travail « Développement Desktop en C++ »
   (inclut le Windows SDK, indispensable à l'édition de liens)
4. **WebView2** — déjà présent sur Windows 11

Vérifier l'environnement : `npx tauri info` (doit afficher `rustc`, `Cargo` et `MSVC` en ✔).

## Démarrer en développement

```bash
npm install
npm run icons        # génère app-icon.png puis src-tauri/icons/* (à refaire si l'icône change)
npm run tauri dev    # 1er lancement : 3–8 min de compilation Rust, puis la fenêtre s'ouvre
```

## Build de l'exécutable Windows

```bash
npm run tauri build
```

Ce que fait la commande : `tsc --noEmit` → `vite build` → compilation Rust en release → empaquetage.

Sorties dans `src-tauri/target/release/bundle/` :

| Fichier | Type | Notes |
| --- | --- | --- |
| `nsis/Timeo_0.1.0_x64-setup.exe` | **Installeur recommandé** | Installation par utilisateur, **sans droits admin**, sélecteur de langue FR/EN |
| `msi/Timeo_0.1.0_x64_en-US.msi` | Alternative | Requiert les droits administrateur |

L'exécutable seul (non empaqueté) : `src-tauri/target/release/timeo.exe`.

### Changer la version

Mettre à jour `version` dans `package.json` **et** `src-tauri/tauri.conf.json` (garder les deux synchronisés).

### Dépannage build

| Symptôme | Cause / solution |
| --- | --- |
| `program not found: cargo` | Terminal ouvert avant l'install de Rust → ouvrir un **nouveau** terminal |
| `link.exe … LNK1181` / `kernel32.lib introuvable` | Windows SDK absent → installer la charge « Développement Desktop en C++ » des Build Tools |
| `link: extra operand` | Le `link.exe` de Git masque celui de MSVC → un install VS complet + terminal neuf résout ; sinon lancer depuis « x64 Native Tools Command Prompt » |
| Icônes manquantes | `npm run icons` |
| Fenêtre bloquée sur « Chargement… » | Voir la console (F12) ; l'app affiche désormais un bandeau d'erreur explicite |

## Architecture

```
src/
  domain/      modèle métier : repositories (accès SQLite) + agrégations (stats, export)
  store/       état global Zustand : timerStore, settingsStore, dataStore
  lib/         helpers purs : db, time, date, notify, export/
  components/   briques UI réutilisables (Button, Card, Modal, GoalProgress, BarsCard…)
  pages/       écrans : Dashboard, TimerPage, Statistics, History, Settings
  hooks/       useTimerTick, useNotifications
src-tauri/
  migrations/  schéma SQL versionné
  capabilities/ permissions accordées à la fenêtre (sql, fs, dialog, notification)
  src/         point d'entrée Rust + enregistrement des plugins
```

### Persistance du chronomètre

À chaque transition (start / pause / resume / stop) l'état est écrit en base :
temps figé (`worked_ms`, `paused_ms`) + horodatage mural du segment courant
(`last_resumed_at` / `pause_started_at`). Le temps affiché est **recalculé**
depuis `Date.now()` — l'état survit donc à une fermeture de l'app ou à un
redémarrage du PC.

### Emplacement des données

`%APPDATA%\com.timeo.app\timeo.db` (SQLite). Sauvegarde = copie de ce fichier.

## Feuille de route

- [x] 1–6 · Architecture, stack, structure, base de données, chronomètre, persistance
- [x] 7 · Tableau de bord (KPI + graphique)
- [x] 8 · Statistiques détaillées (jour / semaine / mois / année + comparaisons + graphiques)
- [x] 9 · Historique (tableau complet + édition + suppression)
- [x] 10 · Objectifs (progressions jour / semaine / mois / année + reset)
- [x] 11 · Notifications (objectif quotidien atteint, inactivité, session trop longue)
- [x] 12 · Export CSV / Excel / PDF (depuis l'écran Historique)
- [x] 13 · Finitions build Windows (icônes, installeur NSIS par utilisateur, métadonnées, doc)

### Pistes ultérieures (hors périmètre initial)

- Signature de code (certificat Authenticode) pour supprimer l'avertissement SmartScreen
- Auto-updater Tauri (nécessite une paire de clés + un endpoint de mise à jour)
- Détection d'inactivité au niveau système (plugin Rust dédié) plutôt qu'au niveau fenêtre
- Filtrage par plage de dates dans l'export
