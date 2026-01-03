import React from 'react';
import { useStore } from '../store/useStore';
import { Building2, UtensilsCrossed, Check, Wrench, Trash2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, setSettings } = useStore();
  /* State removed for migration stub */

  const handleModeChange = (mode: 'HOTEL' | 'RESTAURANT') => {
    setSettings({ businessType: mode });
  };

  const handleFixIngredients = async () => {
    alert('Esta funcionalidad está temporalmente deshabilitada durante la migración.');
  };

  const handleDeleteAllIngredients = async () => {
    alert('Esta funcionalidad está temporalmente deshabilitada durante la migración.');
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
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
            >
              <Wrench size={16} />
              Ejecutar Limpieza
            </button>
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
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
            >
              <Trash2 size={16} />
              Eliminar Todos los Ingredientes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
