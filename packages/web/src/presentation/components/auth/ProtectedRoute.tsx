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

    // 1. Check Roles
    if (currentUser && allowedRoles && !allowedRoles.includes(currentUser.role)) {
        return <Navigate to="/dashboard" replace />;
    }

    // 2. Render Protected Content
    return (
        <SyncProvider>
            <Outlet />
        </SyncProvider>
    );
};
