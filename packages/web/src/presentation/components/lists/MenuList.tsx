import React from 'react';
import type { Menu } from '@/types';

interface MenuListProps {
    menus: Menu[];
}

export const MenuList: React.FC<MenuListProps> = ({ menus }) => {
    return (
        <div className="bg-surface border border-white/5 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-black/20 text-slate-500 uppercase font-medium">
                    <tr>
                        <th className="p-4">Nombre del Menú</th>
                        <th className="p-4">Platos</th>
                        <th className="p-4 text-right">Precio Venta</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {menus.map(menu => (
                        <tr key={menu.id} className="hover:bg-white/[0.02]">
                            <td className="p-4 font-medium text-white">{menu.name}</td>
                            <td className="p-4 opacity-70">{menu.recipeIds.length} platos</td>
                            <td className="p-4 text-right font-mono text-emerald-400">
                                {menu.sellPrice ? `$${menu.sellPrice}` : '-'}
                            </td>
                        </tr>
                    ))}
                    {menus.length === 0 && (
                        <tr><td colSpan={3} className="p-8 text-center opacity-50">No hay menús.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
