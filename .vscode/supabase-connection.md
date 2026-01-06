# Conexión a Supabase con VS Code Extension

## 📋 Información de Conexión

**Project URL**: `https://xrgewhvijmrthsnrrxdw.supabase.co`
**Project Reference**: `xrgewhvijmrthsnrrxdw`

## 🔧 Pasos para Conectar

### 1. Abrir la Extensión de Supabase

- Presiona `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac)
- Escribe "Supabase" y selecciona "Supabase: Connect to Project"

### 2. Opciones de Conexión

**Opción A: Conectar con Access Token**

1. Ve a https://app.supabase.com/account/tokens
2. Genera un nuevo Access Token
3. Pégalo en VS Code cuando te lo solicite

**Opción B: Usar credenciales del proyecto**

- Project URL: `https://xrgewhvijmrthsnrrxdw.supabase.co`
- Anon Key: Ver en `.env` (VITE_SUPA_KEY)

## 🎯 Funcionalidades Disponibles

Una vez conectado podrás:

### Ver Tablas

- Click derecho en una tabla → "View Data"
- Editar datos directamente en VS Code
- Ver estructura de la tabla

### Ejecutar Queries SQL

1. Crea un archivo `.sql`
2. Escribe tu query
3. Presiona `Ctrl+Shift+P` → "Supabase: Run Query"

### Ver Schema

- Explora el schema de la base de datos
- Ve relaciones entre tablas
- Inspecciona índices y constraints

### Gestionar Edge Functions

- Ver funciones existentes
- Crear nuevas funciones
- Desplegar funciones

## 📊 Tablas Principales del Proyecto

- `profiles` - Perfiles de usuario
- `outlets` - Cocinas/Establecimientos
- `ingredients` - Ingredientes
- `recipes` (fichas_tecnicas) - Recetas
- `events` - Eventos
- `employees` - Personal
- `inventory` - Inventario
- `batches` - Lotes
- `stock_transactions` - Transacciones de stock
- `menus` - Menús
- `purchase_orders` - Órdenes de compra
- `suppliers` - Proveedores

## 🔍 Queries Útiles

### Ver todos los usuarios

```sql
SELECT id, email, full_name, role, is_active
FROM profiles
ORDER BY created_at DESC;
```

### Ver outlets activos

```sql
SELECT id, name, type, is_active, address
FROM outlets
WHERE is_active = true;
```

### Ver ingredientes por outlet

```sql
SELECT i.*, o.name as outlet_name
FROM ingredients i
JOIN outlets o ON i.outlet_id = o.id
ORDER BY i.created_at DESC
LIMIT 50;
```

## 🚀 Comandos Rápidos

- `Ctrl+Shift+P` → "Supabase: Refresh Schema" - Actualizar schema
- `Ctrl+Shift+P` → "Supabase: View Logs" - Ver logs
- `Ctrl+Shift+P` → "Supabase: Open Dashboard" - Abrir dashboard web

## 🔐 Seguridad

- El archivo `.vscode/settings.json` solo contiene la URL pública
- Las claves sensibles se mantienen en `.env`
- Nunca compartas tu Access Token personal
