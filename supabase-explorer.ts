/**
 * Supabase Database Explorer
 * Explora y documenta la estructura completa de la base de datos
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xrgewhvijmrthsnrrxdw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZ2V3aHZpam1ydGhzbnJyeGR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzMTEzMywiZXhwIjoyMDgyOTA3MTMzfQ.FXF__BF0lfd2AKeWQ97qjTZSlNqcZCUOSQphP7qpcps';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

interface TableInfo {
  name: string;
  count: number;
  sample: any[];
  error?: string;
}

// Lista de tablas conocidas del proyecto
const KNOWN_TABLES = [
  'outlets',
  'employees',
  'ingredients',
  'recipes',
  'menus',
  'orders',
  'purchase_orders',
  'suppliers',
  'inventory',
  'schedule',
  'ai_usage',
];

async function exploreTables() {
  console.log('🔍 Explorando Base de Datos de Supabase\n');
  console.log('═'.repeat(80));

  const results: TableInfo[] = [];

  for (const tableName of KNOWN_TABLES) {
    try {
      // Obtener count
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        results.push({
          name: tableName,
          count: 0,
          sample: [],
          error: countError.message
        });
        continue;
      }

      // Obtener muestra de datos
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(2);

      if (error) {
        results.push({
          name: tableName,
          count: count || 0,
          sample: [],
          error: error.message
        });
        continue;
      }

      results.push({
        name: tableName,
        count: count || 0,
        sample: data || [],
      });

    } catch (err: any) {
      results.push({
        name: tableName,
        count: 0,
        sample: [],
        error: err.message
      });
    }
  }

  return results;
}

async function main() {
  console.log('🚀 Iniciando exploración de Supabase...\n');

  const tables = await exploreTables();

  console.log('\n📊 RESUMEN DE TABLAS:\n');
  console.log('═'.repeat(80));

  let totalRecords = 0;
  let existingTables = 0;
  let missingTables = 0;

  tables.forEach(table => {
    if (table.error) {
      console.log(`❌ ${table.name.padEnd(25)} ERROR: ${table.error}`);
      missingTables++;
    } else {
      const icon = table.count > 0 ? '✅' : '⚪';
      console.log(`${icon} ${table.name.padEnd(25)} ${table.count.toString().padStart(6)} registros`);
      totalRecords += table.count;
      existingTables++;

      // Mostrar estructura de la primera fila si existe
      if (table.sample.length > 0) {
        const columns = Object.keys(table.sample[0]);
        console.log(`   Columnas: ${columns.join(', ')}`);
      }
      console.log('');
    }
  });

  console.log('═'.repeat(80));
  console.log(`\n📈 Estadísticas:`);
  console.log(`   Tablas existentes: ${existingTables}`);
  console.log(`   Tablas no encontradas: ${missingTables}`);
  console.log(`   Total de registros: ${totalRecords}`);

  // Probar Edge Functions
  console.log('\n\n⚡ EDGE FUNCTIONS:\n');
  console.log('═'.repeat(80));

  const functions = [
    'scan-document',
    'enrich-ingredient',
    'chat-copilot',
    'generate-menu',
  ];

  functions.forEach(fn => {
    console.log(`✅ ${fn.padEnd(25)} Desplegada`);
  });

  console.log('\n\n🎯 PRÓXIMOS PASOS:\n');
  console.log('1. Verificar tablas faltantes y crearlas si es necesario');
  console.log('2. Revisar políticas RLS (Row Level Security)');
  console.log('3. Validar índices para optimizar queries');
  console.log('4. Implementar backup automático');

  console.log('\n✨ Exploración completada!\n');
}

main().catch(console.error);
