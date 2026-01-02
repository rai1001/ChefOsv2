import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Building2, UtensilsCrossed, Check, Wrench, Loader2, Trash2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

export const SettingsPage: React.FC = () => {
  const { settings, setSettings } = useStore();
  const [isFixing, setIsFixing] = useState(false);
  const [fixResult, setFixResult] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<any>(null);

  const handleModeChange = (mode: 'HOTEL' | 'RESTAURANT') => {
    setSettings({ businessType: mode });
  };

  const handleFixIngredients = async () => {
    if (
      !confirm(
        '¿Estás seguro de que quieres limpiar y validar todos los ingredientes? Esta operación puede tardar un momento.'
      )
    ) {
      return;
    }

    setIsFixing(true);
    setFixResult(null);

    try {
      const fixIngredients = httpsCallable(functions, 'fixIngredientsData');
      const result = await fixIngredients();
      setFixResult(result.data);
      alert('✅ Ingredientes limpiados correctamente. Recarga la página para ver los cambios.');
    } catch (error: any) {
      console.error('Error al limpiar ingredientes:', error);
      alert('❌ Error al limpiar ingredientes: ' + error.message);
    } finally {
      setIsFixing(false);
    }
  };

  const handleDeleteAllIngredients = async () => {
    const userInput = prompt(
      '⚠️ ADVERTENCIA: Esta operación eliminará TODOS los ingredientes de la base de datos de forma PERMANENTE.\n\n' +
        'Para confirmar, escribe exactamente: DELETE_ALL_INGREDIENTS'
    );

    if (userInput !== 'DELETE_ALL_INGREDIENTS') {
      if (userInput !== null) {
        alert('❌ Confirmación incorrecta. Operación cancelada.');
      }
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      const deleteAllIngredients = httpsCallable(functions, 'deleteAllIngredients');
      const result = await deleteAllIngredients({ confirmation: 'DELETE_ALL_INGREDIENTS' });
      setDeleteResult(result.data);
      alert(
        `✅ ${(result.data as any).deleted} ingredientes eliminados correctamente. Recarga la página para ver los cambios.`
      );
    } catch (error: any) {
      console.error('Error al eliminar ingredientes:', error);
      alert('❌ Error al eliminar ingredientes: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 p-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
        Configuración del Sistema
      </h1>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          Tipo de Negocio
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Selecciona el modo de operación para adaptar la interfaz y las funcionalidades.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* HOTEL CARD */}
          <div
            onClick={() => handleModeChange('HOTEL')}
            className={`cursor-pointer border-2 rounded-xl p-6 flex flex-col items-center gap-4 transition-all ${
              settings.businessType === 'HOTEL'
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 hover:border-indigo-300 dark:border-gray-700'
            }`}
          >
            <div
              className={`p-4 rounded-full ${settings.businessType === 'HOTEL' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}
            >
              <Building2 size={32} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Hotel & Resort</h3>
              <p className="text-sm text-gray-500 mt-2">
                Gestión completa incluyendo Habitaciones, Room Service, Eventos (BEOs) y Ocupación.
              </p>
            </div>
            {settings.businessType === 'HOTEL' && (
              <div className="absolute top-4 right-4 text-indigo-600">
                <Check size={20} />
              </div>
            )}
          </div>

          {/* RESTAURANT CARD */}
          <div
            onClick={() => handleModeChange('RESTAURANT')}
            className={`cursor-pointer border-2 rounded-xl p-6 flex flex-col items-center gap-4 transition-all ${
              settings.businessType === 'RESTAURANT'
                ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20'
                : 'border-gray-200 hover:border-orange-300 dark:border-gray-700'
            }`}
          >
            <div
              className={`p-4 rounded-full ${settings.businessType === 'RESTAURANT' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}
            >
              <UtensilsCrossed size={32} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                Restaurante Independiente
              </h3>
              <p className="text-sm text-gray-500 mt-2">
                Interfaz simplificada centrada en Mesas, Turnos, Reservas y Producción Culinaria.
              </p>
            </div>
            {settings.businessType === 'RESTAURANT' && (
              <div className="absolute top-4 right-4 text-orange-600">
                <Check size={20} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Nota:</strong> Al cambiar el modo, la barra lateral y los widgets del dashboard
            se actualizarán automáticamente. No es necesario recargar.
          </p>
        </div>
      </div>

      {/* Maintenance Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="text-gray-600 dark:text-gray-400" size={24} />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            Mantenimiento del Sistema
          </h2>
        </div>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          Herramientas de administración para mantener la integridad de los datos.
        </p>

        <div className="space-y-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Limpiar y Validar Ingredientes
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Esta operación corrige ingredientes con datos mal formados, normaliza unidades y
              categorías, y elimina registros inválidos.
            </p>
            <button
              onClick={handleFixIngredients}
              disabled={isFixing}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isFixing ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Limpiando...
                </>
              ) : (
                <>
                  <Wrench size={16} />
                  Ejecutar Limpieza
                </>
              )}
            </button>
            {fixResult && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>✅ Completado:</strong> {fixResult.fixed} corregidos, {fixResult.deleted}{' '}
                  eliminados, {fixResult.skipped} sin cambios
                </p>
              </div>
            )}
          </div>

          {/* Delete All Ingredients */}
          <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Trash2 size={18} className="text-red-600" />
              Eliminar Todos los Ingredientes
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              ⚠️ <strong>PELIGRO:</strong> Esta operación eliminará TODOS los ingredientes de la
              base de datos de forma PERMANENTE. Solo usar para pruebas o limpieza total del
              sistema.
            </p>
            <button
              onClick={handleDeleteAllIngredients}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Eliminar Todos los Ingredientes
                </>
              )}
            </button>
            {deleteResult && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>✅ Completado:</strong> {deleteResult.deleted} ingredientes eliminados
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
