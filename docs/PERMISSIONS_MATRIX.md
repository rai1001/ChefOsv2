
# Matriz de permisos (MVP)

Acciones | admin | manager | purchasing | warehouse | kitchen
---|---|---|---|---|---
Ver dashboard | ✅ | ✅ | ✅ | ✅ | ✅
CRUD eventos | ✅ | ✅ | ⚠️ ver | ⚠️ ver | ⚠️ ver
Confirmar/cerrar evento | ✅ | ✅ | ❌ | ❌ | ❌
CRUD producción | ✅ | ✅ | ❌ | ⚠️ ver | ✅
Marcar producción done | ✅ | ✅ | ❌ | ❌ | ✅
CRUD productos | ✅ | ✅ | ✅ | ✅ | ⚠️ ver
CRUD proveedores | ✅ | ✅ | ✅ | ❌ | ❌
Crear pedido | ✅ | ✅ | ✅ | ❌ | ❌
Aprobar pedido | ✅ | ✅ | ✅ | ❌ | ❌
Recibir pedido | ✅ | ✅ | ❌ | ✅ | ❌
Ajuste inventario | ✅ | ✅ | ❌ | ✅ | ❌
Registrar merma | ✅ | ✅ | ❌ | ✅ | ✅
Ver alertas | ✅ | ✅ | ✅ | ✅ | ✅
Gestionar automatizaciones | ✅ | ✅ | ✅ | ❌ | ❌
Administrar roles | ✅ | ❌ | ❌ | ❌ | ❌

Notas:
- “⚠️ ver” = solo lectura (sin modificar).
- Aplicar tanto en UI (guard) como en RLS/policies.
- **Tabla pendiente de actualizar** al modelo `app_role` real (`superadmin/direction/admin/head_chef/sous_chef/operations/...`). Ver sección siguiente para integraciones (actualizada tras Codex audit 2026-04-15).

## Integraciones PMS/POS (post-Codex 00028+00029)

Operación | superadmin | direction | admin | otros
---|---|---|---|---
Listar integraciones (sin credentials) vía `get_pms/pos_integrations` | ✅ | ✅ | ✅ | ✅ (todos los miembros)
Leer credentials directamente (tabla raw) | ✅ | ✅ | ✅ | ❌
Crear/actualizar/deshabilitar integración | ✅ | ✅ | ✅ | ❌
Borrar integración | ✅ | ✅ | ❌ | ❌
`trigger_pms_sync` (test_connection / sync_occupancy / sync_reservations) | ✅ | ✅ | ✅ | ❌
`trigger_pos_sync` (test_connection / sync_sales) | ✅ | ✅ | ✅ | ❌
`trigger_pos_sync` (push_kitchen_orders — escritura en POS externo) | ✅ | ✅ | ❌ | ❌
`get_integration_sync_logs` (response_payload + error_message) | ✅ | ✅ | ✅ | ❌

Controles adicionales (00029):
- El `sync_type` debe estar en whitelist (errcode P0003 si no)
- `config.<sync_type>` debe ser `true` en la integración antes de poder encolar (defense in depth — no depender solo de la UI)

## Agentes M15 (post-Codex 00028)

Operación | service_role | authenticated
---|---|---
`run_*_agent` (10 funciones service-only) | ✅ | ❌ (REVOKE EXECUTE)
`_create_agent_suggestion` (helper interno) | ✅ | ❌
`run_all_automejora_agents` (utility worker-only) | ✅ | ❌
`get_agent_suggestions` / `approve_suggestion` / `reject_suggestion` | — | ✅ (todos los miembros, con `check_membership`)
`get_agent_configs` / `upsert_agent_config` | — | ✅ (todos los miembros; gating UI-only hasta tener role check)
