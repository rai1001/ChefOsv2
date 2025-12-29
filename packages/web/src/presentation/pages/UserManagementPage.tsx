import { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ChefHat,
  User,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Mail,
  X,
} from 'lucide-react';

// --- MOCK DATA ---
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: 'admin' | 'chef' | 'staff';
  active: boolean;
  allowedOutlets: string[];
  defaultOutletId?: string;
  createdAt: string;
}

const mockUsers: UserProfile[] = [
  {
    uid: 'user1',
    email: 'admin@kitchen.com',
    displayName: 'Admin Principal',
    photoURL: '',
    role: 'admin',
    active: true,
    allowedOutlets: ['outlet1', 'outlet2'],
    defaultOutletId: 'outlet1',
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    uid: 'user2',
    email: 'chef@kitchen.com',
    displayName: 'Chef Maria',
    photoURL: '',
    role: 'chef',
    active: true,
    allowedOutlets: ['outlet1'],
    createdAt: '2025-01-20T14:30:00Z',
  },
  {
    uid: 'user3',
    email: 'staff@kitchen.com',
    displayName: 'Personal Juan',
    photoURL: '',
    role: 'staff',
    active: false,
    allowedOutlets: [],
    createdAt: '2025-01-25T09:15:00Z',
  },
];

// --- COMPONENTS ---

const StatsCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) => (
  <div className="bg-surface border border-white/10 rounded-xl p-6 flex items-center justify-between shadow-lg">
    <div>
      <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center`}>
      <Icon className="text-white" size={24} />
    </div>
  </div>
);

export const UserManagementPage = () => {
  const [users, setUsers] = useState<UserProfile[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'chef' | 'staff'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const handleDeleteUser = (uid: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      setUsers(users.filter((u) => u.uid !== uid));
    }
  };

  // --- DERIVED STATE ---
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'active' ? user.active : !user.active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => u.active).length,
    pending: users.filter((u) => !u.active).length, // using !active as pending for now or maybe check if verified?
    admins: users.filter((u) => u.role === 'admin').length,
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Shield size={12} /> Admin
          </span>
        );
      case 'chef':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ChefHat size={12} /> Chef
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <User size={12} /> Staff
          </span>
        );
    }
  };

  const getStatusBadge = (active: boolean) => {
    return active ? (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
        <CheckCircle size={12} /> Activo
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
        <XCircle size={12} /> Inactivo
      </span>
    );
  };

  return (
    <div className="space-y-6 p-6 min-h-screen bg-slate-900 text-white">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
          <p className="text-slate-400 text-sm">Administra el acceso y los roles del personal</p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <UserPlus size={18} />
          <span>Invitar Usuario</span>
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Usuarios" value={stats.total} icon={Users} color="bg-blue-500/20" />
        <StatsCard
          title="Activos"
          value={stats.active}
          icon={CheckCircle}
          color="bg-emerald-500/20"
        />
        <StatsCard
          title="Pendientes"
          value={stats.pending}
          icon={XCircle}
          color="bg-orange-500/20"
        />
        <StatsCard title="Admins" value={stats.admins} icon={Shield} color="bg-indigo-500/20" />
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-surface border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'all' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'active' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Activos
          </button>
          <div className="w-px h-6 bg-white/10 mx-2"></div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Administradores</option>
            <option value="chef">Chefs</option>
            <option value="staff">Staff</option>
          </select>
        </div>
      </div>

      {/* USER TABLE */}
      <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/20">
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Outlets
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Registro
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <UserPlus size={32} className="opacity-20" />
                      <p>No se encontraron usuarios</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uid} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/10">
                          {user.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.displayName}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                    <td className="px-6 py-4">{getStatusBadge(user.active)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {user.allowedOutlets.length > 0 ? (
                          user.allowedOutlets.map((outlet, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-300 border border-white/5"
                            >
                              {outlet}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-600 italic">Sin asignar</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.uid)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingUser(null)}
          />
          <div className="relative bg-surface border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Edit size={20} className="text-indigo-400" />
              Editar Usuario
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 ml-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-slate-400 italic cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 ml-1">Nombre</label>
                <input
                  type="text"
                  defaultValue={editingUser.displayName}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 ml-1">Rol</label>
                  <select
                    defaultValue={editingUser.role}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="admin">Admin</option>
                    <option value="chef">Chef</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 ml-1">Estado</label>
                  <div className="flex items-center gap-3 h-[46px] px-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked={editingUser.active}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      <span className="ml-3 text-sm font-medium text-slate-300">Activo</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20">
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsInviteModalOpen(false)}
          />
          <div className="relative bg-surface border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Mail size={20} className="text-indigo-400" />
                Invitar Usuario
              </h2>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 ml-1">
                  Email del invitado
                </label>
                <input
                  type="email"
                  placeholder="ejemplo@correo.com"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 ml-1">Rol Inicial</label>
                <select className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
                  <option value="staff">Staff (Acceso básico)</option>
                  <option value="chef">Chef (Gestión de cocina)</option>
                  <option value="admin">Administrador (Acceso total)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 ml-1">
                  Outlets Permitidos
                </label>
                <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-2 max-h-32 overflow-y-auto">
                  {['Main Kitchen', 'Bar Terrace', 'Pastry Shop'].map((outlet) => (
                    <label
                      key={outlet}
                      className="flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-slate-800"
                      />
                      <span className="text-sm text-slate-300">{outlet}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20">
                Enviar Invitación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
