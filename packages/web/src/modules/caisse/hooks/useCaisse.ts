import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';
import { useRealtimeQuery } from '../../../hooks/useRealtimeQuery';
import { SOCKET_EVENTS } from '../../../lib/socket-events';

export interface CaisseContext { date: string; equipeId: number; caisseId: number; vendeurId: number; }
export interface ModePayment { id: number; libelle: string; famille?: string; compteCPT?: string; }
export interface TypeDepense { id: number; typeDepense: string; numFamDep?: string; }
export interface Client { id: number; nomClient: string; telephone?: string; quota: number; soldeAnterieur: number; }
export interface CaisseSummary {
  recetteId: number | null;
  depenseId: number | null;
  creditId: number | null;
  totalRecettes: number;
  totalDepenses: number;
  totalCredits: number;
  soldeNet: number;
  fait: boolean;
  recettes: Array<{ id: number; modePaymentId: number; montant: number; numero?: string; modePayment: ModePayment; }>;
  depenses: Array<{ id: number; codeDepense: number; montant: number; libelle?: string; type: TypeDepense; }>;
  credits: Array<{ id: number; clientId: number; montant: number; libelle?: string; modePayment?: string; client: Pick<Client, 'id' | 'nomClient'>; }>;
  breakdown: Array<{ modePaymentId: number; libelle: string; montant: number }>;
  sessionStatut?: string;
  fondsCaisseOuverture?: number;
  recettesTotaux?: { totalEspeces: number; totalCheques: number; totalCarte: number; totalCredits: number; totalDeclaree: number };
  theorique?: { carburant: number; boutique: number; credits: number; total: number };
  ecartProvisoire?: number;
}

const hasContext = (context?: Partial<CaisseContext>) => Boolean(context?.date && context.equipeId && context.caisseId);

export function useModesPayment() { return useQuery({ queryKey: ['caisse-modes-payment'], queryFn: async () => (await api.get<ModePayment[]>('/caisse/modes-payment')).data }); }
export function useTypesDepenses() { return useQuery({ queryKey: ['caisse-types-depenses'], queryFn: async () => (await api.get<TypeDepense[]>('/caisse/types-depenses')).data }); }
export function useClients() { return useQuery({ queryKey: ['caisse-clients'], queryFn: async () => (await api.get<Client[]>('/caisse/clients')).data }); }
export function useCaisseSummary(context?: Partial<CaisseContext>) {
  return useRealtimeQuery({ queryKey: ['caisse-summary', context?.date, context?.equipeId, context?.caisseId], queryFn: async () => (await api.get<CaisseSummary>(`/caisse/resume/${context!.date}/${context!.equipeId}/${context!.caisseId}`)).data, enabled: hasContext(context), invalidateOn: [SOCKET_EVENTS.RECETTE_ADDED, SOCKET_EVENTS.DEPENSE_ADDED, SOCKET_EVENTS.CREDIT_ADDED, SOCKET_EVENTS.SESSION_CLOSED] });
}
export function useClotures() { return useRealtimeQuery({ queryKey: ['clotures'], queryFn: async () => (await api.get('/caisse/clotures')).data, invalidateOn: [SOCKET_EVENTS.CLOTURE_DONE] }); }

export function useCreateRecette() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (context: CaisseContext) => api.post('/caisse/recettes', context), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caisse-summary'] }) });
}
export function useAddRecetteLine() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, modePaymentId, montant, numero, idCuve }: { id: number; modePaymentId: number; montant: number; numero?: string; idCuve?: number }) => api.post(`/caisse/recettes/${id}/lignes`, { modePaymentId, montant, numero, idCuve }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caisse-summary'] }) });
}
export function useCreateDepense() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (context: CaisseContext) => api.post('/caisse/depenses', context), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caisse-summary'] }) });
}
export function useAddDepenseLine() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, codeDepense, montant, libelle }: { id: number; codeDepense: number; montant: number; libelle?: string }) => api.post(`/caisse/depenses/${id}/lignes`, { codeDepense, montant, libelle }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caisse-summary'] }) });
}
export function useCreateCredit() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (context: CaisseContext) => api.post('/caisse/credits', context), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caisse-summary'] }) });
}
export function useAddCreditLine() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, clientId, montant, libelle, modePayment }: { id: number; clientId: number; montant: number; libelle?: string; modePayment?: string }) => api.post(`/caisse/credits/${id}/lignes`, { clientId, montant, libelle, modePayment }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caisse-summary'] }) });
}
export function useCloturerCaisse() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ date, equipeId, caisseId }: Pick<CaisseContext, 'date' | 'equipeId' | 'caisseId'>) => api.post('/caisse/cloturer', { date, equipeId, caisseId }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caisse-summary'] }) });
}
