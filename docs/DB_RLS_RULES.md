# DB_RLS_RULES
Reglas Supabase + RLS

## Helpers canónicos
- `is_member_of(hotel_id)` — `boolean`. Úsalo para SELECT de metadata (columnas no sensibles).
- `get_member_role(hotel_id)` — devuelve `app_role` o `null`. Úsalo para WRITE policies y para SELECT de columnas sensibles.
- `check_membership(user_id, hotel_id, required_roles[])` — lanza excepción si el rol no está en la lista. Úsalo al inicio de cada RPC `SECURITY DEFINER`.

## Regla de oro para tablas con secretos
Toda tabla que almacene **credentials, tokens, API keys, passwords o payloads operativos con datos de terceros** NO puede tener `SELECT USING (is_member_of(hotel_id))`. Un miembro con la anon key de Supabase puede hacer `from('tabla').select('columna_sensible')` vía PostgREST y saltarse cualquier RPC saneada.

Solución:
1. `SELECT USING (get_member_role(hotel_id) in ('superadmin','direction','admin'))` — solo admins pueden leer la fila entera.
2. Miembros operativos leen metadata vía RPC `SECURITY DEFINER` que proyecta SOLO columnas no sensibles.
3. El frontend SIEMPRE usa la RPC, nunca `.from(tabla).select(...)`.

**Tablas con secretos identificadas (2026-04-15):**
- `pms_integrations.credentials` — fix en `00028_security_hardening.sql`
- `pos_integrations.credentials` — fix en `00028_security_hardening.sql`
- `integration_sync_logs.response_payload`/`error_message` — acceso solo por RPC `get_integration_sync_logs` con role check en `00028`

## SECURITY DEFINER checklist
Toda función `SECURITY DEFINER` debe:
1. Tener `SET search_path = public` (mitigation hijacking). Si heredaste una sin él, aplicar `ALTER FUNCTION ... SET search_path = public`.
2. Llamar `check_membership(auth.uid(), p_hotel_id, [roles])` como PRIMERA línea del cuerpo. Nunca confiar en el caller.
3. Validar inputs que lleguen como `text` contra una whitelist (patrón `00029` para `sync_type`).
4. Si es service-only (worker la invoca, no el usuario): `REVOKE EXECUTE ... FROM public, anon, authenticated` + `GRANT EXECUTE ... TO service_role`.

## Edge Functions con `SUPABASE_SERVICE_ROLE_KEY`
Antes de crear cliente `createClient(url, serviceRoleKey)`:
```typescript
const authHeader = req.headers.get('Authorization')
const expectedToken = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''}`
if (!authHeader || authHeader !== expectedToken) {
  return new Response('Unauthorized', { status: 401 })
}
```
Si la función procesa un webhook con payload del cliente, NO confiar en el contenido del payload para operaciones sensibles. Leer la fuente de verdad desde DB usando solo el `id` del payload (patrón `notification-dispatcher` post-0ed3c16).

## Patrones por tipo de policy

### Tabla tenant-local, todos los miembros leen
```sql
create policy "tabla_select" on public.tabla
  for select using (public.is_member_of(hotel_id));
```

### Tabla con datos sensibles (credentials, payloads, etc.)
```sql
create policy "tabla_select_admin" on public.tabla
  for select using (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin')
  );
```

### Writes siempre por rol (no solo membership)
```sql
create policy "tabla_insert" on public.tabla
  for insert with check (
    public.get_member_role(hotel_id) in ('superadmin','direction','admin')
  );
```

### Solo insertable/updateable vía SECURITY DEFINER RPCs
```sql
create policy "tabla_insert_rpc_only" on public.tabla
  for insert with check (false);
create policy "tabla_update_rpc_only" on public.tabla
  for update using (false);
```
Patrón usado en `integration_sync_logs` (commit 00026_m12_security_fixes).

## Referencias
- `00001_d0_identity.sql:124` — definición de `check_membership`
- `00024_security_fixes.sql` — patrón `REVOKE/GRANT` worker RPCs
- `00028_security_hardening.sql` — Codex audit round 1 (credentials + sync role check + search_path M15)
- `00029_sync_type_and_config_validation.sql` — Codex audit round 2 (whitelist sync_type + config activa)
