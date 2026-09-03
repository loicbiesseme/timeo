import { create } from "zustand";

/**
 * Compteur de version des données. Incrémenté après toute mutation
 * (fin de session, édition ou suppression dans l'historique) pour forcer
 * le rafraîchissement des vues dérivées (dashboard, statistiques).
 */
interface DataState {
  version: number;
  bump: () => void;
}

export const useDataVersion = create<DataState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));
