import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';
export interface Carte { id: number; date: string; montant: number; typeCarte: string; fait: boolean; numTicket?: string; }
export interface Extract { id: number; receipt: string; card?: string; product?: string; amount?: number; date?: string; }
export interface Bon { id: number; date: string; montant: number; fait: boolean; numBord?: string; }
export function useCartes() { return useQuery({ queryKey: ['cartes'], queryFn: async () => (await api.get<Carte[]>('/cartes')).data }); }
export function useExtraits() { return useQuery({ queryKey: ['extraits-cn'], queryFn: async () => (await api.get<Extract[]>('/cartes/extraits-cn')).data }); }
export function useBonsStation() { return useQuery({ queryKey: ['bons-station'], queryFn: async () => (await api.get<Bon[]>('/bons-station')).data }); }
export function useValiderCarte() { const q = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.patch(`/cartes/${id}/valider`), onSuccess: () => q.invalidateQueries({ queryKey: ['cartes'] }) }); }
export function useImportCN() { const q = useQueryClient(); return useMutation({ mutationFn: (rows: unknown[]) => api.post('/cartes/import-cn', rows), onSuccess: () => q.invalidateQueries({ queryKey: ['extraits-cn'] }) }); }
