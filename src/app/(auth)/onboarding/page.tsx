'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChefHat } from 'lucide-react'

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Step 1: Hotel
  const [tenantName, setTenantName] = useState('')
  const [hotelName, setHotelName] = useState('')
  const [hotelSlug, setHotelSlug] = useState('')
  const [timezone, setTimezone] = useState('Europe/Madrid')
  const [currency, setCurrency] = useState('EUR')

  // Auto-generate slug from hotel name
  function handleHotelNameChange(name: string) {
    setHotelName(name)
    setHotelSlug(
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    )
  }

  async function handleCreateHotel() {
    if (!tenantName.trim() || !hotelName.trim()) return
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.rpc('create_tenant_with_hotel', {
      p_tenant_name: tenantName.trim(),
      p_hotel_name: hotelName.trim(),
      p_hotel_slug: hotelSlug || 'hotel',
      p_timezone: timezone,
      p_currency: currency,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
    setStep(2)
  }

  function handleSkipCatalog() {
    setStep(3)
  }

  function handleFinish() {
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-bg-card p-8">
        {/* Header */}
        <div className="text-center">
          <ChefHat className="mx-auto h-10 w-10 text-accent" />
          <h1 className="mt-2 text-xl font-bold text-text-primary">
            Configura tu cocina
          </h1>
          {/* Progress */}
          <div className="mt-4 flex items-center justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 w-12 rounded-full transition-colors ${
                  s <= step ? 'bg-accent' : 'bg-border'
                }`}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-text-muted">
            Paso {step} de 3
          </p>
        </div>

        {/* Step 1: Hotel */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Tu hotel
            </h2>

            <div>
              <label htmlFor="tenantName" className="block text-sm text-text-secondary">
                Empresa / Grupo
              </label>
              <input
                id="tenantName"
                type="text"
                required
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Eurostars Hotel Company"
              />
            </div>

            <div>
              <label htmlFor="hotelName" className="block text-sm text-text-secondary">
                Nombre del hotel
              </label>
              <input
                id="hotelName"
                type="text"
                required
                value={hotelName}
                onChange={(e) => handleHotelNameChange(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Hotel Parador de A Coruña"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="timezone" className="block text-sm text-text-secondary">
                  Zona horaria
                </label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="Europe/Madrid">Europa/Madrid</option>
                  <option value="Europe/London">Europa/London</option>
                  <option value="Europe/Paris">Europa/Paris</option>
                  <option value="Atlantic/Canary">Canarias</option>
                  <option value="America/Mexico_City">México</option>
                  <option value="America/Bogota">Colombia</option>
                  <option value="America/Argentina/Buenos_Aires">Argentina</option>
                </select>
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm text-text-secondary">
                  Moneda
                </label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-bg-input px-3 py-2 text-text-primary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="MXN">MXN ($)</option>
                  <option value="COP">COP ($)</option>
                  <option value="ARS">ARS ($)</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-danger" role="alert">{error}</p>
            )}

            <button
              onClick={handleCreateHotel}
              disabled={loading || !tenantName.trim() || !hotelName.trim()}
              className="w-full rounded-md bg-accent px-4 py-2 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Siguiente →'}
            </button>
          </div>
        )}

        {/* Step 2: Catálogo */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Tu catálogo
            </h2>
            <p className="text-sm text-text-secondary">
              Puedes importar tus productos desde Excel o empezar con un catálogo
              base con las categorías más comunes.
            </p>

            <div className="space-y-2">
              <button
                disabled
                className="w-full rounded-md border border-border bg-bg-input px-4 py-3 text-left text-sm text-text-muted"
              >
                Importar desde Excel (próximamente)
              </button>
              <button
                onClick={handleSkipCatalog}
                className="w-full rounded-md border border-accent bg-accent/10 px-4 py-3 text-left text-sm text-text-primary hover:bg-accent/20"
              >
                Empezar con catálogo base (12 categorías)
              </button>
            </div>

            <button
              onClick={handleSkipCatalog}
              className="w-full text-sm text-text-muted hover:text-text-secondary"
            >
              Saltar por ahora →
            </button>
          </div>
        )}

        {/* Step 3: Primer evento */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Primer evento
            </h2>
            <p className="text-sm text-text-secondary">
              Crea un evento de ejemplo para ver cómo funciona ChefOS, o empieza
              directamente con el dashboard.
            </p>

            <div className="rounded-lg border border-border bg-bg-input p-4">
              <p className="text-sm text-text-muted">
                La creación de eventos estará disponible en el módulo Comercial.
                Por ahora, ve al dashboard para explorar.
              </p>
            </div>

            <button
              onClick={handleFinish}
              className="w-full rounded-md bg-accent px-4 py-2 font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Ir al dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
