// ============================================================================
// Re-exporta todos los adaptadores.
// Solo se importa desde supabase/functions/ (Deno runtime).
// NO importar desde el frontend Next.js.
// ============================================================================

export { mewsAdapter }        from './mews'
export { operaCloudAdapter }   from './opera-cloud'
export { lightspeedAdapter }   from './lightspeed'
export { simphonyAdapter }     from './simphony'
export type { PmsAdapter, PosAdapter, OccupancyData, ReservationData, SalesData, SalesItem, ConnectionTestResult } from './base'
