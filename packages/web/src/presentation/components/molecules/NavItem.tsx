import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItemProps {
  icon: React.ReactElement<{ size?: number }>;
  label: string;
  to: string;
}

export const NavItem = ({ icon, label, to }: NavItemProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
          isActive
            ? 'bg-primary text-white shadow-lg'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {React.cloneElement(icon, { size: 18 })}
      <span className="font-medium text-sm">{label}</span>
    </NavLink>
  );
};
