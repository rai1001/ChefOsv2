/**
 * Supabase Database Explorer (Sin dependencias)
 * Usa fetch directo a la API REST de Supabase
 */

const SUPABASE_URL = 'https://xrgewhvijmrthsnrrxdw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyZ2V3aHZpam1ydGhzbnJyeGR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzMzMTEzMywiZXhwIjoyMDgyOTA3MTMzfQ.FXF__BF0lfd2AKeWQ97qjTZSlNqcZCUOSQphP7qpcps';

interface TableInfo {
  name: string;
  count: number;
  sample: any[];
  columns: string[];
  error?: string;
}

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
];

async function queryTable(tableName: string): Promise<TableInfo> {
  try {
    // Obtener datos de muestra
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${tableName}?limit=2`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'count=exact'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return {
        name: tableName,
        count: 0,
        sample: [],
        columns: [],
        error: `HTTP ${response.status}: ${error.substring(0, 100)}`
      };
    }

    const data = await response.json();
    const count = parseInt(response.headers.get('Content-Range')?.split('/')[1] || '0');

    // Extraer columnas del primer registro
    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    return {
      name: tableName,
      count,
      sample: data,
      columns
    };

  } catch (error: any) {
    return {
      name: tableName,
      count: 0,
      sample: [],
      columns: [],
      error: error.message
    };
  }
}

async function testEdgeFunction(functionName: string) {
  try {
    const testPayloads: Record<string, any> = {
      'scan-document': {
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        type: 'invoice'
      },
      'enrich-ingredient': {
        ingredientName: 'tomate'
      },
      'chat-copilot': {
        message: 'test',
        context: {},
        history: []
      },
      'generate-menu': {
        params: { test: true }
      }
    };

    const payload = testPayloads[functionName] || {};

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    return {
      name: functionName,
      status: response.ok ? 'OK' : 'ERROR',
      statusCode: response.status,
      responseTime: 0 // TODO: measure
    };

  } catch (error: any) {
    return {
      name: functionName,
      status: 'ERROR',
      error: error.message
    };
  }
}

async function main() {
  console.log('🔧 Supabase Database Explorer - Acceso Administrativo\n');
  console.log('URL:', SUPABASE_URL);
  console.log('Auth: SERVICE_ROLE_KEY (acceso total)\n');
  console.log('═'.repeat(80));

  // Explorar tablas
  console.log('\n📊 EXPLORANDO TABLAS:\n');

  const results: TableInfo[] = [];

  for (const tableName of KNOWN_TABLES) {
    process.stdout.write(`  Consultando ${tableName}...`);
    const info = await queryTable(tableName);
    results.push(info);

    if (info.error) {
      console.log(` ❌`);
    } else {
      console.log(` ✅ (${info.count} registros)`);
    }
  }

  console.log('\n═'.repeat(80));
  console.log('\n📋 RESUMEN DE TABLAS:\n');

  let totalRecords = 0;
  let existingTables = 0;

  results.forEach(table => {
    if (table.error) {
      console.log(`❌ ${table.name.padEnd(25)} ERROR`);
      console.log(`   ${table.error}\n`);
    } else {
      const icon = table.count > 0 ? '✅' : '⚪';
      console.log(`${icon} ${table.name.padEnd(25)} ${table.count.toString().padStart(6)} registros`);

      if (table.columns.length > 0) {
        console.log(`   Columnas (${table.columns.length}): ${table.columns.slice(0, 8).join(', ')}${table.columns.length > 8 ? '...' : ''}`);
      }

      if (table.sample.length > 0 && table.name === 'outlets') {
        console.log(`   Muestra: ${JSON.stringify(table.sample[0], null, 2).substring(0, 200)}...`);
      }

      console.log('');

      totalRecords += table.count;
      existingTables++;
    }
  });

  console.log('═'.repeat(80));
  console.log(`📈 Tablas existentes: ${existingTables}/${KNOWN_TABLES.length}`);
  console.log(`📊 Total de registros: ${totalRecords}\n`);

  // Probar Edge Functions
  console.log('═'.repeat(80));
  console.log('\n⚡ PROBANDO EDGE FUNCTIONS:\n');

  const functions = [
    'scan-document',
    'enrich-ingredient',
    'chat-copilot',
    'generate-menu'
  ];

  for (const fn of functions) {
    process.stdout.write(`  Probando ${fn}...`);
    const result = await testEdgeFunction(fn);

    if (result.status === 'OK') {
      console.log(` ✅ (HTTP ${result.statusCode})`);
    } else {
      console.log(` ❌ (HTTP ${result.statusCode})`);
    }
  }

  console.log('\n═'.repeat(80));
  console.log('\n✨ Exploración completada!\n');

  console.log('💡 Comandos útiles:');
  console.log('   - Ver todas las tablas: npx tsx supabase-explore-api.ts');
  console.log('   - Acceso al dashboard: https://supabase.com/dashboard/project/xrgewhvijmrthsnrrxdw');
}

main().catch(console.error);
