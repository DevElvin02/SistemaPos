export type UserRole = 'admin' | 'cajero';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  activo: boolean;
  ultimoLogin?: Date;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (action: string) => boolean;
  requestPasswordReset: (email: string) => Promise<PasswordResetResponse>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}

export interface PasswordResetResponse {
  email: string;
  token?: string;
  expiresAt: number;
  deliveryMode?: string;
  previewLink?: string;
}

export interface MenuItemPermission {
  path: string;
  label: string;
  icon: string;
  roles: UserRole[];
}
