import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './axios';

export type Role = 'gerant' | 'caissier' | 'vendeur';
export interface AuthUser { id: number; username: string; nom: string; prenom: string; telephone?: string; role: Role; actif: boolean; lastLoginAt?: string | null; }
interface AuthState {
  token: string | null;
  user: AuthUser | null;
  magasinId: number | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(persist((set) => ({
  token: null,
  user: null,
  magasinId: null,
  login: async (username, password) => {
    const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', { username, password });
    const payload = JSON.parse(atob(data.token.split('.')[1])) as { magasinId?: number | null };
    set({ token: data.token, user: data.user, magasinId: payload.magasinId ?? null });
  },
  logout: () => set({ token: null, user: null, magasinId: null }),
}), { name: 'station-auth' }));

export function useMagasinId() {
  return useAuthStore((state) => state.magasinId);
}
