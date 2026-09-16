import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';

export interface Pompe { id: number; code: string; libelle: string; prixVente: number; cuve: { id: number; libelle: string }; }
export interface Reference { id: number; code?: string; libelle?: string; nom?: string; }
export interface Releve { id: number; date: string; indexOuverture: number; indexFermeture: number | null; prixVente: number; pompe: Pompe; equipe: Reference; caisse: Reference; vendeur: Reference; ca: number | null; }
export interface StockCuve { id: number; code: string; libelle: string; carburant: string; stockActuel: number; volumeTotal: number; pourcentage: number; }

export function usePompes() { return useQuery({ queryKey: ['pompes'], queryFn: async () => (await api.get<Pompe[]>('/pompes')).data }); }
export function useEquipes() { return useQuery({ queryKey: ['equipes'], queryFn: async () => (await api.get<Reference[]>('/equipes')).data }); }
export function useCaisses() { return useQuery({ queryKey: ['caisses'], queryFn: async () => (await api.get<Reference[]>('/caisses')).data }); }
export function useVendeurs() { return useQuery({ queryKey: ['vendeurs'], queryFn: async () => (await api.get<Reference[]>('/vendeurs')).data }); }
export function useReleves() { return useQuery({ queryKey: ['releves'], queryFn: async () => (await api.get<Releve[]>('/releves')).data }); }
export function useStockCuves() { return useQuery({ queryKey: ['cuves-stock'], queryFn: async () => (await api.get<StockCuve[]>('/cuves/stock')).data }); }
export function useOuvrirReleve() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (input: { date: string; equipeId: number; caisseId: number; pompeId: number; vendeurId: number; indexOuverture: number }) => api.post('/pompes/relever', input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['releves'] }) });
}
export function useFermerReleve() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ id, indexFermeture }: { id: number; indexFermeture: number }) => api.patch(`/pompes/relever/${id}/fermer`, { indexFermeture }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['releves'] }); queryClient.invalidateQueries({ queryKey: ['cuves-stock'] }); } });
}
