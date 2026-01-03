import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { SyncProvider } from '@/presentation/providers/SyncProvider';
import { useStore } from '@/presentation/store/useStore';
import type { Role } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  redirectPath?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { currentUser } = useStore();

  // 0. Check Authentication
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // 1. Check Roles
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // 2. Render Protected Content
  return (
    <SyncProvider>
      <Outlet />
    </SyncProvider>
  );
};
