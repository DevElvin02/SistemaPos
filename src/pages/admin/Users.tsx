import { useEffect, useState } from 'react';
import { Plus, Search, Shield, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { DeleteConfirmModal } from '@/components/admin/EntityModals';
import { useAuth } from '@/context/AuthContext';
import { createManagedUser, deleteManagedUser, getManagedUsers, updateManagedUser } from '@/lib/auth-store';
import { User, UserRole } from '@/types/auth';

interface UserFormData {
  name: string;
  email: string;
  role: UserRole;
  password: string;
  activo: boolean;
}

const initialFormData: UserFormData = {
  name: '',
  email: '',
  role: 'cajero',
  password: '',
  activo: true,
};

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const reloadUsers = async () => {
    try {
      const rows = await getManagedUsers();
      setUsers(rows);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cargar usuarios');
    }
  };

  useEffect(() => {
    void reloadUsers();
  }, []);

  const filteredUsers = users.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(term) ||
      item.email.toLowerCase().includes(term) ||
      item.role.toLowerCase().includes(term)
    );
  });

  const openCreateModal = () => {
    setSelectedUser(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (target: User) => {
    setSelectedUser(target);
    setFormData({
      name: target.name,
      email: target.email,
      role: target.role,
      password: '',
      activo: target.activo,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Completa nombre y email');
      return;
    }

    try {
      if (selectedUser) {
        await updateManagedUser(selectedUser.id, formData);
        toast.success('Usuario actualizado');
      } else {
        if (!formData.password.trim()) {
          toast.error('Ingresa una contraseña para el nuevo usuario');
          return;
        }
        await createManagedUser(formData);
        toast.success('Usuario creado');
      }
      await reloadUsers();
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el usuario');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      await deleteManagedUser(selectedUser.id);
      toast.success('Usuario eliminado');
      await reloadUsers();
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el usuario');
    }
  };

  const columns = [
    {
      header: 'Usuario',
      accessor: (item: User) => (
        <div>
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.email}</p>
        </div>
      ),
    },
    {
      header: 'Rol',
      accessor: (item: User) => (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${item.role === 'admin' ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary'}`}>
          {item.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCog className="w-3 h-3" />}
          {item.role === 'admin' ? 'Administrador' : 'Cajero'}
        </span>
      ),
    },
    {
      header: 'Estado',
      accessor: (item: User) => <StatusBadge status={item.activo ? 'active' : 'inactive'} />,
    },
    {
      header: 'Ultimo acceso',
      accessor: (item: User) => item.ultimoLogin ? new Date(item.ultimoLogin).toLocaleString('es-SV') : 'Sin acceso',
    },
    {
      header: 'Acciones',
      accessor: (item: User) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openEditModal(item)}
            className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition whitespace-nowrap"
          >
            Editar
          </button>
          <button
            onClick={() => {
              setSelectedUser(item);
              setIsDeleteModalOpen(true);
            }}
            disabled={item.id === user?.id}
            className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
          >
            Eliminar
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground mt-1">Control de acceso para administradores y cajeros</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Total usuarios</p>
          <p className="text-2xl font-bold mt-1">{users.length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Administradores</p>
          <p className="text-2xl font-bold mt-1">{users.filter((item) => item.role === 'admin').length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Cajeros activos</p>
          <p className="text-2xl font-bold mt-1">{users.filter((item) => item.role === 'cajero' && item.activo).length}</p>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o rol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={filteredUsers} />

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setIsModalOpen(false)}>
          <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">{selectedUser ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-primary-foreground hover:bg-primary/80 p-2 rounded transition">✕</button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rol</label>
                <select value={formData.role} onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as UserRole }))} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                  <option value="admin">Administrador</option>
                  <option value="cajero">Cajero</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contraseña {selectedUser ? '(opcional)' : ''}</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.activo} onChange={(e) => setFormData((prev) => ({ ...prev, activo: e.target.checked }))} />
                  Usuario activo
                </label>
              </div>
            </div>

            <div className="bg-muted/50 border-t p-4 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition">Cancelar</button>
              <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition">Guardar</button>
            </div>
          </div>
        </div>
      )}

      <DeleteConfirmModal
        title="Eliminar Usuario"
        message={`¿Deseas eliminar a ${selectedUser?.name ?? 'este usuario'}? Esta acción no se puede deshacer.`}
        isOpen={isDeleteModalOpen}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
}