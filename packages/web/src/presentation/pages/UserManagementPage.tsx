import { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  ChefHat,
  User as UserIcon,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Mail,
  X,
  Loader2,
} from 'lucide-react';
import { useUserManagement } from '@/presentation/hooks/useUserManagement';
import type { User, Role } from '@/types';

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
  const {
    users,
    loading,
    fetchUsers,
    updateUser,
    deleteUser,
    toggleUserStatus,
    inviteUser,
    invitations,
    cancelInvitation,
  } = useUserManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'chef' | 'staff'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Edit Form State
  const [editForm, setEditForm] = useState<{
    displayName: string;
    role: Role;
    active: boolean;
    allowedOutlets: string[];
  }>({ displayName: '', role: 'staff', active: false, allowedOutlets: [] });

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update form state when editing user changes
  useEffect(() => {
    if (editingUser) {
      setEditForm({
        displayName: editingUser.name || '',
        role: editingUser.role,
        active: (editingUser as any).active ?? true,
        allowedOutlets: editingUser.allowedOutlets || [],
      });
    }
  }, [editingUser]);

  const handleDeleteUser = async (uid: string) => {
    if (confirm('¿Estás seguro de eliminar este usuario?')) {
      await deleteUser(uid);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      await updateUser(editingUser.id, {
        displayName: editForm.displayName,
        role: editForm.role,
        active: editForm.active,
        allowedOutlets: editForm.allowedOutlets,
      });
      setEditingUser(null);
    } catch (error) {
      // Error handling already in hook
    }
  };

  const handleToggleStatus = (user: User, currentStatus: boolean) => {
    toggleUserStatus(user.id, !currentStatus);
  };

  // Invite Form State
  const [inviteForm, setInviteForm] = useState<{
    email: string;
    role: Role;
    allowedOutlets: string[];
  }>({ email: '', role: 'staff', allowedOutlets: [] });

  const handleInviteUser = async () => {
    try {
      await inviteUser({
        email: inviteForm.email,
        role: inviteForm.role,
        allowedOutlets: inviteForm.allowedOutlets,
      });
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', role: 'staff', allowedOutlets: [] });
    } catch (error) {
      // Error handled in hook
    }
  };

  // --- DERIVED STATE ---
  const filteredUsers = users.filter((user) => {
    const userActive = (user as any).active ?? true;
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'active' ? userActive : !userActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter((u) => (u as any).active).length,
    pending: users.filter((u) => !(u as any).active).length,
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
            <UserIcon size={12} /> Staff
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

  // Invitation State
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');

  // Derived state for invitations
  const filteredInvitations = invitations.filter((inv) =>
    inv.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

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
          value={filteredInvitations.length} // Use real pending invitations count
          icon={XCircle}
          color="bg-orange-500/20"
        />
        <StatsCard title="Admins" value={stats.admins} icon={Shield} color="bg-indigo-500/20" />
      </div>

      {/* TABS */}
      <div className="flex gap-4 border-b border-white/10">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
            activeTab === 'users' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          Usuarios
          {activeTab === 'users' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_-2px_6px_rgba(99,102,241,0.5)]"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`pb-3 px-1 text-sm font-medium transition-colors relative ${
            activeTab === 'invitations' ? 'text-indigo-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          Invitaciones Pendientes
          {invitations.length > 0 && (
            <span className="ml-2 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {invitations.length}
            </span>
          )}
          {activeTab === 'invitations' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_-2px_6px_rgba(99,102,241,0.5)]"></div>
          )}
        </button>
      </div>

      {/* CONTENT */}
      {activeTab === 'users' ? (
        <>
          {/* FILTERS & SEARCH */}
          <div className="bg-surface border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
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
                      Creado
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
                          {loading ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <>
                              <UserPlus size={32} className="opacity-20" />
                              <p>No se encontraron usuarios</p>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/10">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt={user.name}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                user.name?.charAt(0) || 'U'
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                {user.name || 'Sin Nombre'}
                              </p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                        <td className="px-6 py-4">
                          <button onClick={() => handleToggleStatus(user, (user as any).active)}>
                            {getStatusBadge((user as any).active)}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {user.allowedOutlets && user.allowedOutlets.length > 0 ? (
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
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
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
                              onClick={() => handleDeleteUser(user.id)}
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
        </>
      ) : (
        /* INVITATIONS TABLE */
        <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-black/20">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Outlets Asignados
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Enviado
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <p>No hay invitaciones pendientes</p>
                    </td>
                  </tr>
                ) : (
                  filteredInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-white">{inv.email}</td>
                      <td className="px-6 py-4">{getRoleBadge(inv.role)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {inv.allowedOutlets.map((o) => (
                            <span
                              key={o}
                              className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-300 border border-white/5"
                            >
                              {o}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          Pending
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            if (confirm('¿Cancelar invitación?')) cancelInvitation(inv.id);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm hover:underline"
                        >
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingUser && (
        // ... (keep existing edit modal)
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
                  value={editingUser?.email || ''}
                  disabled
                  className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-slate-400 italic cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 ml-1">Nombre</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 ml-1">Rol</label>
                  <select
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, role: e.target.value as any }))
                    }
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
                        checked={editForm.active}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, active: e.target.checked }))
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                      <span className="ml-3 text-sm font-medium text-slate-300">
                        {editForm.active ? 'Activo' : 'Inactivo'}
                      </span>
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
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20"
              >
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
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 ml-1">Rol Inicial</label>
                <select
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm((prev) => ({ ...prev, role: e.target.value as any }))
                  }
                >
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
                        checked={inviteForm.allowedOutlets.includes(outlet)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInviteForm((prev) => ({
                              ...prev,
                              allowedOutlets: [...prev.allowedOutlets, outlet],
                            }));
                          } else {
                            setInviteForm((prev) => ({
                              ...prev,
                              allowedOutlets: prev.allowedOutlets.filter((o) => o !== outlet),
                            }));
                          }
                        }}
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
              <button
                onClick={handleInviteUser}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium shadow-lg shadow-indigo-500/20"
              >
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
