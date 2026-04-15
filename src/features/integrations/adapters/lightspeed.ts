// ============================================================================
// Adaptador Lightspeed POS — ChefOS v2
// API: Lightspeed Restaurant API v3 (OAuth 2.0)
// Docs: https://developers.lightspeedhq.com/restaurant/
//
// NOTA: Solo usado desde el Edge Function / automation-worker (Deno).
// ============================================================================

import type { PosAdapter, SalesData, SalesItem, ConnectionTestResult } from './base'

interface LightspeedCredentials {
  client_id:     string
  client_secret: string
  account_id:    string
}

// En producción el token vendría de un OAuth flow almacenado en config.
// Aquí simplificamos: el access_token se pasa como client_secret en el wizard.
// El usuario hace el OAuth flow fuera de ChefOS y pega el token.

export const lightspeedAdapter: PosAdapter = {
  async testConnection(credentials): Promise<ConnectionTestResult> {
    const creds = credentials as unknown as LightspeedCredentials
    const t0 = Date.now()

    try {
      const res = await fetch(
        `https://api.lightspeedapp.com/API/V3/Account/${creds.account_id}/Business.json`,
        {
          headers: {
            Authorization: `Bearer ${creds.client_secret}`,
            'Content-Type': 'application/json',
          },
        }
      )
      const latency = Date.now() - t0
      if (!res.ok) {
        const text = await res.text()
        return { success: false, latency_ms: latency, message: `HTTP ${res.status}: ${text}` }
      }
      interface LsBusiness { Business?: { name?: string } }
      const data = await res.json() as LsBusiness
      return {
        success: true,
        latency_ms: latency,
        message: 'Conexión Lightspeed correcta',
        server_info: { business: data.Business?.name ?? 'OK' },
      }
    } catch (err) {
      return {
        success: false,
        message: `Error de red: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  },

  async fetchSales(credentials, date): Promise<SalesData[]> {
    const creds = credentials as unknown as LightspeedCredentials

    const startTs = encodeURIComponent(`${date}T00:00:00+00:00`)
    const endTs   = encodeURIComponent(`${date}T23:59:59+00:00`)
    const res = await fetch(
      `https://api.lightspeedapp.com/API/V3/Account/${creds.account_id}/Sale.json?timeStamp=%3E%3D,${startTs}&timeStamp=%3C%3D,${endTs}`,
      {
        headers: { Authorization: `Bearer ${creds.client_secret}` },
      }
    )
    if (!res.ok) throw new Error(`Lightspeed fetchSales HTTP ${res.status}`)

    interface LsSaleItem {
      itemID?: string; name?: string; categoryID?: string
      unitQuantity?: string; unitPrice?: string; calcTotal?: string
    }
    interface LsSale {
      saleID?: string; referenceNumber?: string; calcTax1?: string
      calcTotal?: string; SaleLines?: { SaleLine?: LsSaleItem | LsSaleItem[] }
    }
    interface LsResponse { Sale?: LsSale | LsSale[] }
    const data = await res.json() as LsResponse
    const rawSales = data.Sale
    if (!rawSales) return []
    const sales = Array.isArray(rawSales) ? rawSales : [rawSales]

    return sales.map((s) => {
      const rawLines = s.SaleLines?.SaleLine
      const lines = rawLines
        ? (Array.isArray(rawLines) ? rawLines : [rawLines])
        : []

      const items: SalesItem[] = lines.map((l) => ({
        pos_item_id: l.itemID ?? '',
        name:        l.name   ?? '',
        category:    l.categoryID,
        quantity:    parseFloat(l.unitQuantity ?? '1'),
        unit_price:  parseFloat(l.unitPrice    ?? '0'),
        total_price: parseFloat(l.calcTotal    ?? '0'),
      }))

      return {
        date,
        pos_ticket_id:  s.saleID ?? '',
        table_ref:      s.referenceNumber,
        covers:         1,
        items,
        total_revenue:  parseFloat(s.calcTotal ?? '0'),
        currency:       'EUR',
      } satisfies SalesData
    })
  },

  async pushKitchenOrders(credentials, orders): Promise<{ success: boolean; pushed_count: number }> {
    // Lightspeed no tiene endpoint directo para KDS push en V3.
    // Se puede usar su Kitchen Display API si está habilitada.
    // Por ahora, stub que devuelve éxito.
    console.warn('[lightspeed] pushKitchenOrders no implementado — requiere Kitchen Display API')
    return { success: true, pushed_count: 0 }
  },
}
