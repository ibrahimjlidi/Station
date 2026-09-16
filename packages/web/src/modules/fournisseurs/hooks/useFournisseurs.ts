import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';

export interface Fournisseur { id: number; code: string; raisonSociale: string; matriculeFiscal?: string; telephone?: string; totalAchats: number; totalRegle: number; soldeRestant: number; }
export interface LibRas { id: number; libelle: string; tauxRetenu: number; compteCPT?: string; }
export interface Achat { id: number; date: string; fournisseurId: number; details: Array<{ id: number; quantite: number; prixUnitaire: number; }>; }
export interface ReglementFournisseur { id: number; date: string; fournisseur: Fournisseur; montantTotal: number; reste: number; }
export interface RetenueSource { id: number; dateRas: string; fournisseur: Fournisseur; totalBrut: number; totalRetenu: number; totalNet: number; }

export function useFournisseurs() { return useQuery({ queryKey: ['fournisseurs'], queryFn: async () => (await api.get<Fournisseur[]>('/fournisseurs')).data }); }
export function useAchats(fournisseurId?: number) { return useQuery({ queryKey: ['achats', fournisseurId], queryFn: async () => (await api.get<Achat[]>('/achats', { params: { fournisseurId } })).data, enabled: Boolean(fournisseurId) }); }
export function useReglementsFournisseurs() { return useQuery({ queryKey: ['reglements-fournisseurs'], queryFn: async () => (await api.get<ReglementFournisseur[]>('/reglements-fournisseurs')).data }); }
export function useLibRas() { return useQuery({ queryKey: ['libras'], queryFn: async () => (await api.get<LibRas[]>('/libras')).data }); }
export function useRetenuesSource() { return useQuery({ queryKey: ['retenues-source'], queryFn: async () => (await api.get<RetenueSource[]>('/retenues-source')).data }); }
export function useCreateReglementFournisseur() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { fournisseurId: number; date: string; valide: boolean; lignes: Array<{ montant: number; modePayment: string; numAchats?: number; echeance?: string; reste: number }> }) => api.post('/reglements-fournisseurs', input), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fournisseurs'] }); queryClient.invalidateQueries({ queryKey: ['reglements-fournisseurs'] }); } }); }
export function useCreateRetenueSource() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { dateRas: string; fournisseurId: number; valide: boolean; lignes: Array<{ codeRet: number; mtBrut: number; tauxRetenu: number; fournisseurId: number; valide: boolean }> }) => api.post('/retenues-source', input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['retenues-source'] }) }); }
