// ============================================================================
// Adaptador OPERA Cloud PMS — ChefOS v2
// API: Oracle Hospitality OPERA Cloud REST API v21.5+
// Docs: https://docs.oracle.com/en/industries/hospitality/integration-platform/
//
// NOTA: Solo usado desde el Edge Function / automation-worker (Deno).
// ============================================================================

import type { PmsAdapter, OccupancyData, ReservationData, ConnectionTestResult } from './base'

interface OperaCredentials {
  client_id:     string
  client_secret: string
  tenant_name:   string
  server_url:    string
}

interface OperaTokenResponse {
  access_token: string
  expires_in:   number
}

async function getAccessToken(creds: OperaCredentials): Promise<string> {
  const url = `${creds.server_url}/oauth/v1/token`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-app-key':    creds.client_id,
    },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     creds.client_id,
      client_secret: creds.client_secret,
    }),
  })
  if (!res.ok) throw new Error(`OPERA token HTTP ${res.status}`)
  const data = await res.json() as OperaTokenResponse
  return data.access_token
}

export const operaCloudAdapter: PmsAdapter = {
  async testConnection(credentials): Promise<ConnectionTestResult> {
    const creds = credentials as unknown as OperaCredentials
    const t0 = Date.now()
    try {
      const token = await getAccessToken(creds)
      const latency = Date.now() - t0
      return {
        success: true,
        latency_ms: latency,
        message: 'Autenticación OPERA Cloud correcta',
        server_info: { token_type: 'Bearer', obtained: true, tenant: creds.tenant_name },
      }
    } catch (err) {
      return {
        success: false,
        message: `Error de autenticación: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  },

  async fetchOccupancy(credentials, date): Promise<OccupancyData> {
    const creds = credentials as unknown as OperaCredentials
    const token = await getAccessToken(creds)

    const res = await fetch(
      `${creds.server_url}/hsk/v1/housekeepingRooms?date=${date}`,
      {
        headers: {
          Authorization:     `Bearer ${token}`,
          'x-app-key':       creds.client_id,
          'x-hotelid':       creds.tenant_name,
          'Content-Type':    'application/json',
        },
      }
    )

    if (!res.ok) throw new Error(`OPERA fetchOccupancy HTTP ${res.status}`)

    interface HskRoom { roomStatus?: string }
    interface HskResponse { housekeepingRooms?: HskRoom[] }
    const data = await res.json() as HskResponse
    const rooms = data.housekeepingRooms ?? []

    const occupied = rooms.filter((r) =>
      ['OC', 'OD', 'OI'].includes(r.roomStatus ?? '')
    ).length

    return {
      date,
      rooms_occupied:   occupied,
      rooms_total:      rooms.length,
      occupancy_pct:    rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0,
      guests_in_house:  occupied,   // approximation; guests = occupied rooms
      arrivals_today:   0,
      departures_today: 0,
    }
  },

  async fetchReservations(credentials, from, to): Promise<ReservationData[]> {
    const creds = credentials as unknown as OperaCredentials
    const token = await getAccessToken(creds)

    const res = await fetch(
      `${creds.server_url}/rsv/v1/reservations?arrivalDate=${from}&departureDate=${to}&limit=200`,
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          'x-app-key':    creds.client_id,
          'x-hotelid':    creds.tenant_name,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!res.ok) throw new Error(`OPERA fetchReservations HTTP ${res.status}`)

    interface OperaReservation {
      reservationIdList?: { id?: string }[]
      guestList?: { profileInfo?: { profile?: { customer?: { personName?: { givenName?: string; surname?: string } }; emails?: { emailInfo?: { email?: string } }[] } } }[]
      timeSpan?: { startDate?: string; endDate?: string }
      adults?: number
      children?: number
      roomType?: { roomTypeCode?: string }
      reservationStatus?: string
      comments?: { text?: string }
    }
    interface OperaResponse { reservations?: OperaReservation[] }
    const data = await res.json() as OperaResponse
    const reservations = data.reservations ?? []

    return reservations.map((r) => {
      const profile = r.guestList?.[0]?.profileInfo?.profile
      const name = [
        profile?.customer?.personName?.givenName,
        profile?.customer?.personName?.surname,
      ].filter(Boolean).join(' ') || 'Unknown'

      const stateMap: Record<string, ReservationData['status']> = {
        Reserved: 'confirmed', CheckedIn: 'checked_in', CheckedOut: 'checked_out',
        Cancelled: 'cancelled', NoShow: 'no_show',
      }

      return {
        pms_id:      r.reservationIdList?.[0]?.id ?? '',
        guest_name:  name,
        guest_email: profile?.emails?.[0]?.emailInfo?.email,
        check_in:    r.timeSpan?.startDate?.slice(0, 10) ?? from,
        check_out:   r.timeSpan?.endDate?.slice(0, 10)   ?? to,
        adults:      r.adults   ?? 1,
        children:    r.children ?? 0,
        room_type:   r.roomType?.roomTypeCode ?? '',
        status:      stateMap[r.reservationStatus ?? ''] ?? 'confirmed',
        notes:       r.comments?.text,
      } satisfies ReservationData
    })
  },
}
