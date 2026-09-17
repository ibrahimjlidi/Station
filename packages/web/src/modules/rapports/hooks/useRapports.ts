import { useQuery } from '@tanstack/react-query';
import api from '../../../lib/axios';
import { useRealtimeQuery } from '../../../hooks/useRealtimeQuery';
import { SOCKET_EVENTS } from '../../../lib/socket-events';
export interface StockReport { id: number; libelle: string; stock: number; alerte: boolean; }
export interface ClientBalance { id: number; nomClient: string; solde: number; }
export interface SupplierBalance { id: number; raisonSociale: string; totalAchats: number; totalRegle: number; reste: number; }
export function useJournalier(params?: { date: string; equipeId: number; caisseId: number }) { return useQuery({ queryKey: ['rapport-journalier', params], queryFn: async () => (await api.get('/rapports/journalier', { params })).data, enabled: Boolean(params?.date && params.equipeId && params.caisseId) }); }
const dashboardEvents = [SOCKET_EVENTS.SESSION_CLOSED, SOCKET_EVENTS.CLOTURE_DONE, SOCKET_EVENTS.STOCK_CUVE_UPDATED, SOCKET_EVENTS.ACHAT_CARBURANT_VALIDATED];
export function useMensuel(params?: { mois: number; annee: number }) { return useRealtimeQuery({ queryKey: ['rapport-mensuel', params], queryFn: async () => (await api.get('/rapports/mensuel', { params })).data, enabled: Boolean(params?.mois && params.annee), invalidateOn: dashboardEvents }); }
export function useSoldesClients() { return useRealtimeQuery<ClientBalance[]>({ queryKey: ['rapport-clients-soldes'], queryFn: async () => (await api.get<ClientBalance[]>('/rapports/clients-soldes')).data, invalidateOn: dashboardEvents }); }
export function useSoldesFournisseurs() { return useRealtimeQuery<SupplierBalance[]>({ queryKey: ['rapport-fournisseurs-soldes'], queryFn: async () => (await api.get<SupplierBalance[]>('/rapports/fournisseurs-soldes')).data, invalidateOn: dashboardEvents }); }
export function useStockCuvesRapport() { return useRealtimeQuery<StockReport[]>({ queryKey: ['rapport-stock-cuves'], queryFn: async () => (await api.get<StockReport[]>('/rapports/stock-cuves')).data, invalidateOn: dashboardEvents }); }
export async function downloadReport(url: string, body: unknown, filename: string) { const response = await api.post(url, body, { responseType: 'blob' }); const link = document.createElement('a'); link.href = URL.createObjectURL(response.data); link.download = filename; link.click(); URL.revokeObjectURL(link.href); }
