
# Arquitectura (Clean + Hexagonal + Turborepo)

## Estructura monorepo
- apps/web (Next.js App Router)
- packages/contracts (DTOs + Events + Zod)
- packages/domain (entidades/reglas)
- packages/application (casos de uso)
- packages/adapters (Supabase repos, Storage, Edge Functions)
- packages/ui (componentes base + Stitch wrappers)

## Dependencias permitidas
- ui -> application -> domain
- adapters -> application
- contracts -> (ui, application, adapters)
- domain NO depende de nada externo

## Eventos internos
- Definidos en packages/contracts/events
- Los casos de uso emiten eventos (ej: event.confirmed)
- Adapters reaccionan (persisten audit, notifican, etc.)

## Principios de entrega
- Contracts-first
- DB-first (migraciones y RLS antes de UI)
- Use-cases antes que pantallas
