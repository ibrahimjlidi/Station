import { useAuthStore } from '../lib/auth';
import type { Role } from '../lib/auth';

export function usePermission(role: Role) {
  return useAuthStore((state) => state.user?.role === role);
}
