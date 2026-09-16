import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';

export interface Banque { id: number; libelle: string; tel?: string; rib?: string; }
export interface ModePayment { id: number; libelle: string; }
export interface Mouvement { id: number; banqueId: number; modePaymentId: number; date: string; dateEcheance?: string; montant: number; rapproche: boolean; banque: Banque; modePayment: ModePayment; }
export interface Position { banqueId: number; soldeTotal: number; soldeRapproche: number; mouvementsEnAttente: number; commissionEstimee: number; }

export function useBanques() { return useQuery({ queryKey: ['banques'], queryFn: async () => (await api.get<Banque[]>('/banques')).data }); }
export function useModesPayment() { return useQuery({ queryKey: ['banque-modes'], queryFn: async () => (await api.get<ModePayment[]>('/caisse/modes-payment')).data }); }
export function useMouvements(banqueId?: number) { return useQuery({ queryKey: ['mouvements-bancaires', banqueId], queryFn: async () => (await api.get<Mouvement[]>(`/banques/${banqueId}/mouvements`)).data, enabled: Boolean(banqueId) }); }
export function usePositionBanque(banqueId?: number) { return useQuery({ queryKey: ['position-banque', banqueId], queryFn: async () => (await api.get<Position>(`/banques/position/${banqueId}`)).data, enabled: Boolean(banqueId) }); }
export function useBanqueConfig() { return useQuery({ queryKey: ['banque-config'], queryFn: async () => (await api.get('/banques/config')).data }); }
export function useCreateBanque() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { libelle: string; tel?: string; rib?: string }) => api.post('/banques', input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banques'] }) }); }
export function useCreateMouvement() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { banqueId: number; modePaymentId: number; date: string; dateEcheance?: string; montant: number }) => api.post('/banques/mouvements', input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mouvements-bancaires'] }); queryClient.invalidateQueries({ queryKey: ['position-banque'] }); } }); }
export function useRapprocherMouvement() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.patch(`/banques/mouvements/${id}/rapprocher`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['mouvements-bancaires'] }); queryClient.invalidateQueries({ queryKey: ['position-banque'] }); } }); }
export function useSaveBanqueConfig() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { banqueId: number; modePaymentId: number; tauxCommission: number; nbrJoursCompensation: number; tvaCom: number }) => api.post('/banques/config', input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['banque-config'] }) }); }
