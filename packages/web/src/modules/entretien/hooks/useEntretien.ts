import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';
export interface Entretien { id: number; dateEnt: string; matricule: string; totEntTTC: number; indexKm: number; prochainIndex: number; client: { id: number; nomClient: string }; }
export interface CarWashRow { id: number; date: string; indexOuverture: number; indexFermeture: number; nombreLavage: number; }
export function useEntretiens() { return useQuery<Entretien[]>({ queryKey: ['entretiens'], queryFn: async () => (await api.get<Entretien[]>('/entretiens')).data }); }
export function useEntretien(id?: number) { return useQuery({ queryKey: ['entretien', id], queryFn: async () => (await api.get(`/entretiens/${id}`)).data, enabled: Boolean(id) }); }
export function useCarWash() { return useQuery<CarWashRow[]>({ queryKey: ['carwash'], queryFn: async () => (await api.get<CarWashRow[]>('/carwash')).data }); }
export function useCreateEntretien() { const q = useQueryClient(); return useMutation({ mutationFn: (input: unknown) => api.post('/entretiens', input), onSuccess: () => q.invalidateQueries({ queryKey: ['entretiens'] }) }); }
export function useCreateCarWash() { const q = useQueryClient(); return useMutation({ mutationFn: (input: unknown) => api.post('/carwash', input), onSuccess: () => q.invalidateQueries({ queryKey: ['carwash'] }) }); }
