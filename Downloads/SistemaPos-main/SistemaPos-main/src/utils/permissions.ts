// utils/permissions.ts
export type UserRole = 'admin' | 'cajero' | 'otro';

export function canUseCameraScanner(userRole: UserRole, env: { isWeb: boolean; isMobile: boolean; isElectron: boolean }) {
  return env.isWeb && userRole === 'admin';
}
