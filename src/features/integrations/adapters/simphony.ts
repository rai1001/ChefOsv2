// ============================================================================
// Adaptador Oracle Simphony POS — ChefOS v2
// API: Simphony Cloud REST API (Transaction Services)
// Docs: https://docs.oracle.com/en/industries/food-beverage/simphony/
//
// NOTA: Solo usado desde el Edge Function / automation-worker (Deno).
// ============================================================================

import type { PosAdapter, SalesData, SalesItem, ConnectionTestResult } from './base'

interface SimphonyCredentials {
  server_url:  string
  employee_id: string
  password:    string
  rvc_ref:     string   // Revenue Center reference number
}

interface SimphonyAuthToken {
  access_token: string
}

async function getSimphonyToken(creds: SimphonyCredentials): Promise<string> {
  const res = await fetch(`${creds.server_url}/api/1/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: creds.employee_id, password: creds.password }),
  })
  if (!res.ok) throw new Error(`Simphony auth HTTP ${res.status}`)
  const data = await res.json() as SimphonyAuthToken
  return data.access_token
}

export const simphonyAdapter: PosAdapter = {
  async testConnection(credentials): Promise<ConnectionTestResult> {
    const creds = credentials as unknown as SimphonyCredentials
    const t0 = Date.now()
    try {
      const token = await getSimphonyToken(creds)
      const latency = Date.now() - t0
      return {
        success: !!token,
        latency_ms: latency,
        message: 'Autenticación Simphony correcta',
        server_info: { rvc_ref: creds.rvc_ref },
      }
    } catch (err) {
      return {
        success: false,
        message: `Error de autenticación: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  },

  async fetchSales(credentials, date): Promise<SalesData[]> {
    const creds = credentials as unknown as SimphonyCredentials
    const token = await getSimphonyToken(creds)

    const res = await fetch(
      `${creds.server_url}/api/1/transactions?businessDate=${date}&rvcRef=${creds.rvc_ref}`,
      {
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
    if (!res.ok) throw new Error(`Simphony fetchSales HTTP ${res.status}`)

    interface SimphonyItem {
      menuItemDefinitionId?: number
      menuItemName?: string
      menuItemMajorGroup?: string
      quantity?: number
      price?: number
      totalAmount?: number
    }
    interface SimphonyCheck {
      checkNumber?: number
      tableRef?: string
      guestCount?: number
      checkItems?: SimphonyItem[]
      totalDue?: number
      currencyCode?: string
    }
    interface SimphonyResponse { checks?: SimphonyCheck[] }
    const data = await res.json() as SimphonyResponse
    const checks = data.checks ?? []

    return checks.map((c) => {
      const items: SalesItem[] = (c.checkItems ?? []).map((i) => ({
        pos_item_id: String(i.menuItemDefinitionId ?? ''),
        name:        i.menuItemName ?? '',
        category:    i.menuItemMajorGroup,
        quantity:    i.quantity   ?? 1,
        unit_price:  i.price      ?? 0,
        total_price: i.totalAmount ?? 0,
      }))

      return {
        date,
        pos_ticket_id: String(c.checkNumber ?? ''),
        table_ref:     c.tableRef,
        covers:        c.guestCount ?? 1,
        items,
        total_revenue: c.totalDue ?? 0,
        currency:      c.currencyCode ?? 'EUR',
      } satisfies SalesData
    })
  },

  async pushKitchenOrders(credentials, orders): Promise<{ success: boolean; pushed_count: number }> {
    const creds = credentials as unknown as SimphonyCredentials
    const token = await getSimphonyToken(creds)

    let pushed = 0
    for (const order of orders) {
      const res = await fetch(`${creds.server_url}/api/1/transactions/order`, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rvcRef:    creds.rvc_ref,
          tableRef:  order.table_ref,
          menuItems: order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
        }),
      })
      if (res.ok) pushed++
    }

    return { success: pushed === orders.length, pushed_count: pushed }
  },
}
