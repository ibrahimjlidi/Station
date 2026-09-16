import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';
export interface Parametres { id: number; nomStation: string; adresse?: string; tel?: string; mf?: string; rc?: string; logoUrl?: string; timbre: number; tauxTVADefaut: number; devise: string; }
export interface MasterItem { id: number; code: string; libelle: string; }
export interface Cuve { id: number; code: string; libelle: string; carburant: string; volumeTotal: number; stockInitial: number; seuilAlerte: number; }
export interface Pompe { id: number; code: string; libelle: string; active: boolean; prixVente: number; cuveId: number; cuve: { id: number; libelle: string }; }
export interface Station { id: number; code: string; nom: string; active: boolean; magasin: { id: number; code: string; nom: string; active: boolean } | null; }
export function useParametres() { return useQuery({ queryKey: ['parametres'], queryFn: async () => (await api.get<Parametres>('/parametres')).data }); }
export function useCompteur() { return useQuery({ queryKey: ['compteur'], queryFn: async () => (await api.get('/parametres/compteur')).data }); }
export function useUpdateParametres() { const q = useQueryClient(); return useMutation({ mutationFn: (input: Partial<Parametres>) => api.put('/parametres', input), onSuccess: () => q.invalidateQueries({ queryKey: ['parametres'] }) }); }
export function useStations() { return useQuery({ queryKey: ['stations'], queryFn: async () => (await api.get<Station[]>('/stations')).data }); }
export function useCreateStation() { const q = useQueryClient(); return useMutation({ mutationFn: (input: { code: string; nom: string }) => api.post('/stations', input), onSuccess: () => q.invalidateQueries({ queryKey: ['stations'] }) }); }
export function useCreateMasterItem(path: 'equipes' | 'caisses') { const q = useQueryClient(); return useMutation({ mutationFn: (input: { code: string; libelle: string }) => api.post(`/${path}`, input), onSuccess: () => q.invalidateQueries({ queryKey: [path] }) }); }
export function useCreateCuve() { const q = useQueryClient(); return useMutation({ mutationFn: (input: Omit<Cuve, 'id'>) => api.post('/cuves', input), onSuccess: () => { q.invalidateQueries({ queryKey: ['cuves-stock'] }); q.invalidateQueries({ queryKey: ['pompes'] }); } }); }
export function useCreatePompe() { const q = useQueryClient(); return useMutation({ mutationFn: (input: { code: string; libelle: string; prixVente: number; cuveId: number; active: boolean }) => api.post('/pompes', input), onSuccess: () => q.invalidateQueries({ queryKey: ['pompes'] }) }); }
