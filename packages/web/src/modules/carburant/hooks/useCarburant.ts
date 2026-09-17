import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';
import { useRealtimeQuery } from '../../../hooks/useRealtimeQuery';
import { SOCKET_EVENTS } from '../../../lib/socket-events';

export interface Pompe { id: number; code: string; libelle: string; prixVente: number; cuve: { id: number; libelle: string }; }
export interface Reference { id: number; code?: string; libelle?: string; nom?: string; type?: 'POS' | 'PISTE'; }
export interface Releve { id: number; date: string; indexOuverture: number; indexFermeture: number | null; prixVente: number; pompe: Pompe; equipe: Reference; caisse: Reference; vendeur: Reference; ca: number | null; }
export interface StockCuve { id: number; code: string; libelle: string; carburant: string; stockActuel: number; volumeTotal: number; pourcentage: number; }
export interface Cuve { id: number; code: string; libelle: string; carburant: string; volumeTotal: number; stock: number; }
export interface SessionSuggestion { caisseType: 'POS' | 'PISTE'; pompes: Array<{ pompeId: number; libelle: string; cuveId: number; cuveLibelle: string; indexOuvertureSuggere: number; sourceSuggestion: string }>; soldePrecedent: number; sourceSession: string | null; cuves: Array<{ cuveId: number; libelle: string; stockTheorique: number; dernierJaugeage: number | null }>; hasOpenSession: boolean; openSessionEquipe: string | null; }
export interface SessionStatus { equipeId: number; equipeLibelle: string; statut: 'OUVERT' | 'FERME' | 'NON_OUVERT'; heureOuverture: string | null; heureFermeture: string | null; ecart: number | null; }

export function usePompes() { return useQuery({ queryKey: ['pompes'], queryFn: async () => (await api.get<Pompe[]>('/pompes')).data }); }
export function useEquipes() { return useQuery({ queryKey: ['equipes'], queryFn: async () => (await api.get<Reference[]>('/equipes')).data }); }
export function useCaisses() { return useQuery({ queryKey: ['caisses'], queryFn: async () => (await api.get<Reference[]>('/caisses')).data }); }
export function useVendeurs() { return useQuery({ queryKey: ['vendeurs'], queryFn: async () => (await api.get<Reference[]>('/vendeurs')).data }); }
export function useReleves() { return useQuery({ queryKey: ['releves'], queryFn: async () => (await api.get<Releve[]>('/releves')).data }); }
export function useStockCuves() { return useRealtimeQuery({ queryKey: ['cuves-stock'], queryFn: async () => (await api.get<StockCuve[]>('/cuves/stock')).data, invalidateOn: [SOCKET_EVENTS.STOCK_CUVE_UPDATED, SOCKET_EVENTS.ACHAT_CARBURANT_VALIDATED] }); }
export function useJaugeages() { return useRealtimeQuery({ queryKey: ['jaugeages'], queryFn: async () => (await api.get('/jaugeages')).data, invalidateOn: [SOCKET_EVENTS.ALERT_ECART_JAUGEAGE] }); }
export function useCuves() { return useQuery({ queryKey: ['cuves'], queryFn: async () => (await api.get<Cuve[]>('/cuves')).data }); }
export function useSessionSuggestion(params?: { date: string; equipeId: number; caisseId: number }) { return useQuery({ queryKey: ['session-suggestion', params], queryFn: async () => (await api.get<SessionSuggestion>('/carburant/session/suggested-opening', { params })).data, enabled: false }); }
export function useSessionStatus(date: string, caisseId?: number) { return useRealtimeQuery({ queryKey: ['session-status', date, caisseId], queryFn: async () => (await api.get<{ date: string; sessions: SessionStatus[] }>('/carburant/session/status', { params: { date, caisseId } })).data, enabled: Boolean(date && caisseId), invalidateOn: [SOCKET_EVENTS.SESSION_OPENED, SOCKET_EVENTS.SESSION_CLOSED, SOCKET_EVENTS.CLOTURE_DONE] }); }
export function useOuvrirSession() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: unknown) => api.post('/carburant/session/ouvrir', input), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['session-status'] }); void queryClient.invalidateQueries({ queryKey: ['releves'] }); } }); }
export function useFermerSession() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: unknown) => api.post('/carburant/session/fermer', input), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['session-status'] }); void queryClient.invalidateQueries({ queryKey: ['releves'] }); void queryClient.invalidateQueries({ queryKey: ['cuves-stock'] }); } }); }
export function useOuvrirReleve() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: { date: string; equipeId: number; caisseId: number; pompeId: number; vendeurId: number; indexOuverture: number }) => api.post('/pompes/relever', input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['releves'] }) });
}
export function useFermerReleve() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, indexFermeture }: { id: number; indexFermeture: number }) => api.patch(`/pompes/relever/${id}/fermer`, { indexFermeture }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['releves'] }); queryClient.invalidateQueries({ queryKey: ['cuves-stock'] }); } });
}
