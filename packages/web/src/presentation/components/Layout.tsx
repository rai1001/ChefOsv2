import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

import { Outlet } from 'react-router-dom';

export const Layout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen bg-background text-slate-100 overflow-hidden selection:bg-primary/30 font-sans">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative flex flex-col">
                {/* Mobile Header */}
                <div className="md:hidden bg-surface border-b border-white/5 p-4 flex items-center justify-between sticky top-0 z-30">
                    <button onClick={() => setIsSidebarOpen(true)} className="text-slate-300">
                        <Menu size={24} />
                    </button>
                    <h1 className="text-lg font-bold text-white">Chef<span className="text-primary">OS</span></h1>
                    <div className="w-6" />
                </div>

                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 pointer-events-none" />

                <div className="flex-1 overflow-auto p-4 md:p-6 relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
