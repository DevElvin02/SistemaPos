import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { closeAllSessions } from '@/lib/auth-store';
import { apiRequest } from '@/lib/api';
import { persistCompanySettings } from '@/lib/company-settings';

interface SettingsPayload {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  timezone: string;
  twoFactorEnabled: boolean;
  lastBackup: string | null;
}

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  const [formData, setFormData] = useState({
    companyName: 'SUBLIMART',
    email: 'info@sublimart.com',
    phone: '+1 (555) 123-4567',
    address: 'Calle Principal 123, Ciudad',
    country: 'Colombia',
    timezone: 'America/Bogota',
  });

  const [securityData, setSecurityData] = useState({
    twoFactorEnabled: false,
    lastBackup: 'Sin respaldo',
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await apiRequest<SettingsPayload>('/settings');
        persistCompanySettings(data);
        setFormData({
          companyName: data.companyName || 'SUBLIMART',
          email: data.email || 'info@sublimart.com',
          phone: data.phone || '',
          address: data.address || '',
          country: data.country || '',
          timezone: data.timezone || 'America/Bogota',
        });
        setSecurityData({
          twoFactorEnabled: Boolean(data.twoFactorEnabled),
          lastBackup: data.lastBackup
            ? new Date(data.lastBackup).toLocaleDateString('es-ES')
            : 'Sin respaldo',
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar la configuración');
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await apiRequest<SettingsPayload>('/settings', {
        method: 'PUT',
        body: {
          ...formData,
          twoFactorEnabled: securityData.twoFactorEnabled,
        },
      });
      persistCompanySettings(data);

      setSecurityData((prev) => ({
        ...prev,
        twoFactorEnabled: Boolean(data.twoFactorEnabled),
        lastBackup: data.lastBackup ? new Date(data.lastBackup).toLocaleDateString('es-ES') : prev.lastBackup,
      }));
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleBackupNow = async () => {
    setBackingUp(true);
    try {
      const data = await apiRequest<{ fileName: string; createdAt: string }>('/settings/backup', {
        method: 'POST',
      });
      setSecurityData((prev) => ({
        ...prev,
        lastBackup: new Date(data.createdAt).toLocaleDateString('es-ES'),
      }));
      toast.success(`Respaldo creado: ${data.fileName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el respaldo');
    } finally {
      setBackingUp(false);
    }
  };

  const handleCloseAllSessions = () => {
    closeAllSessions();
    logout();
    toast.success('Todas las sesiones fueron cerradas');
    navigate('/login', { replace: true });

    window.setTimeout(() => {
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }, 50);
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-2">Cargando configuración...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">Manage system settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Company Information */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Información de la Empresa</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre de la Empresa</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Teléfono</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Dirección</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">País</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Zona Horaria</label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option>America/Bogota</option>
                <option>America/New_York</option>
                <option>Europe/Madrid</option>
                <option>Asia/Tokyo</option>
              </select>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg transition"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Seguridad</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Autenticación de Dos Factores</p>
                <p className="text-sm text-muted-foreground">Aumenta la seguridad de tu cuenta</p>
              </div>
              <input
                type="checkbox"
                checked={securityData.twoFactorEnabled}
                onChange={(e) =>
                  setSecurityData({
                    ...securityData,
                    twoFactorEnabled: e.target.checked,
                  })
                }
                className="w-5 h-5 rounded cursor-pointer"
              />
            </div>

            <div className="p-3 bg-muted border border-border rounded-lg">
              <p className="text-sm font-medium text-secondary">Último Respaldo</p>
              <p className="text-sm text-muted-foreground mt-1">{securityData.lastBackup}</p>
            </div>

            <button
              onClick={handleBackupNow}
              disabled={backingUp}
              className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground px-4 py-2 rounded-lg transition"
            >
              {backingUp ? 'Generando respaldo...' : 'Hacer Respaldo Ahora'}
            </button>

            <button
              onClick={handleCloseAllSessions}
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg transition"
            >
              Cerrar Todas las Sesiones
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
