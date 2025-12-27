import React, { useEffect } from 'react';
import { useStore } from '@/presentation/store/useStore';
import { useOutletScoping } from '@/hooks/useOutletScoping';
import { Calendar, Users, Coffee, Upload, Trash2, Search, CheckCircle, Store, Sun, Moon, Clock } from 'lucide-react';
import { useToast } from '@/presentation/components/ui';

import * as XLSX from 'xlsx';
import { normalizeDate } from '@/utils/date';
import type { HospitalityService, MealType } from '@/types';

export const HospitalityLogisticsPage: React.FC = () => {
    const {
        hospitalityServices, updateHospitalityService,
        ingredients, fetchHospitalityServices, commitHospitalityConsumption
    } = useStore();
    const { isValidOutlet } = useOutletScoping();
    const { addToast } = useToast();

    // State
    const [selectedDate, setSelectedDate] = React.useState<string>(normalizeDate(new Date()));
    const [selectedMeal, setSelectedMeal] = React.useState<MealType>('breakfast');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

    // Derived State
    const currentServiceId = `${selectedDate}_${selectedMeal}`;
    const currentService = hospitalityServices.find(s => s.id === currentServiceId) || {
        id: currentServiceId,
        date: selectedDate,
        mealType: selectedMeal,
        forecastPax: 0,
        realPax: 0,
        consumption: {}
    } as HospitalityService;

    const consumedIngredients = Object.entries(currentService.consumption || {}).map(([id, qty]) => {
        const ing = ingredients.find(i => i.id === id);
        return { id, qty, name: ing?.name || 'Unknown', unit: ing?.unit || 'units' };
    });

    // Effect to load data
    useEffect(() => {
        fetchHospitalityServices(); // Loads all for the outlet
    }, [fetchHospitalityServices]);

    // Handlers
    const handlePaxChange = async (field: 'forecastPax' | 'realPax', value: number) => {
        await updateHospitalityService({
            ...currentService,
            [field]: value
        });
    };

    const handleAddConsumption = async (ingredientId: string) => {
        const currentQty = currentService.consumption?.[ingredientId] || 0;
        await updateHospitalityService({
            ...currentService,
            consumption: {
                ...currentService.consumption,
                [ingredientId]: currentQty + 1
            }
        });
    };

    const handleUpdateConsumptionQty = async (ingredientId: string, qty: number) => {
        if (qty <= 0) {
            const newConsumption = { ...currentService.consumption };
            delete newConsumption[ingredientId];
            await updateHospitalityService({ ...currentService, consumption: newConsumption });
        } else {
            await updateHospitalityService({
                ...currentService,
                consumption: {
                    ...currentService.consumption,
                    [ingredientId]: qty
                }
            });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !isValidOutlet) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                // Use cellDates: true for robust date handling, range: 1 to skip title
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                if (workbook.SheetNames.length === 0) throw new Error("Excel vacío");
                const sheetName = workbook.SheetNames[0];
                if (!sheetName) throw new Error("Nombre de hoja inválido");
                const sheet = workbook.Sheets[sheetName];
                if (!sheet) throw new Error("Hoja no encontrada");
                const json = XLSX.utils.sheet_to_json<any>(sheet, { range: 1, defval: undefined });

                let count = 0;
                let rowsFound = 0;

                for (const row of json) {
                    rowsFound++;
                    const rowKeys = Object.keys(row);

                    // 1. Resolve Date flexibly
                    const dateKey = rowKeys.find(k => ['fecha', 'date'].includes(k.trim().toLowerCase()));
                    const dateRaw = dateKey ? row[dateKey] : undefined;
                    if (!dateRaw || String(dateRaw).toLowerCase().includes('total')) continue;

                    const date = normalizeDate(dateRaw);
                    if (!date) continue;

                    // 2. Resolve Multi-column meals
                    const meals = [
                        { keys: ['desayuno', 'desayunos', 'breakfast'], type: 'breakfast' as MealType },
                        { keys: ['comida', 'comidas', 'lunch', 'almuerzo'], type: 'lunch' as MealType },
                        { keys: ['cena', 'cenas', 'dinner'], type: 'dinner' as MealType }
                    ];

                    let importedInRow = false;
                    for (const meal of meals) {
                        const mealKey = rowKeys.find(k => meal.keys.some(mk => k.trim().toLowerCase().includes(mk)));
                        const mealPax = mealKey ? row[mealKey] : undefined;

                        if (mealPax !== undefined) {
                            const pax = Number(mealPax || 0);
                            if (pax > 0) {
                                await updateHospitalityService({
                                    id: `${date}_${meal.type}`,
                                    date,
                                    mealType: meal.type,
                                    forecastPax: pax,
                                    realPax: pax,
                                    consumption: {}
                                });
                                count++;
                                importedInRow = true;
                            }
                        }
                    }

                    // 3. Fallback (PAX + Tipo)
                    if (!importedInRow) {
                        const paxKey = rowKeys.find(k => ['pax'].includes(k.trim().toLowerCase()));
                        const typeKey = rowKeys.find(k => ['tipo', 'type'].includes(k.trim().toLowerCase()));
                        const paxValue = paxKey ? row[paxKey] : undefined;
                        const typeValue = typeKey ? String(row[typeKey] || 'desayuno').toLowerCase() : 'desayuno';

                        if (paxValue !== undefined && Number(paxValue) > 0) {
                            let mealType: MealType = 'breakfast';
                            if (typeValue.includes('comida') || typeValue.includes('almuerzo') || typeValue.includes('lunch')) mealType = 'lunch';
                            if (typeValue.includes('cena') || typeValue.includes('dinner')) mealType = 'dinner';

                            await updateHospitalityService({
                                id: `${date}_${mealType}`,
                                date,
                                mealType,
                                forecastPax: Number(paxValue),
                                realPax: Number(paxValue),
                                consumption: {}
                            });
                            count++;
                        }
                    }
                }

                fetchHospitalityServices();
                if (count > 0) {
                    addToast(`Importados ${count} servicios de ocupación`, 'success');
                } else {
                    addToast(`No se encontraron datos válidos en las ${rowsFound} filas leídas.`, 'error');
                }
                setIsImportModalOpen(false);
            } catch (err) {
                console.error("Import error:", err);
                addToast("Error al procesar el archivo Excel", "error");
            } finally {
                e.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Filter ingredients for search
    const filteredIngredients = ingredients.filter(i =>
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !currentService.consumption?.[i.id]
    ).slice(0, 10);

    if (!isValidOutlet) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
                    <Store className="w-8 h-8 text-slate-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Selecciona una Cocina</h2>
                <p className="text-slate-400 max-w-md">
                    Selecciona una cocina activa para gestionar la logística de hostelería.
                </p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-primary bg-clip-text text-transparent flex items-center gap-3">
                        <Clock className="text-primary" size={28} />
                        Logística de Hostelería
                    </h2>
                    <p className="text-slate-400 mt-1">Gestión de todos los servicios diarios</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 bg-surface hover:bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg transition-all"
                    >
                        <Upload size={20} />
                        Importar Ocupación
                    </button>
                    <div className="flex items-center gap-2 bg-surface border border-white/10 rounded-lg px-3 py-2">
                        <Calendar size={18} className="text-slate-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-white outline-none font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Meal Selector */}
            <div className="flex bg-surface p-1 rounded-xl border border-white/5 w-fit">
                {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((meal) => (
                    <button
                        key={meal}
                        onClick={() => setSelectedMeal(meal)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${selectedMeal === meal
                            ? 'bg-primary text-white shadow-lg'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        {meal === 'breakfast' && <Coffee size={16} />}
                        {meal === 'lunch' && <Sun size={16} />}
                        {meal === 'dinner' && <Moon size={16} />}
                        {meal === 'breakfast' ? 'Desayuno' : meal === 'lunch' ? 'Comida' : 'Cena'}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Occupancy Section */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-surface border border-white/5 p-6 rounded-xl">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <Users size={20} className="text-indigo-400" />
                            Ocupación - {selectedMeal === 'breakfast' ? 'Desayuno' : selectedMeal === 'lunch' ? 'Comida' : 'Cena'}
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Previsión PAX</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={currentService.forecastPax}
                                        onChange={(e) => handlePaxChange('forecastPax', Number(e.target.value))}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-3 px-4 text-2xl font-bold text-indigo-400 focus:border-indigo-500 outline-none transition-colors"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">pers.</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-2">Real PAX</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        value={currentService.realPax}
                                        onChange={(e) => handlePaxChange('realPax', Number(e.target.value))}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg py-3 px-4 text-2xl font-bold text-emerald-400 focus:border-emerald-500 outline-none transition-colors"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">pers.</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-slate-400">Desviación</span>
                                    <span className={`font-bold ${currentService.realPax > currentService.forecastPax ? 'text-orange-400' : 'text-slate-200'}`}>
                                        {currentService.realPax - currentService.forecastPax > 0 ? '+' : ''}
                                        {currentService.realPax - currentService.forecastPax}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Consumption Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-surface border border-white/5 p-6 rounded-xl min-h-[500px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Coffee size={20} className="text-orange-400" />
                                Diario de Consumos
                                {currentService.isCommitted && (
                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/20 ml-2">
                                        <CheckCircle size={10} />
                                        Stock Descontado
                                    </span>
                                )}
                            </h3>
                            <div className="flex items-center gap-3">
                                {!currentService.isCommitted && consumedIngredients.length > 0 && (
                                    <button
                                        onClick={async () => {
                                            if (confirm('\u00BFConfirmas el descuento de stock para estos consumos? Esta acci\u00F3n no se puede deshacer.')) {
                                                await commitHospitalityConsumption(currentService.id);
                                                addToast('Stock descontado correctamente', 'success');
                                            }
                                        }}
                                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        <CheckCircle size={14} />
                                        Confirmar Stock
                                    </button>
                                )}
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar ingrediente..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-orange-500 outline-none"
                                    />
                                    {searchQuery && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-lg shadow-xl overflow-hidden z-10">
                                            {filteredIngredients.map(ing => (
                                                <button
                                                    key={ing.id}
                                                    onClick={() => {
                                                        handleAddConsumption(ing.id);
                                                        setSearchQuery('');
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-white/5 text-slate-300 text-sm flex justify-between group"
                                                >
                                                    <span>{ing.name}</span>
                                                    <span className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">A\u00F1adir</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1">
                            <table className="w-full text-left">
                                <thead className="text-xs uppercase bg-white/5 text-slate-400">
                                    <tr>
                                        <th className="p-3 rounded-l-lg">Ingrediente</th>
                                        <th className="p-3 text-right">Consumo</th>
                                        <th className="p-3 text-right rounded-r-lg">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-white">
                                    {consumedIngredients.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="p-8 text-center text-slate-500 italic">
                                                No hay consumos registrados para este servicio.
                                            </td>
                                        </tr>
                                    ) : (
                                        consumedIngredients.map(({ id, name, qty, unit }) => (
                                            <tr key={id} className="group hover:bg-white/5 transition-colors">
                                                <td className="p-3 font-medium">{name}</td>
                                                <td className="p-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.1"
                                                            value={qty}
                                                            onChange={(e) => handleUpdateConsumptionQty(id, Number(e.target.value))}
                                                            className="w-20 bg-black/20 border border-white/10 rounded px-2 py-1 text-right text-emerald-400 font-mono focus:border-emerald-500 outline-none"
                                                        />
                                                        <span className="text-slate-500 text-sm w-8">{unit}</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => handleUpdateConsumptionQty(id, 0)}
                                                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Import Modal */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)}>
                    <div className="bg-surface border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-white mb-4">Importar Ocupaci\u00F3n</h3>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Sube un archivo Excel con las columnas: <br />
                            <code className="bg-black/30 px-1.5 py-0.5 rounded text-indigo-400">Fecha, Desayunos, Comidas, Cenas</code> <br />
                            <span className="text-[10px] mt-2 block italic text-slate-500">* Soporta tambi\u00E9n el formato antiguo de Fecha/PAX/Tipo.</span>
                        </p>

                        <div className="flex flex-col items-center gap-4">
                            <label className="w-full flex flex-col items-center justify-center p-10 border-2 border-dashed border-white/10 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                                <Upload className="w-10 h-10 text-slate-500 mb-4 group-hover:text-primary group-hover:scale-110 transition-all" />
                                <span className="text-white font-bold">Seleccionar Archivo</span>
                                <span className="text-slate-500 text-xs mt-1">Excel (.xlsx, .xls)</span>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </label>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setIsImportModalOpen(false)}
                                className="px-4 py-2 text-slate-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

