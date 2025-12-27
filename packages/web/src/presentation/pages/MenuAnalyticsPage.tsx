import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { TrendingUp, TrendingDown, Star, Dog, DollarSign, HelpCircle } from 'lucide-react';
import type { MenuItemAnalytics } from '@/types';

export const MenuAnalyticsPage: React.FC = () => {
    const { calculateMenuAnalytics } = useStore();

    // Date range state (last 3 months by default)
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setMonth(date.getMonth() - 3);
        return date.toISOString().split('T')[0];
    });

    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    const [analytics, setAnalytics] = useState<MenuItemAnalytics[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Calculate analytics via Cloud Function
    useEffect(() => {
        let isMounted = true;
        const fetchAnalytics = async () => {
            setIsLoading(true);
            try {
                if (!startDate || !endDate) return;
                const data = await calculateMenuAnalytics(startDate, endDate);
                // The error was on line 29? No, the error log said:
                // src/presentation/pages/MenuAnalyticsPage.tsx:29:59 - error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
                // wait, line 29 is: const data = await calculateMenuAnalytics(startDate, endDate);
                // calculateMenuAnalytics is defined in store. usage in effect [startDate, endDate]

                // Let's look closer. startDate/endDate states are initialized with strings.
                // But let's be safe.
                if (isMounted && data) {
                    setAnalytics(data);
                }
            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        fetchAnalytics();
        return () => { isMounted = false; };
    }, [calculateMenuAnalytics, startDate, endDate]);

    // Group by classification
    const grouped = useMemo(() => {
        const stars = analytics.filter(a => a.classification === 'star');
        const dogs = analytics.filter(a => a.classification === 'dog');
        const cashCows = analytics.filter(a => a.classification === 'cash-cow');
        const puzzles = analytics.filter(a => a.classification === 'puzzle');

        return { stars, dogs, cashCows, puzzles };
    }, [analytics]);

    if (isLoading) {
        return (
            <div className="p-8 h-full flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Calculando Ingeniería de Menús...</p>
                <p className="text-[10px] text-slate-600 mt-2">Consultando datos históricos en la nube</p>
            </div>
        );
    }

    if (analytics.length === 0) {
        return (
            <div className="p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Ingeniería de Menús
                    </h1>
                    <p className="text-slate-400">Análisis de platos según Rentabilidad y Popularidad (Matriz de Boston)</p>
                </div>

                <div className="bg-surface rounded-xl p-8 text-center">
                    <p className="text-slate-400 mb-4">No hay eventos con menús en el rango seleccionado</p>
                    <div className="flex gap-4 justify-center items-center">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="px-4 py-2 bg-background border border-white/10 rounded-lg text-white"
                        />
                        <span className="text-slate-500">hasta</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="px-4 py-2 bg-background border border-white/10 rounded-lg text-white"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Ingeniería de Menús
                    </h1>
                    <p className="text-slate-400">Análisis de platos según Rentabilidad y Popularidad</p>
                </div>

                {/* Date Range Filter */}
                <div className="flex gap-4 items-center bg-surface px-4 py-3 rounded-xl border border-white/5">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 bg-background border border-white/10 rounded-lg text-white text-sm"
                    />
                    <span className="text-slate-500 text-sm">—</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 bg-background border border-white/10 rounded-lg text-white text-sm"
                    />
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-6 mb-8">
                <StatCard
                    label="Estrellas"
                    value={grouped.stars.length}
                    icon={<Star size={24} className="text-yellow-400" />}
                    color="yellow"
                    description="Alta rentabilidad, alta venta"
                />
                <StatCard
                    label="Vacas Lecheras"
                    value={grouped.cashCows.length}
                    icon={<DollarSign size={24} className="text-green-400" />}
                    color="green"
                    description="Alta venta, baja rentabilidad"
                />
                <StatCard
                    label="Interrogantes"
                    value={grouped.puzzles.length}
                    icon={<HelpCircle size={24} className="text-blue-400" />}
                    color="blue"
                    description="Alta rentabilidad, baja venta"
                />
                <StatCard
                    label="Perros"
                    value={grouped.dogs.length}
                    icon={<Dog size={24} className="text-red-400" />}
                    color="red"
                    description="Baja rentabilidad, baja venta"
                />
            </div>

            {/* Boston Matrix Grid */}
            <div className="grid grid-cols-2 gap-6">
                {/* Stars - Top Right */}
                <QuadrantCard
                    title="⭐ Estrellas"
                    dishes={grouped.stars}
                    color="yellow"
                    recommendation="Mantener y promover estos platos. Son los más exitosos del menú."
                />

                {/* Puzzles - Top Left */}
                <QuadrantCard
                    title="❓ Interrogantes"
                    dishes={grouped.puzzles}
                    color="blue"
                    recommendation="Aumentar promoción o ajustar precio. Tienen buen margen pero no venden suficiente."
                />

                {/* Cash Cows - Bottom Left */}
                <QuadrantCard
                    title="💰 Vacas Lecheras"
                    dishes={grouped.cashCows}
                    color="green"
                    recommendation="Optimizar costes. Venden mucho pero el margen es bajo."
                />

                {/* Dogs - Bottom Right */}
                <QuadrantCard
                    title="🐕 Perros"
                    dishes={grouped.dogs}
                    color="red"
                    recommendation="Considerar eliminar del menú. No venden y el margen es bajo."
                />
            </div>
        </div>
    );
};

// Stat Card Component
interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: 'yellow' | 'green' | 'blue' | 'red';
    description: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color, description }) => {
    const colorClasses = {
        yellow: 'border-yellow-500/20 bg-yellow-500/5',
        green: 'border-green-500/20 bg-green-500/5',
        blue: 'border-blue-500/20 bg-blue-500/5',
        red: 'border-red-500/20 bg-red-500/5',
    };

    return (
        <div className={`p-6 rounded-xl border ${colorClasses[color]}`}>
            <div className="flex items-center gap-3 mb-2">
                {icon}
                <h3 className="text-lg font-semibold text-white">{label}</h3>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{value}</p>
            <p className="text-xs text-slate-400">{description}</p>
        </div>
    );
};

// Quadrant Card Component
interface QuadrantCardProps {
    title: string;
    dishes: MenuItemAnalytics[];
    color: 'yellow' | 'green' | 'blue' | 'red';
    recommendation: string;
}

const QuadrantCard: React.FC<QuadrantCardProps> = ({ title, dishes, color, recommendation }) => {
    const colorClasses = {
        yellow: 'border-yellow-500/30 bg-yellow-500/5',
        green: 'border-green-500/30 bg-green-500/5',
        blue: 'border-blue-500/30 bg-blue-500/5',
        red: 'border-red-500/30 bg-red-500/5',
    };

    const headerColors = {
        yellow: 'bg-yellow-500/10 border-yellow-500/30',
        green: 'bg-green-500/10 border-green-500/30',
        blue: 'bg-blue-500/10 border-blue-500/30',
        red: 'bg-red-500/10 border-red-500/30',
    };

    return (
        <div className={`rounded-xl border-2 ${colorClasses[color]} overflow-hidden`}>
            {/* Header */}
            <div className={`p-4 border-b ${headerColors[color]}`}>
                <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-300">{recommendation}</p>
            </div>

            {/* Dishes List */}
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {dishes.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No hay platos en esta categoría</p>
                ) : (
                    dishes.map((dish) => (
                        <DishCard key={dish.recipeId} dish={dish} />
                    ))
                )}
            </div>
        </div>
    );
};

