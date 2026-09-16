import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from './axios';

export type Role = 'gerant' | 'caissier' | 'vendeur';
export interface AuthUser { id: number; username: string; nom: string; prenom: string; telephone?: string; role: Role; actif: boolean; lastLoginAt?: string | null; }
const decodeJwtPayload = (token: string) => { const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '='))) as { magasinId?: number | null }; };
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
    const payload = decodeJwtPayload(data.token);
    set({ token: data.token, user: data.user, magasinId: payload.magasinId ?? null });
  },
  logout: () => set({ token: null, user: null, magasinId: null }),
}), { name: 'station-auth' }));

export function useMagasinId() {
  return useAuthStore((state) => state.magasinId);
}
