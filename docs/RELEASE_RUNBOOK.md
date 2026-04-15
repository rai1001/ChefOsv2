# Release Runbook

## Pre-release checks
1. `npm run lint && npm run typecheck && npm run build` — 0 errores
2. Smoke browser (login + dashboard + ruta tocada)
3. Verificar migraciones SQL aplicadas: `ls supabase/migrations/` vs estado de BD

## Env vars requeridas
**Next.js (Vercel):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo server-side / API routes)

**Edge Functions (Supabase Dashboard → Secrets):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (para `notification-dispatcher`)
- `APP_BASE_URL` (añadido post-Codex 2026-04-15) — URL pública de producción, usada para prefijo en enlaces internos de email

## Database Webhooks (Dashboard → Database → Webhooks)
- `notifications` INSERT → `notification-dispatcher`
  - Headers: `Authorization: Bearer <SERVICE_ROLE_KEY>` (obligatorio — la edge function rechaza con 401 si falta)

## Deploy pipeline
1. Aplicar migraciones pendientes:
   ```
   cat supabase/migrations/000XX_*.sql | npx supabase db query --linked
   ```
2. Redeploy edge functions tocadas:
   ```
   npx supabase functions deploy <function-name> --linked
   ```
3. Deploy Next.js en Vercel (auto-push o manual)

## Smoke test post-deploy
- Login con cuenta de prueba
- Dashboard carga con KPIs
- Crear evento, generar BEO PDF (valida wrapper dynamic)
- Crear pedido (PR → PO → GR)
- Recepción actualiza inventario (FIFO)
- Escandallo live — actualizado hace Ns cuenta correctamente (valida React 19 purity)
- Triggers de agentes (al confirmar evento, aparece sugerencia)
- Notificación email — llega con enlace interno válido

## Rollback
- Migración SQL: DROP de los objetos creados + recrear los anteriores desde git show
- Edge function: `npx supabase functions deploy <name> --linked` desde commit previo
- Vercel: Rollback desde panel

## Post-incidente
- Si hay leak de secretos sospechoso: rotar credenciales de integraciones PMS/POS en sus consolas externas + `update_pms_integration` / `update_pos_integration` con los nuevos tokens
- Revisar `integration_sync_logs` buscando `sync_type` inusual o fuera de la whitelist 00029
