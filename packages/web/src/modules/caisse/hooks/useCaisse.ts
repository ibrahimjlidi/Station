import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';

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
}

const hasContext = (context?: Partial<CaisseContext>) => Boolean(context?.date && context.equipeId && context.caisseId);

export function useModesPayment() { return useQuery({ queryKey: ['caisse-modes-payment'], queryFn: async () => (await api.get<ModePayment[]>('/caisse/modes-payment')).data }); }
export function useTypesDepenses() { return useQuery({ queryKey: ['caisse-types-depenses'], queryFn: async () => (await api.get<TypeDepense[]>('/caisse/types-depenses')).data }); }
export function useClients() { return useQuery({ queryKey: ['caisse-clients'], queryFn: async () => (await api.get<Client[]>('/caisse/clients')).data }); }
export function useCaisseSummary(context?: Partial<CaisseContext>) {
  return useQuery({ queryKey: ['caisse-summary', context?.date, context?.equipeId, context?.caisseId], queryFn: async () => (await api.get<CaisseSummary>(`/caisse/resume/${context!.date}/${context!.equipeId}/${context!.caisseId}`)).data, enabled: hasContext(context) });
}

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
  return useMutation({ mutationFn: ({ date, equipeId }: Pick<CaisseContext, 'date' | 'equipeId'>) => api.post('/caisse/cloturer', { date, equipeId }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['caisse-summary'] }) });
}
