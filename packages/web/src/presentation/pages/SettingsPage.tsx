import React from 'react';
import { useStore } from '../store/useStore';
import { Building2, UtensilsCrossed, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, setSettings } = useStore();

  const handleModeChange = (mode: 'HOTEL' | 'RESTAURANT') => {
    setSettings({ businessType: mode });
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
    </div>
  );
};
