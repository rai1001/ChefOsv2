# SQL Queries - ChefOS

Este directorio contiene queries SQL útiles para gestionar la base de datos de ChefOS desde VS Code.

## 📁 Archivos Disponibles

1. **01-view-users.sql** - Ver todos los usuarios del sistema
2. **02-view-outlets.sql** - Ver todos los outlets/cocinas
3. **03-check-user-access.sql** - Verificar acceso de un usuario específico
4. **04-database-stats.sql** - Estadísticas generales de la base de datos
5. **05-activate-user.sql** - Activar usuario y asignar outlets

## 🚀 Cómo Usar

### Opción 1: Desde VS Code con Extensión Supabase

1. Abre cualquier archivo `.sql`
2. Presiona `Ctrl+Shift+P` (o `Cmd+Shift+P` en Mac)
3. Escribe "Supabase: Run Query"
4. Los resultados aparecerán en el panel de salida

### Opción 2: Desde Supabase Dashboard

1. Ve a https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/sql
2. Copia el contenido del archivo SQL
3. Pégalo en el editor SQL
4. Click en "Run"

### Opción 3: Desde la Terminal con psql

```bash
# Necesitas la cadena de conexión desde el dashboard de Supabase
psql "postgresql://[CONNECTION_STRING]" -f sql-queries/01-view-users.sql
```

## ⚠️ Importante

- **Queries de lectura** (SELECT): Seguros de ejecutar en cualquier momento
- **Queries de modificación** (UPDATE, DELETE): Revisa dos veces antes de ejecutar
- Siempre haz backup antes de ejecutar queries que modifiquen datos
- Los archivos marcados con `UPDATE` o `DELETE` requieren que reemplaces valores placeholder

## 📝 Notas

- Todos los queries están diseñados para el schema actual de ChefOS
- Si modificas el schema, algunos queries pueden necesitar actualizarse
- Los IDs son UUIDs, asegúrate de usar el formato correcto
