import React from 'react';

export const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`animate-pulse bg-surface/50 rounded-lg ${className}`} />
    );
};

export const EventsSkeleton: React.FC = () => {
    return (
        <div className="h-full flex flex-col p-6 overflow-hidden animate-pulse">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/10 rounded" />
                    <div className="h-8 w-48 bg-white/10 rounded" />
                </div>
                <div className="h-10 w-32 bg-white/10 rounded-lg" />
                <div className="h-10 w-48 bg-white/10 rounded-lg" />
            </div>

            <div className="flex-1 glass-card p-4 flex flex-col overflow-hidden border border-white/5 rounded-xl">
                <div className="grid grid-cols-7 mb-2 border-b border-white/5 pb-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <div key={i} className="flex justify-center">
                            <div className="h-4 w-8 bg-white/10 rounded" />
                        </div>
                    ))}
                </div>
                <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-1 overflow-hidden">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-2 min-h-[100px]">
                            <div className="h-4 w-4 bg-white/10 rounded-full mb-2" />
                            <div className="space-y-1">
                                <div className="h-3 w-full bg-white/10 rounded" />
                                <div className="h-3 w-2/3 bg-white/10 rounded" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const ProductionSkeleton: React.FC = () => {
    return (
        <div className="flex h-full bg-background animate-pulse">
            <div className="w-80 border-r border-white/5 bg-surface/30 p-4 flex flex-col gap-4">
                <div className="h-8 w-32 bg-white/10 rounded" />
                <div className="h-48 w-full bg-white/10 rounded-xl" />
                <div className="flex-1 space-y-2">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-16 w-full bg-white/10 rounded-lg" />
                    ))}
                </div>
            </div>
            <div className="flex-1 p-8 space-y-8">
                <div className="flex justify-between">
                    <div className="space-y-2">
                        <div className="h-10 w-64 bg-white/10 rounded" />
                        <div className="h-6 w-48 bg-white/10 rounded" />
                    </div>
                    <div className="space-y-2 flex flex-col items-end">
                        <div className="flex gap-2">
                            <div className="h-10 w-10 bg-white/10 rounded" />
                            <div className="h-10 w-10 bg-white/10 rounded" />
                        </div>
                        <div className="h-4 w-24 bg-white/10 rounded" />
                        <div className="h-8 w-32 bg-white/10 rounded" />
                    </div>
                </div>
                <div className="h-10 w-96 bg-white/10 rounded" />
                <div className="grid grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-white/10 rounded-xl" />
                    ))}
                </div>
            </div>
        </div>
    );
};