// Dish Card Component
interface DishCardProps {
    dish: MenuItemAnalytics;
}

const DishCard: React.FC<DishCardProps> = ({ dish }) => {
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
        }).format(value);
    };

    const formatPercent = (value: number) => {
        return (value * 100).toFixed(1) + '%';
    };

    return (
        <div className="bg-background p-4 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-white">{dish.recipeName}</h4>
                <div className="flex gap-2">
                    <div className="flex items-center gap-1 text-green-400 text-sm">
                        <TrendingUp size={14} />
                        <span>{formatPercent(dish.profitabilityScore)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-400 text-sm">
                        <TrendingDown size={14} />
                        <span>{formatPercent(dish.popularityScore)}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="text-slate-500 text-xs mb-1">Total Pedidos</p>
                    <p className="text-white font-medium">{dish.totalOrders} PAX</p>
                </div>
                <div>
                    <p className="text-slate-500 text-xs mb-1">Beneficio Total</p>
                    <p className="text-white font-medium">{formatCurrency(dish.totalProfit)}</p>
                </div>
                <div>
                    <p className="text-slate-500 text-xs mb-1">Ingresos Totales</p>
                    <p className="text-white font-medium">{formatCurrency(dish.totalRevenue)}</p>
                </div>
                <div>
                    <p className="text-slate-500 text-xs mb-1">Beneficio/PAX</p>
                    <p className="text-white font-medium">{formatCurrency(dish.avgProfitPerServing)}</p>
                </div>
            </div>
        </div>
    );
};

