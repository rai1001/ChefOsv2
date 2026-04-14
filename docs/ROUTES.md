
# Routes (Next.js)

## Auth
- /login
- /logout (acción)
- /select-hotel (si aplica, opcional)

## App (layout con AppShell)
- /app (redirect a /app/dashboard)
- /app/dashboard

## Eventos
- /app/eventos
- /app/eventos/nuevo
- /app/eventos/[id]

## Producción
- /app/produccion
- /app/produccion/nuevo?eventoId=
- /app/produccion/[id]

## Productos
- /app/productos
- /app/productos/nuevo
- /app/productos/[id]

## Proveedores
- /app/proveedores
- /app/proveedores/nuevo
- /app/proveedores/[id]

## Compras/Pedidos
- /app/pedidos
- /app/pedidos/nuevo?eventoId=&proveedorId=
- /app/pedidos/[id]

## Inventario
- /app/inventario
- /app/inventario/recepcion?pedidoId=
- /app/inventario/lotes/[id]

## Etiquetado/Trazabilidad
- /app/etiquetas
- /app/etiquetas/nueva
- /app/trazabilidad

## Mermas
- /app/mermas
- /app/mermas/nueva

## Alertas
- /app/alertas

## Automatizaciones
- /app/automatizaciones

## Ajustes
- /app/settings (roles, hoteles, etc. mínimo)
