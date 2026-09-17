import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';

export interface POSLineInput { produitId: number; quantite: number; remise: number; }
export interface POSPaymentInput { modePaymentId: number; montant: number; }
export function useCreatePOSTicket() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: { caisseId: number; equipeId: number; vendeurId: number; lignes: POSLineInput[]; paiements: POSPaymentInput[]; remise: number }) => api.post('/pos/tickets', input), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['boutique-produits'] }); void queryClient.invalidateQueries({ queryKey: ['pos-tickets'] }); } });
}
export function useCancelPOSTicket() { return useMutation({ mutationFn: (id: number) => api.post(`/pos/tickets/${id}/annuler`) }); }
export function useReturnPOSTicket() { return useMutation({ mutationFn: ({ id, lignes }: { id: number; lignes: Array<{ ticketLineId: number; quantite: number }> }) => api.post(`/pos/tickets/${id}/retour`, { lignes }) }); }
