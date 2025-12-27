import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
    animate?: boolean;
}

/**
 * Base skeleton component for loading states
 */
export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    width,
    height,
    rounded = 'md',
    animate = true
}) => {
    const roundedClasses = {
        none: '',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full'
    };

    return (
        <div
            className={`bg-white/5 ${roundedClasses[rounded]} ${animate ? 'animate-pulse' : ''} ${className}`}
            style={{ width, height }}
        />
    );
};

/**
 * Skeleton for text lines
 */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 1,
    className = ''
}) => (
    <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton
                key={i}
                height={16}
                className={i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}
            />
        ))}
    </div>
);

/**
 * Skeleton for cards
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`bg-surface border border-white/5 rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-4 mb-4">
            <Skeleton width={48} height={48} rounded="full" />
            <div className="flex-1 space-y-2">
                <Skeleton height={20} className="w-1/3" />
                <Skeleton height={14} className="w-1/2" />
            </div>
        </div>
        <SkeletonText lines={3} />
    </div>
);

/**
 * Skeleton for table rows
 */
export const SkeletonTableRow: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
    <tr className="border-b border-white/5">
        {Array.from({ length: columns }).map((_, i) => (
            <td key={i} className="p-4">
                <Skeleton height={16} className={i === 0 ? 'w-32' : 'w-20'} />
            </td>
        ))}
    </tr>
);

/**
 * Skeleton for stat cards (dashboard)
 */
export const SkeletonStatCard: React.FC = () => (
    <div className="glass-card p-6 flex items-center gap-4">
        <Skeleton width={48} height={48} rounded="full" />
        <div className="space-y-2">
            <Skeleton width={60} height={12} />
            <Skeleton width={40} height={28} />
        </div>
    </div>
);

/**
 * Skeleton for list items
 */
export const SkeletonListItem: React.FC = () => (
    <div className="flex items-center gap-4 p-4 border-b border-white/5">
        <Skeleton width={40} height={40} rounded="lg" />
        <div className="flex-1 space-y-2">
            <Skeleton height={16} className="w-1/3" />
            <Skeleton height={12} className="w-1/2" />
        </div>
        <Skeleton width={60} height={24} rounded="lg" />
    </div>
);
