# 🔌 Configuración de Supabase Extension para VS Code

Esta guía te ayudará a configurar y usar la extensión de Supabase en Visual Studio Code para gestionar tu base de datos de ChefOS.

## ✅ Pre-requisitos

- ✅ Extensión de Supabase ya instalada: `supabase.vscode-supabase-extension`
- ✅ Configuración creada en `.vscode/settings.json`
- ✅ Proyecto Supabase: `xrgewhvijmrthsnrrxdw`

## 🚀 Pasos para Conectar

### Paso 1: Obtener Access Token

1. Ve a: https://app.supabase.com/account/tokens
2. Click en **"Generate new token"**
3. Dale un nombre (ej: "VSCode ChefOS")
4. Click en **"Generate token"**
5. **¡IMPORTANTE!** Copia el token inmediatamente (solo se muestra una vez)

### Paso 2: Conectar en VS Code

1. Abre VS Code en este proyecto
2. Presiona `Ctrl+Shift+P` (Windows/Linux) o `Cmd+Shift+P` (Mac)
3. Escribe: **"Supabase: Connect to Project"**
4. Selecciona **"Use Access Token"**
5. Pega el token que copiaste
6. El proyecto debería aparecer como: `xrgewhvijmrthsnrrxdw`

### Paso 3: Verificar Conexión

1. Mira en la barra lateral izquierda, deberías ver el ícono de Supabase
2. Click en el ícono de Supabase
3. Deberías ver:
   - 📊 **Database** - Tablas y schema
   - ⚡ **Edge Functions** - Funciones serverless
   - 🔐 **Auth** - Configuración de autenticación
   - 📦 **Storage** - Almacenamiento de archivos

## 🎯 Funcionalidades Principales

### 1. Explorar Tablas

```
Ícono Supabase → Database → Tables
```

Verás todas las tablas:

- `profiles` - Usuarios
- `outlets` - Cocinas
- `ingredients` - Ingredientes
- `fichas_tecnicas` - Recetas
- `events` - Eventos
- `employees` - Empleados
- ... y más

**Para ver datos:**

- Click derecho en una tabla → **"View Data"**
- Edita datos directamente en el editor
- Guarda con `Ctrl+S`

### 2. Ejecutar Queries SQL

**Opción A: Usando archivos SQL**

1. Abre cualquier archivo en `sql-queries/`
2. Presiona `Ctrl+Shift+P`
3. Escribe: **"Supabase: Run Query"**
4. Ve los resultados en el panel inferior

**Opción B: Query rápido**

1. Presiona `Ctrl+Shift+P`
2. Escribe: **"Supabase: New Query"**
3. Escribe tu SQL
4. Ejecuta con `Ctrl+Enter`

### 3. Ver Schema

```
Ícono Supabase → Database → Schema
```

Aquí puedes ver:

- Estructura de tablas
- Columnas y tipos de datos
- Índices
- Foreign keys
- Constraints

### 4. Gestionar Edge Functions

```
Ícono Supabase → Edge Functions
```

- Ver funciones deployadas
- Crear nuevas funciones
- Ver logs de ejecución

### 5. IntelliSense para SQL

Cuando escribas SQL en archivos `.sql`, obtendrás:

- ✅ Autocompletado de nombres de tablas
- ✅ Autocompletado de columnas
- ✅ Validación de sintaxis
- ✅ Snippets útiles

## 📂 Queries SQL Predefinidos

He creado queries útiles en el directorio `sql-queries/`:

1. **01-view-users.sql** - Ver todos los usuarios
2. **02-view-outlets.sql** - Ver cocinas/outlets
3. **03-check-user-access.sql** - Verificar permisos de usuario
4. **04-database-stats.sql** - Estadísticas de la DB
5. **05-activate-user.sql** - Activar usuarios y asignar outlets

Para usarlos:

1. Abre el archivo `.sql`
2. Lee los comentarios
3. Ejecuta con `Ctrl+Shift+P` → "Supabase: Run Query"

## 🔥 Comandos Útiles

| Comando                                     | Descripción              |
| ------------------------------------------- | ------------------------ |
| `Ctrl+Shift+P` → "Supabase: Run Query"      | Ejecutar query actual    |
| `Ctrl+Shift+P` → "Supabase: Refresh Schema" | Actualizar schema        |
| `Ctrl+Shift+P` → "Supabase: View Logs"      | Ver logs de la DB        |
| `Ctrl+Shift+P` → "Supabase: Open Dashboard" | Abrir dashboard web      |
| `Ctrl+Shift+P` → "Supabase: Generate Types" | Generar tipos TypeScript |

## 🎨 Snippets SQL Útiles

Escribe estos prefijos en archivos `.sql` y presiona Tab:

- `sselect` → SELECT statement
- `sinsert` → INSERT statement
- `supdate` → UPDATE statement
- `sdelete` → DELETE statement
- `screate` → CREATE TABLE statement

## 🔐 Seguridad

### ✅ Seguro para Compartir

- `.vscode/settings.json` - Solo contiene URL pública
- `sql-queries/*` - Queries sin credenciales
- `.vscode/supabase-connection.md` - Documentación

### ❌ NUNCA Compartas

- Tu Access Token personal
- Variables en `.env`
- Service Role Key (si la tienes)

## 🐛 Troubleshooting

### "Cannot connect to project"

1. Verifica que tu Access Token sea válido
2. Ve a https://app.supabase.com/account/tokens
3. Regenera el token si es necesario
4. Reconecta en VS Code

### "No tables showing"

1. `Ctrl+Shift+P` → "Supabase: Refresh Schema"
2. Verifica que estés conectado al proyecto correcto
3. Verifica permisos de tu usuario en Supabase

### "Query execution failed"

1. Revisa la sintaxis SQL
2. Verifica que tengas permisos para la operación
3. Mira los logs: `Ctrl+Shift+P` → "Supabase: View Logs"

## 📚 Recursos Adicionales

- [Documentación Supabase](https://supabase.com/docs)
- [Supabase VS Code Extension](https://marketplace.visualstudio.com/items?itemName=supabase.vscode-supabase-extension)
- [SQL Tutorial](https://supabase.com/docs/guides/database)
- [Dashboard Web](https://app.supabase.com/project/xrgewhvijmrthsnrrxdw)

## 💡 Tips Pro

1. **Usa snippets**: Escribe `sselect` y presiona Tab
2. **Formato automático**: `Shift+Alt+F` en archivos SQL
3. **Multi-cursor**: `Ctrl+D` para seleccionar múltiples ocurrencias
4. **Búsqueda en schema**: `Ctrl+F` en la vista de Database
5. **Exportar resultados**: Click derecho en resultados → "Export"

---

¿Necesitas ayuda? Revisa `.vscode/supabase-connection.md` para más detalles.
