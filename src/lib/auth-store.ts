import type { User, UserRole } from '../types/auth';
import type { PasswordResetResponse } from '../types/auth';
import { apiRequest } from './api';

export const FORCE_LOGOUT_KEY = 'auth_force_logout_at';

function normalizeRole(role: string): UserRole {
  return role === 'user' ? 'cajero' : (role as UserRole);
}

function mapApiUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    email: String(row.email ?? ''),
    name: String(row.name ?? ''),
    role: normalizeRole(String(row.role ?? 'cajero')),
    activo: Boolean(row.activo),
    ultimoLogin: row.ultimoLogin ? new Date(String(row.ultimoLogin)) : undefined,
  };
}

export function initializeAuthStore(): void {
  // No-op: now auth/users state lives in MySQL via API.
}

export async function getManagedUsers(): Promise<User[]> {
  const rows = await apiRequest<Record<string, unknown>[]>('/users');
  return rows.map(mapApiUser);
}

export async function createManagedUser(input: {
  email: string;
  name: string;
  role: UserRole;
  password: string;
  activo?: boolean;
}): Promise<User> {
  const data = await apiRequest<Record<string, unknown>>('/users', {
    method: 'POST',
    body: {
      email: input.email,
      name: input.name,
      role: input.role,
      password: input.password,
      activo: input.activo ?? true,
    },
  });
  return mapApiUser(data);
}

export async function updateManagedUser(
  id: string,
  updates: {
    email: string;
    name: string;
    role: UserRole;
    activo: boolean;
    password?: string;
  }
): Promise<User> {
  const data = await apiRequest<Record<string, unknown>>(`/users/${id}`, {
    method: 'PUT',
    body: updates,
  });
  return mapApiUser(data);
}

export async function deleteManagedUser(id: string): Promise<void> {
  await apiRequest<{ deleted: boolean }>(`/users/${id}`, { method: 'DELETE' });
}

export async function authenticateUser(email: string, password: string): Promise<User> {
  const data = await apiRequest<Record<string, unknown>>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return mapApiUser(data);
}

export async function requestPasswordResetForEmail(email: string): Promise<PasswordResetResponse> {
  const data = await apiRequest<Record<string, unknown>>('/auth/password-reset/request', {
    method: 'POST',
    body: { email },
  });

  return {
    email: String(data.email ?? ''),
    token: data.token ? String(data.token) : undefined,
    expiresAt: Number(data.expiresAt ?? Date.now()),
    deliveryMode: data.deliveryMode ? String(data.deliveryMode) : undefined,
    previewLink: data.previewLink ? String(data.previewLink) : undefined,
  };
}

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
  await apiRequest<{ updated: boolean }>('/auth/password-reset/confirm', {
    method: 'POST',
    body: { token, newPassword },
  });
}

export async function validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
  const data = await apiRequest<Record<string, unknown>>('/auth/password-reset/validate', {
    method: 'POST',
    body: { token },
  });

  return {
    valid: Boolean(data.valid),
    email: data.email ? String(data.email) : undefined,
  };
}

export function getRolePermissions(role: UserRole): string[] {
  if (role === 'admin') {
    return [
      'orders.view',
      'orders.create',
      'orders.edit',
      'orders.delete',
      'customers.view',
      'customers.create',
      'customers.edit',
      'customers.delete',
      'products.view',
      'products.create',
      'products.edit',
      'products.delete',
      'categories.view',
      'categories.create',
      'categories.edit',
      'categories.delete',
      'suppliers.view',
      'suppliers.create',
      'suppliers.edit',
      'suppliers.delete',
      'inventory.view',
      'inventory.edit',
      'purchases.view',
      'purchases.create',
      'purchases.edit',
      'purchases.delete',
      'reports.view',
      'settings.view',
      'settings.edit',
      'users.manage',
    ];
  }

  return [
    'orders.view',
    'orders.create',
    'customers.view',
    'customers.create',
    'products.view',
    'inventory.view',
    'purchases.view',
  ];
}

export function closeAllSessions(): void {
  sessionStorage.removeItem('auth_user');
  localStorage.removeItem('auth_user');
  localStorage.setItem(FORCE_LOGOUT_KEY, String(Date.now()));
}




