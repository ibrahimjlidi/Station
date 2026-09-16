import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';

export interface Famille { id: number; libelle: string; }
export interface Produit { id: number; code: string; codeProduit?: string; libelle: string; familleId?: number; famille?: Famille; prixAchatHT: number; prixVenteHT: number; tauxTVA: number; stock: number; }
export interface Fournisseur { id: number; raisonSociale: string; }
export interface Inventaire { id: number; date: string; operateurNom: string; valeurStock: number; cloture: boolean; }
export interface SalesSummary { totalCA: number; totalMarge: number; nombreVentes: number; margePourcentage: number; parFamille: Array<{ famille: string; ca: number }>; }

export function useProduits(familleId?: number) { return useQuery({ queryKey: ['boutique-produits', familleId], queryFn: async () => (await api.get<Produit[]>('/produits', { params: { familleId } })).data }); }
export function useFamillesProduits() { return useQuery({ queryKey: ['familles-produits'], queryFn: async () => (await api.get<Famille[]>('/familles-produits')).data }); }
export function useFournisseurs() { return useQuery({ queryKey: ['boutique-fournisseurs'], queryFn: async () => (await api.get<Fournisseur[]>('/fournisseurs')).data }); }
export function useInventaires() { return useQuery({ queryKey: ['inventaires'], queryFn: async () => (await api.get<Inventaire[]>('/inventaires')).data }); }
export function useSalesSummary(params?: { dateFrom?: string; dateTo?: string; equipeId?: number }) { return useQuery({ queryKey: ['ventes-resume', params], queryFn: async () => (await api.get<SalesSummary>('/ventes/resume', { params })).data }); }
export function useUpdateProduit() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: number; input: Partial<Produit> }) => api.put(`/produits/${id}`, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boutique-produits'] }) }); }
export function useCreateAchatProduit() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { fournisseurId: number; dateAchat: string; lignes: Array<{ produitId: number; quantite: number; prixAchat: number; tauxTVA: number }>; valide: boolean }) => api.post('/achats-produits', input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['boutique-produits'] }); queryClient.invalidateQueries({ queryKey: ['achats-produits'] }); } }); }
export function useCreateInventaire() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { date: string; operateur: number; lignes: Array<{ produitId: number; stockInventaire: number }> }) => api.post('/inventaires', input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventaires'] }) }); }
export function useCloturerInventaire() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (id: number) => api.patch(`/inventaires/${id}/cloturer`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventaires'] }); queryClient.invalidateQueries({ queryKey: ['boutique-produits'] }); } }); }
export function useCreateFamille() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { libelle: string; cumulOuiNon: boolean; typeProd?: string }) => api.post('/familles-produits', input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['familles-produits'] }) }); }
export function useCreateTransfert() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: any) => api.post('/transferts', input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boutique-produits'] }) }); }
