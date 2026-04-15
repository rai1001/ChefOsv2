// ============================================================================
// Contrato base para todos los adaptadores PMS/POS
// Las implementaciones concretas se usan en el Edge Function (automation-worker).
// El frontend solo conoce los tipos — no llama nunca directamente a los adaptadores.
// ============================================================================

export interface OccupancyData {
  date:              string          // ISO date YYYY-MM-DD
  rooms_occupied:    number
  rooms_total:       number
  occupancy_pct:     number
  guests_in_house:   number
  arrivals_today:    number
  departures_today:  number
}

export interface ReservationData {
  pms_id:         string
  guest_name:     string
  guest_email?:   string
  check_in:       string            // ISO date
  check_out:      string            // ISO date
  adults:         number
  children:       number
  room_type:      string
  status:         'confirmed' | 'cancelled' | 'checked_in' | 'checked_out' | 'no_show'
  notes?:         string
  dietary_notes?: string
}

export interface SalesData {
  date:            string            // ISO date
  pos_ticket_id:   string
  table_ref?:      string
  covers:          number
  items:           SalesItem[]
  total_revenue:   number
  currency:        string
}

export interface SalesItem {
  pos_item_id:  string
  name:         string
  category?:    string
  quantity:     number
  unit_price:   number
  total_price:  number
}

export interface ConnectionTestResult {
  success:      boolean
  latency_ms?:  number
  message:      string
  server_info?: Record<string, unknown>
}

// Contrato que todo adaptador PMS debe implementar
export interface PmsAdapter {
  /** Prueba la conexión con las credenciales dadas */
  testConnection(credentials: Record<string, string>): Promise<ConnectionTestResult>
  /** Obtiene ocupación para una fecha */
  fetchOccupancy(credentials: Record<string, string>, date: string): Promise<OccupancyData>
  /** Obtiene reservas en un rango de fechas */
  fetchReservations(
    credentials: Record<string, string>,
    from: string,
    to: string
  ): Promise<ReservationData[]>
}

// Contrato que todo adaptador POS debe implementar
export interface PosAdapter {
  testConnection(credentials: Record<string, string>): Promise<ConnectionTestResult>
  /** Obtiene ventas del día */
  fetchSales(credentials: Record<string, string>, date: string): Promise<SalesData[]>
  /** Empuja comandas de cocina al POS (devuelve IDs creados) */
  pushKitchenOrders(
    credentials: Record<string, string>,
    orders: { table_ref: string; items: { name: string; quantity: number }[] }[]
  ): Promise<{ success: boolean; pushed_count: number }>
}
