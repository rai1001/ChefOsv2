
# GUARDRAILS (Reglas duras)

## Multi-tenant obligatorio
- Toda tabla de negocio incluye `hotel_id uuid not null`
- Toda query filtra por `hotel_id`
- RLS impide lecturas/escrituras cruzadas

## Roles (mínimos)
- admin: todo dentro del hotel
- manager: gestión operativa (eventos, producción, dashboard)
- purchasing: compras/pedidos
- warehouse: recepción/inventario
- kitchen: producción/mermas (sin aprobar compras)

## Seguridad
- RLS en todas las tablas sensibles
- Storage por hotel_id en la ruta
- Edge Functions para operaciones privilegiadas (PDF, automatizaciones programadas)

## Arquitectura
- Domain: sin dependencias de infra
- Application: casos de uso, transacciones lógicas, publicación de eventos internos
- Adapters: supabase repos + storage + edge
- UI: React/Next, sin lógica de negocio

## Prohibido
- Acceso directo a Supabase desde componentes de UI (usar application/adapters)
- Añadir librerías UI nuevas sin ADR en docs/DECISIONS.md
- Saltarse tests/coverage
