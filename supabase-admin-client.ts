/**
 * Supabase Admin Client - Acceso Total
 * Utiliza SERVICE_ROLE_KEY para operaciones administrativas
 * ⚠️ NUNCA exponer este cliente en el frontend
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Credenciales de administrador (SERVICE_ROLE_KEY tiene acceso total)
const SUPABASE_URL = 'https://xrgewhvijmrthsnrrxdw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZ2V3aHZpam1ydGhzbnJyeGR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzMTEzMywiZXhwIjoyMDgyOTA3MTMzfQ.FXF__BF0lfd2AKeWQ97qjTZSlNqcZCUOSQphP7qpcps';

// Cliente con acceso administrativo completo
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Utilidades para exploración

/**
 * Lista todas las tablas de la base de datos
 */
export async function listAllTables() {
  const { data, error } = await supabaseAdmin.rpc('get_all_tables', {});

  if (error) {
    // Fallback: intentar con query directa a information_schema
    const { data: tables, error: err2 } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (err2) {
      console.error('Error obteniendo tablas:', err2);
      return [];
    }
    return tables;
  }

  return data;
}

/**
 * Describe la estructura de una tabla
 */
export async function describeTable(tableName: string) {
  const { data, error } = await supabaseAdmin
    .from(tableName)
    .select('*')
    .limit(0);

  if (error) {
    console.error(`Error describiendo tabla ${tableName}:`, error);
    return null;
  }

  return data;
}

/**
 * Ejecuta una query SQL personalizada
 */
export async function executeSQL(sql: string) {
  try {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', { query: sql });

    if (error) {
      console.error('Error ejecutando SQL:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error en executeSQL:', err);
    return { success: false, error: err };
  }
}

/**
 * Obtiene información de una tabla específica
 */
export async function getTableInfo(tableName: string) {
  const { data, error, count } = await supabaseAdmin
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(`Error obteniendo info de ${tableName}:`, error);
    return { tableName, error, count: 0 };
  }

  return { tableName, count, error: null };
}

/**
 * Lista todas las Edge Functions
 */
export async function listEdgeFunctions() {
  try {
    // Esto requeriría acceso a la API de management de Supabase
    // Por ahora, retornamos las que conocemos del filesystem
    return [
      { name: 'scan-document', status: 'deployed' },
      { name: 'enrich-ingredient', status: 'deployed' },
      { name: 'chat-copilot', status: 'deployed' },
      { name: 'generate-menu', status: 'deployed' },
    ];
  } catch (err) {
    console.error('Error listando Edge Functions:', err);
    return [];
  }
}

/**
 * Obtiene secretos de Supabase Vault (requiere permisos especiales)
 */
export async function listSecrets() {
  const { data, error } = await supabaseAdmin
    .from('vault.secrets')
    .select('*');

  if (error) {
    console.error('Error obteniendo secretos:', error);
    return [];
  }

  return data;
}

// CLI interactiva
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔧 Supabase Admin Client - Acceso Total\n');
  console.log('URL:', SUPABASE_URL);
  console.log('Tipo de clave: SERVICE_ROLE (acceso administrativo completo)\n');

  const command = process.argv[2];

  switch (command) {
    case 'tables':
      console.log('📊 Listando tablas...\n');
      listAllTables().then(tables => {
        console.log('Tablas encontradas:', tables);
      });
      break;

    case 'info':
      const tableName = process.argv[3];
      if (!tableName) {
        console.error('❌ Especifica un nombre de tabla: npm run admin info <tabla>');
        break;
      }
      console.log(`ℹ️  Información de tabla: ${tableName}\n`);
      getTableInfo(tableName).then(info => {
        console.log(info);
      });
      break;

    case 'functions':
      console.log('⚡ Edge Functions desplegadas:\n');
      listEdgeFunctions().then(funcs => {
        funcs.forEach(f => console.log(`  - ${f.name} (${f.status})`));
      });
      break;

    case 'test':
      console.log('🧪 Probando conexión...\n');
      supabaseAdmin.from('outlets').select('id').limit(1).then(({ data, error }) => {
        if (error) {
          console.error('❌ Error de conexión:', error);
        } else {
          console.log('✅ Conexión exitosa!');
          console.log('Datos de prueba:', data);
        }
      });
      break;

    default:
      console.log('Comandos disponibles:');
      console.log('  npx tsx supabase-admin-client.ts tables     - Listar todas las tablas');
      console.log('  npx tsx supabase-admin-client.ts info <tabla> - Información de tabla');
      console.log('  npx tsx supabase-admin-client.ts functions  - Listar Edge Functions');
      console.log('  npx tsx supabase-admin-client.ts test       - Probar conexión');
  }
}
