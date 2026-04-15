// ============================================================================
// Adaptador Mews PMS — ChefOS v2
// API: Mews Connector API v1 (REST)
// Docs: https://mews-systems.gitbook.io/connector-api/
//
// NOTA: Este adaptador se usa SOLO en la Edge Function (automation-worker).
// No se importa desde el frontend. Usa fetch nativo de Deno.
// ============================================================================

import type { PmsAdapter, OccupancyData, ReservationData, ConnectionTestResult } from './base'

const MEWS_DEMO_URL       = 'https://api.mews-demo.com'
const MEWS_PRODUCTION_URL = 'https://api.mews.com'

interface MewsCredentials {
  api_token:   string
  property_id: string
  environment: 'demo' | 'production'
}

function getBaseUrl(env: string): string {
  return env === 'production' ? MEWS_PRODUCTION_URL : MEWS_DEMO_URL
}

export const mewsAdapter: PmsAdapter = {
  async testConnection(credentials): Promise<ConnectionTestResult> {
    const creds = credentials as unknown as MewsCredentials
    const baseUrl = getBaseUrl(creds.environment)
    const t0 = Date.now()

    try {
      const res = await fetch(`${baseUrl}/api/connector/v1/enterprises/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ClientToken: creds.api_token, AccessToken: creds.api_token }),
      })
      const latency = Date.now() - t0
      if (!res.ok) {
        const text = await res.text()
        return { success: false, latency_ms: latency, message: `HTTP ${res.status}: ${text}` }
      }
      const data = await res.json() as Record<string, unknown>
      return {
        success: true,
        latency_ms: latency,
        message: 'Conexión correcta con Mews',
        server_info: { enterprise: (data as { Enterprise?: { Name?: string } }).Enterprise?.Name ?? 'OK' },
      }
    } catch (err) {
      return { success: false, message: `Error de red: ${err instanceof Error ? err.message : String(err)}` }
    }
  },

  async fetchOccupancy(credentials, date): Promise<OccupancyData> {
    const creds = credentials as unknown as MewsCredentials
    const baseUrl = getBaseUrl(creds.environment)

    const startDate = `${date}T00:00:00Z`
    const endDate   = `${date}T23:59:59Z`

    const res = await fetch(`${baseUrl}/api/connector/v1/reservations/getAll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ClientToken:   creds.api_token,
        AccessToken:   creds.api_token,
        EnterpriseIds: [creds.property_id],
        StartUtc:      startDate,
        EndUtc:        endDate,
        States:        ['Started', 'Confirmed'],
      }),
    })

    if (!res.ok) throw new Error(`Mews fetchOccupancy HTTP ${res.status}`)

    interface MewsRes { Reservations?: { PersonCounts?: { AgeCategoryCode: string; Count: number }[]; State?: string }[] }
    const data = await res.json() as MewsRes
    const reservations = data.Reservations ?? []

    const inHouse  = reservations.filter((r) => r.State === 'Started').length
    const arrivals  = reservations.filter((r) => r.State === 'Confirmed').length

    const guests = reservations.reduce((acc, r) => {
      const counts = r.PersonCounts ?? []
      return acc + counts.reduce((s, c) => s + c.Count, 0)
    }, 0)

    return {
      date,
      rooms_occupied:   inHouse,
      rooms_total:      0,       // requiere llamada adicional a spaces/getAll
      occupancy_pct:    0,
      guests_in_house:  guests,
      arrivals_today:   arrivals,
      departures_today: 0,
    }
  },

  async fetchReservations(credentials, from, to): Promise<ReservationData[]> {
    const creds = credentials as unknown as MewsCredentials
    const baseUrl = getBaseUrl(creds.environment)

    const res = await fetch(`${baseUrl}/api/connector/v1/reservations/getAll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ClientToken:   creds.api_token,
        AccessToken:   creds.api_token,
        EnterpriseIds: [creds.property_id],
        StartUtc:      `${from}T00:00:00Z`,
        EndUtc:        `${to}T23:59:59Z`,
        States:        ['Confirmed', 'Started'],
      }),
    })

    if (!res.ok) throw new Error(`Mews fetchReservations HTTP ${res.status}`)

    interface MewsReservation {
      Id?: string
      Customer?: { FirstName?: string; LastName?: string; Email?: string }
      StartUtc?: string
      EndUtc?: string
      PersonCounts?: { AgeCategoryCode: string; Count: number }[]
      State?: string
      Notes?: string
    }
    interface MewsReservationsResponse { Reservations?: MewsReservation[] }
    const data = await res.json() as MewsReservationsResponse
    const reservations = data.Reservations ?? []

    return reservations.map((r) => {
      const adults = r.PersonCounts?.find((p) => p.AgeCategoryCode === 'Adult')?.Count ?? 1
      const children = r.PersonCounts?.find((p) => p.AgeCategoryCode === 'Child')?.Count ?? 0
      const name = [r.Customer?.FirstName, r.Customer?.LastName].filter(Boolean).join(' ') || 'Unknown'
      const checkIn  = r.StartUtc ? r.StartUtc.slice(0, 10) : from
      const checkOut = r.EndUtc   ? r.EndUtc.slice(0, 10)   : to
      const stateMap: Record<string, ReservationData['status']> = {
        Confirmed: 'confirmed', Started: 'checked_in', Processed: 'checked_out',
        Canceled: 'cancelled', NoShow: 'no_show',
      }
      return {
        pms_id:      r.Id ?? '',
        guest_name:  name,
        guest_email: r.Customer?.Email,
        check_in:    checkIn,
        check_out:   checkOut,
        adults,
        children,
        room_type:   '',
        status:      stateMap[r.State ?? ''] ?? 'confirmed',
        notes:       r.Notes,
      } satisfies ReservationData
    })
  },
}
