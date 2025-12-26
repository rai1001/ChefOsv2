import React from 'react';
import {
    LayoutDashboard, Calendar, ShoppingCart, Database, CalendarDays, ChefHat,
    Package, Truck, ClipboardList, ShoppingBag, Trash2, ShieldCheck,
    TrendingUp, Search, BookOpen, Sparkles, Coffee, LogOut, Settings,
    Zap, Briefcase, Activity, Layers, X
} from 'lucide-react';
import { NavItem } from './molecules/NavItem';
import { NavGroup } from './molecules/NavGroup';
import { useAtomValue } from 'jotai';
import { userAtom } from '../store/authAtoms';
import { getAuth } from 'firebase/auth';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const user = useAtomValue(userAtom);

    return (
        <aside className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-white/5 flex flex-col overflow-y-auto
      transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0 md:bg-transparent md:border-r md:border-white/5
    `}>
            <div className="p-6 flex justify-between items-center md:block">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">
                        Chef<span className="text-primary">OS</span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">Gestión de Cocina Premium</p>
                </div>
                <button onClick={onClose} className="md:hidden text-slate-400">
                    <X size={24} />
                </button>
            </div>

            <nav className="flex-1 px-4 space-y-4 py-4">
                <NavGroup
                    label="Logística / Operaciones"
                    icon={<Layers />}
                    activePaths={['/dashboard', '/schedule', '/events', '/hospitality', '/breakfast', '/purchasing', '/waste', '/haccp', '/analytics']}
                >
                    <NavItem to="/dashboard" icon={<LayoutDashboard />} label="Inicio" />
                    <NavItem to="/schedule" icon={<Calendar />} label="Horario" />
                    <NavItem to="/events" icon={<CalendarDays />} label="Eventos" />
                    <NavItem to="/hospitality" icon={<Coffee />} label="Logística Hotel" />
                    <NavItem to="/breakfast" icon={<Coffee />} label="Servicio Diario" />
                    <NavItem to="/purchasing" icon={<ShoppingBag />} label="Compras Auto" />
                    <NavItem to="/waste" icon={<Trash2 />} label="Mermas" />
                    <NavItem to="/haccp" icon={<ShieldCheck />} label="HACCP Digital" />
                    <NavItem to="/analytics" icon={<TrendingUp />} label="Ingeniería Menú" />
                </NavGroup>

                <NavGroup
                    label="Estrategia Menús"
                    icon={<BookOpen />}
                    activePaths={['/menus', '/fichas-tecnicas', '/ai-menu']}
                >
                    <NavItem to="/menus" icon={<BookOpen />} label="Mis Menús" />
                    <NavItem to="/fichas-tecnicas" icon={<ClipboardList />} label="Fichas Técnicas" />
                    <NavItem to="/ai-menu" icon={<Sparkles />} label="Generador IA" />
                </NavGroup>

                <NavGroup
                    label="Inteligencia AI"
                    icon={<Sparkles />}
                    activePaths={['/ai-search', '/ai-usage']}
                >
                    <NavItem to="/ai-search" icon={<Search />} label="Asistente Chef" />
                    <NavItem to="/ai-usage" icon={<Activity />} label="Control de Costes" />
                </NavGroup>

                <NavGroup
                    label="Gestión Base"
                    icon={<Database />}
                    activePaths={['/ingredients', '/inventory', '/recipes', '/suppliers', '/staff']}
                >
                    <NavItem to="/ingredients" icon={<Package />} label="Ingredientes" />
                    <NavItem to="/inventory" icon={<ClipboardList />} label="Inventario" />
                    <NavItem to="/recipes" icon={<ChefHat />} label="Recetas" />
                    <NavItem to="/suppliers" icon={<Truck />} label="Proveedores" />
                    <NavItem to="/staff" icon={<Briefcase />} label="Personal" />
                </NavGroup>

                <NavGroup
                    label="Producción / Modo KDS"
                    icon={<Zap />}
                    activePaths={['/production', '/kds', '/data']}
                >
                    <NavItem to="/production" icon={<ShoppingCart />} label="Producción" />
                    <NavItem to="/kds" icon={<ChefHat />} label="Modo KDS (Tablet)" />
                    <NavItem to="/data" icon={<Database />} label="Datos" />
                </NavGroup>

                <div className="pt-4 border-t border-white/5">
                    <NavItem to="/integrations" icon={<Settings />} label="Integraciones" />
                </div>
            </nav>

            <div className="p-4 border-t border-white/5 mx-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent overflow-hidden">
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || 'User'} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-medium truncate max-w-[100px]">{user?.displayName || user?.email?.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 capitalize">{user?.role || 'User'}</p>
                    </div>
                </div>
                <button
                    onClick={async () => {
                        const auth = getAuth();
                        await auth.signOut();
                        window.location.href = '/login';
                    }}
                    className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                    title="Cerrar Sesión"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </aside>
    );
};
