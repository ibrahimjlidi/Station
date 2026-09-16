import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../../lib/axios';
import type { AuthUser, Role } from '../../../lib/auth';

export interface ManagedUser extends AuthUser {}
export function useUtilisateurs() { return useQuery({ queryKey: ['utilisateurs'], queryFn: async () => (await api.get<ManagedUser[]>('/users')).data }); }
export function useCreateUtilisateur() { const queryClient = useQueryClient(); return useMutation({ mutationFn: (input: { nom: string; prenom: string; username: string; password: string; telephone?: string; role: Role }) => api.post('/users', input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['utilisateurs'] }) }); }
export function useUpdateUtilisateur() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ id, input }: { id: number; input: { nom: string; prenom: string; telephone?: string; role: Role; actif: boolean } }) => api.put(`/users/${id}`, input), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['utilisateurs'] }) }); }
export function useResetUtilisateurPassword() { return useMutation({ mutationFn: ({ id, newPassword }: { id: number; newPassword: string }) => api.patch(`/users/${id}/reset-password`, { newPassword }) }); }
export function useChangePassword() { return useMutation({ mutationFn: (input: { currentPassword: string; newPassword: string }) => api.patch('/auth/change-password', input) }); }
export function useToggleUtilisateur() { const queryClient = useQueryClient(); return useMutation({ mutationFn: ({ user, actif }: { user: ManagedUser; actif: boolean }) => api.put(`/users/${user.id}`, { nom: user.nom, prenom: user.prenom, telephone: user.telephone, role: user.role, actif }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['utilisateurs'] }) }); }
