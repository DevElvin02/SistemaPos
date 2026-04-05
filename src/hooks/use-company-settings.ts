import { useEffect, useState } from 'react';
import {
  CompanySettings,
  COMPANY_SETTINGS_UPDATED_EVENT,
  fetchCompanySettings,
  getCachedCompanySettings,
} from '@/lib/company-settings';

export function useCompanySettings() {
  const [companySettings, setCompanySettings] = useState<CompanySettings>(getCachedCompanySettings);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const settings = await fetchCompanySettings();
      if (mounted) {
        setCompanySettings(settings);
      }
    };

    void load();

    const handleSettingsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<CompanySettings>;
      if (customEvent.detail) {
        setCompanySettings(customEvent.detail);
      }
    };

    window.addEventListener(COMPANY_SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener(COMPANY_SETTINGS_UPDATED_EVENT, handleSettingsUpdated as EventListener);
    };
  }, []);

  return { companySettings };
}
