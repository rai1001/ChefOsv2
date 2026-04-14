# ChefOS – Roadmap y Pendientes para completar el producto

## Estado actual (resumen)
- Backend: esquema base en Supabase (eventos, compras, inventario, productos, proveedores, preparaciones, mermas, alertas); RLS activo. Migraciones 0006–0010 aplicadas manualmente.
- Frontend: listado de módulos visible; detalle de evento con menú/tareas/compras en progreso; faltan inputs y flujos automáticos completos.
- CI: pipelines de lint/typecheck/test operativos; db-push con fallback manual por DNS/IPv6.

## Pendientes funcionales por módulo
### Eventos
- UI de detalle: inputs visibles para menú (producto, unidad, cantidad por comensal), selector filtrado por hotel, botón claro para generar producción/compras.
- Import menú por OCR/PDF (placeholder + endpoint) y reconciliación manual.
- Tabs de producción/compras con trazabilidad a evento y menú; estado de abastecimiento (stock OK/faltante).
- Salas/evento_sala: exponer en UI y confirmar esquema/documentación.

### Producción
- Subtareas/mise en place: UI para creación/edición, estados (pendiente/en proceso/hecho), responsables/turno.
- Generación automática desde menú (recetas o productos) con escalado por pax.
- Vista “mis tareas” móvil simplificada.

### Compras
- Generación automática de pedidos desde faltantes (menú → productos → stock → pedidos).
- Import/export Excel/CSV consolidado y control de recepción parcial.
- Mostrar evento asociado en pedidos y reflejar estados.

### Inventario
- Chequeo de stock al confirmar evento/menú y mostrar faltantes.
- Movimientos vinculados a producción (consumo) y compras (entrada).

### Productos / Proveedores
- Autoselección de producto al crear plato si existe match por nombre/categoría.
- Historial de precios y proveedor preferido (backlog).

### Personal / Horarios
- Crear y gestionar turnos/horarios por hotel.
- Asignar personal a turnos y ligarlo a tareas de producción (vista “mis tareas”).
- Invitaciones a empleados enlazadas con el turno/rol.

### Dashboard
- Completar panel con KPIs clave (eventos por estado, compras/recepciones, producción en curso, inventario crítico, alertas).
- Widgets filtrados por hotel y rango de fechas; solo lectura.

### Alertas / Automatizaciones
- Reglas de abastecimiento (faltantes, caducidades, incidencias de pedidos).
- Edge function de OCR (menú) y automatizaciones básicas (crear tareas/pedidos).

### Auth / Hoteles / Invitaciones (crítico SaaS)
- Alta self-service: al crear cuenta, permitir crear su primer hotel y asignarse como admin/owner.
- Multi-hotel: admin puede crear hoteles adicionales y elegir hotel activo.
- Invitaciones: desde un admin, enviar invitación (email/link firmado) con rol y hotel; al aceptar, crear perfil en `profiles` y asociar hotel/rol.
- Gestión de empleados: lista de usuarios por hotel, cambio de rol y revocar invitación.

### Documentación
- Actualizar BACKEND_ESQUEMA_FLUJO_DATOS con salas/evento_sala y flujo evento→menú→producción→compras→inventario.
- Actualizar BACKEND_EVENTOS_CONTRATOS con DTO actuales (evento, menú con product_id/qty_per_guest/unit, tareas de producción).
- Añadir guía rápida de despliegue DB (SQL editor) por problemas de IPv6.

## Riesgos técnicos
- DNS/IPv6 para supabase db push: resolver con runner IPv6 o aplicar SQL manual.
- Codificación/acentos rotos en varios MD: revisar y normalizar UTF-8.
- OCR aún no implementado: definir API (Edge Function) y contrato de salida.

## Sprints propuestos (orden lógico)
### Sprint 1 – Cerrar flujo Evento → Menú → Producción/Compras
- [ ] UI menú en detalle de evento: selector de producto filtrado por hotel, unidad, qty_per_guest; botones de generar producción/pedidos.
- [ ] Auto-match de producto por nombre y cálculo de cantidades por pax.
- [ ] Generar tareas de producción y pedidos de compra desde menú confirmado; mostrar tabs con vínculos.
- [ ] Documentación: actualizar BACKEND_ESQUEMA_FLUJO_DATOS y BACKEND_EVENTOS_CONTRATOS.

### Sprint 1.5 – Auth/Hoteles/Invitaciones (bloqueante SaaS)
- [ ] Alta self-service: crear hotel inicial y perfil admin al registrar usuario.
- [ ] Multi-hotel: CRUD de hoteles propios, cambio de hotel activo.
- [ ] Invitaciones: crear invitación con email/rol/hotel, enviar link firmado, aceptar y crear perfil en `profiles`.
- [ ] UI de gestión de usuarios por hotel (roles, revocar invitaciones).

### Sprint 2 – Salas y trazabilidad UI
- [ ] Exponer salas/evento_sala en creación/edición de evento.
- [ ] Mostrar sala(s) en calendario/listado y detalle.
- [ ] Ajustar seeds demo para incluir salas y eventos con salas.

### Sprint 3 – Producción operativa
- [ ] UI de subtareas/mise en place (estados, asignación, turno).
- [ ] Vista “mis tareas” móvil simplificada (pendiente/en proceso/hecho).
- [ ] Integrar consumo de inventario (movimientos) desde producción.

### Sprint 3.5 – Personal y Horarios
- [ ] CRUD de turnos/horarios por hotel.
- [ ] Asignar personal a turnos y vincular tareas de producción.
- [ ] Mostrar “mis tareas” filtradas por turno asignado.

### Sprint 4 – Compras e Inventario reforzados
- [ ] Recepción parcial/completa con trazas a pedidos.
- [ ] Alertas de caducidad y faltantes; estado de abastecimiento en evento.
- [ ] Export/import Excel/CSV consolidado con validaciones.

### Sprint 5 – OCR y automatizaciones
- [ ] Edge Function OCR para PDF/imagen de menú, con contrato de salida y modo “borrador” para revisión.
- [ ] Automatizaciones básicas: crear tareas/pedidos al confirmar evento; alertas de incidencias.

### Sprint 6 – Dashboard
- [ ] KPI de eventos, producción, compras, inventario crítico, alertas.
- [ ] Filtros por hotel y fechas; widgets de solo lectura.

### Sprint 7 – Calidad y DX
- [ ] Normalizar codificación de MD, añadir .env.example y guía de despliegue DB.
- [ ] Tests de RLS y de integración (AuthGuard, login, eventos).
- [ ] Runner CI con IPv6 o job que aplique SQL desde Supabase Studio automáticamente.

## Roadmap resumido
1) Cerrar flujo núcleo (evento→menú→producción/compras) con UI completa y docs al día.
2) Salas y trazabilidad visible en eventos.
3) Producción usable para cocina (tareas, móvil).
4) Compras/Inventario robustos con alertas.
5) OCR + automatizaciones.
6) Calidad, tests y DX (CI/db push sin fricción).

## Métricas de salida deseadas (MVP completo)
- Crear/editar evento con salas, menú cargado y confirmado.
- Generar automáticamente tareas de producción y pedidos desde el menú (productos existentes) y reflejarlos en tabs.
- Mostrar estado de stock/faltantes y alertas básicas.
- Tareas de cocina ejecutables con estados y vista “mis tareas”.
- CI verde con typecheck/test; migraciones aplicables vía runner o SQL documentado.
