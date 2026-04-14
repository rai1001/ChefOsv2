
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
