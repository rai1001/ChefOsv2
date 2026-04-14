
# Release Runbook

1) `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm e2e`
2) `pnpm build`
3) Verificar env vars:
   - Supabase URL
   - Supabase anon key
   - Service role key (solo en server/edge)
4) Deploy a Vercel
5) Smoke test:
   - login
   - dashboard carga
   - crear evento
   - crear pedido
   - recepción actualiza inventario
