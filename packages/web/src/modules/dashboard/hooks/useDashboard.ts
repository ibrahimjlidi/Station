import { useRealtimeQuery } from '../../../hooks/useRealtimeQuery';
import { SOCKET_EVENTS } from '../../../lib/socket-events';
import api from '../../../lib/axios';

const dashboardEvents = [SOCKET_EVENTS.SESSION_CLOSED, SOCKET_EVENTS.CLOTURE_DONE, SOCKET_EVENTS.STOCK_CUVE_UPDATED, SOCKET_EVENTS.ACHAT_CARBURANT_VALIDATED];

export function useDashboardMonthly(month: number, year: number) { return useRealtimeQuery({ queryKey: ['rapport-mensuel', { mois: month, annee: year }], queryFn: async () => (await api.get('/rapports/mensuel', { params: { mois: month, annee: year } })).data, enabled: Boolean(month && year), invalidateOn: dashboardEvents }); }
export function useDashboardClients() { return useRealtimeQuery({ queryKey: ['rapport-clients-soldes'], queryFn: async () => (await api.get('/rapports/clients-soldes')).data, invalidateOn: dashboardEvents }); }
export function useDashboardSuppliers() { return useRealtimeQuery({ queryKey: ['rapport-fournisseurs-soldes'], queryFn: async () => (await api.get('/rapports/fournisseurs-soldes')).data, invalidateOn: dashboardEvents }); }
export function useDashboardTanks() { return useRealtimeQuery({ queryKey: ['rapport-stock-cuves'], queryFn: async () => (await api.get('/rapports/stock-cuves')).data, invalidateOn: dashboardEvents }); }
