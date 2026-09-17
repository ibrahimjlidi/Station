import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';
import { useRealtimeQuery } from '../../../hooks/useRealtimeQuery';
import { SOCKET_EVENTS } from '../../../lib/socket-events';

export interface Client { id: number; nomClient: string; telephone?: string; adresse?: string; MF?: string; quota: number; soldeActuel: number; }
export interface Produit { id: number; code: string; libelle: string; prixVenteHT: number; tva: number; }
export interface BonLivraison { id: number; date: string; clientId: number; client: Client; totalHT: number; totalTTC: number; totTVA: number; numFact?: number; }
export interface Facture { id: number; date: string; clientId: number; client: Client; totalHT: number; totalTTC: number; totTVA: number; numBL: number; statut: string; }
export interface Impaye { id: number; clientId: number; client: Client; dateReg: string; montantLigne: number; echeance?: string; nomBanque?: string; joursRetard: number; }

export function useClients() { return useQuery({ queryKey: ['clients'], queryFn: async () => (await api.get<Client[]>('/clients')).data }); }
export function useClient(id?: number) { return useQuery({ queryKey: ['client', id], queryFn: async () => (await api.get(`/clients/${id}`)).data, enabled: Boolean(id) }); }
export function useProduits() { return useQuery({ queryKey: ['produits'], queryFn: async () => (await api.get<Produit[]>('/produits')).data }); }
export function useBonsLivraison() { return useQuery({ queryKey: ['bons-livraison'], queryFn: async () => (await api.get<BonLivraison[]>('/bons-livraison')).data }); }
export function useFactures() { return useQuery({ queryKey: ['factures'], queryFn: async () => (await api.get<Facture[]>('/factures')).data }); }
export function useImpayes(clientId?: number) { return useRealtimeQuery({ queryKey: ['impayes', clientId], queryFn: async () => (await api.get<Impaye[]>('/impayes', { params: { clientId } })).data, invalidateOn: [SOCKET_EVENTS.ALERT_IMPAYE] }); }
export function useCreateClient() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: Omit<Client, 'id' | 'soldeActuel'>) => api.post('/clients', input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }) }); }
export function useUpdateClient() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: number; input: Omit<Client, 'id' | 'soldeActuel'> }) => api.put(`/clients/${id}`, input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); queryClient.invalidateQueries({ queryKey: ['client'] }); } }); }
export function useCreateBonLivraison() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { date: string; clientId: number; lignes: Array<{ idProduit: number; puHT: number; tva: number; qte: number; remise: number }> }) => api.post('/bons-livraison', input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bons-livraison'] }); queryClient.invalidateQueries({ queryKey: ['clients'] }); } }); }
export function useFacturerBon() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.post(`/bons-livraison/${id}/facturer`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bons-livraison'] }); queryClient.invalidateQueries({ queryKey: ['factures'] }); } }); }
export function useCreateReglement() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { clientId: number; equipeId: number; caisseId: number; date: string; montant: number; modePayment: string; echeance?: string; impaye: boolean; valide: boolean }) => api.post('/reglements', input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['clients'] }); queryClient.invalidateQueries({ queryKey: ['impayes'] }); } }); }
