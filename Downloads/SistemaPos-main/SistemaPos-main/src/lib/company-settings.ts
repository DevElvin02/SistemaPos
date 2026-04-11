import { apiRequest } from './api';

const COMPANY_SETTINGS_STORAGE_KEY = 'company_settings_cache_v1';
export const COMPANY_SETTINGS_UPDATED_EVENT = 'company-settings-updated';

export interface CompanySettings {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  timezone: string;
  twoFactorEnabled: boolean;
  lastBackup: string | null;
}

export const defaultCompanySettings: CompanySettings = {
  companyName: 'MOTOREPUESTOS',
  email: 'info@motorepuestos.com',
  phone: '+1 (555) 123-4567',
  address: 'Calle Principal 123, Ciudad',
  country: 'Colombia',
  timezone: 'America/Bogota',
  twoFactorEnabled: false,
  lastBackup: null,
};

function normalizeCompanySettings(data: Partial<CompanySettings> | null | undefined): CompanySettings {
  return {
    ...defaultCompanySettings,
    ...data,
    companyName: data?.companyName || defaultCompanySettings.companyName,
    email: data?.email || defaultCompanySettings.email,
    phone: data?.phone || defaultCompanySettings.phone,
    address: data?.address || defaultCompanySettings.address,
    country: data?.country || defaultCompanySettings.country,
    timezone: data?.timezone || defaultCompanySettings.timezone,
    twoFactorEnabled: Boolean(data?.twoFactorEnabled),
    lastBackup: data?.lastBackup ?? null,
  };
}

export function getCachedCompanySettings(): CompanySettings {
  try {
    const raw = localStorage.getItem(COMPANY_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultCompanySettings;
    return normalizeCompanySettings(JSON.parse(raw) as Partial<CompanySettings>);
  } catch {
    return defaultCompanySettings;
  }
}

export function persistCompanySettings(settings: Partial<CompanySettings>): CompanySettings {
  const next = normalizeCompanySettings(settings);
  localStorage.setItem(COMPANY_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(COMPANY_SETTINGS_UPDATED_EVENT, { detail: next }));
  return next;
}

export async function fetchCompanySettings(): Promise<CompanySettings> {
  try {
    const data = await apiRequest<Partial<CompanySettings>>('/settings');
    return persistCompanySettings(data);
  } catch {
    return getCachedCompanySettings();
  }
}
