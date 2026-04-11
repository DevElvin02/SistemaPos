// utils/permissions.ts
export type UserRole = 'admin' | 'cajero' | 'otro';

export function canUseCameraScanner(userRole: UserRole): boolean {
  return userRole === 'admin';
}
