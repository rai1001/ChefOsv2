/**
 * Script para probar la conexión con Supabase
 * Verifica Edge Functions y acceso a la base de datos
 */

const SUPABASE_URL = 'https://xrgewhvijmrthsnrrxdw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_09GcoxV84nJjX5n2ZALgYg_G2YbQrU_';

interface TestResult {
  test: string;
  status: 'OK' | 'ERROR';
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

// Test 1: Conexión a Supabase REST API
async function testRestAPI() {
  const start = Date.now();
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const duration = Date.now() - start;

    if (response.ok) {
      results.push({
        test: 'REST API Connection',
        status: 'OK',
        message: `Conectado a Supabase REST API (${duration}ms)`,
        duration,
      });
    } else {
      results.push({
        test: 'REST API Connection',
        status: 'ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
        duration,
      });
    }
  } catch (error: any) {
    results.push({
      test: 'REST API Connection',
      status: 'ERROR',
      message: `Error: ${error.message}`,
    });
  }
}

// Test 2: Edge Function - scan-document
async function testScanDocumentFunction() {
  const start = Date.now();
  try {
    // Crear una imagen de prueba pequeña (1x1 pixel PNG en base64)
    const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const response = await fetch(`${SUPABASE_URL}/functions/v1/scan-document`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: testImage,
        type: 'invoice',
        outletId: 'test',
      }),
    });

    const duration = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      results.push({
        test: 'Edge Function: scan-document',
        status: 'OK',
        message: `Función desplegada y operativa (${duration}ms)`,
        duration,
      });
    } else {
      const error = await response.text();
      results.push({
        test: 'Edge Function: scan-document',
        status: 'ERROR',
        message: `HTTP ${response.status}: ${error.substring(0, 100)}`,
        duration,
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Edge Function: scan-document',
      status: 'ERROR',
      message: `Error: ${error.message}`,
    });
  }
}

// Test 3: Edge Function - enrich-ingredient
async function testEnrichIngredientFunction() {
  const start = Date.now();
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/enrich-ingredient`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ingredientName: 'tomate',
        outletId: 'test',
      }),
    });

    const duration = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      results.push({
        test: 'Edge Function: enrich-ingredient',
        status: 'OK',
        message: `Función desplegada y operativa (${duration}ms)`,
        duration,
      });
    } else {
      const error = await response.text();
      results.push({
        test: 'Edge Function: enrich-ingredient',
        status: 'ERROR',
        message: `HTTP ${response.status}: ${error.substring(0, 100)}`,
        duration,
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Edge Function: enrich-ingredient',
      status: 'ERROR',
      message: `Error: ${error.message}`,
    });
  }
}

// Test 4: Verificar acceso a tablas
async function testDatabaseAccess() {
  const start = Date.now();
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/outlets?limit=1`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const duration = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      results.push({
        test: 'Database Access (outlets table)',
        status: 'OK',
        message: `Acceso a base de datos OK (${duration}ms)`,
        duration,
      });
    } else {
      const error = await response.text();
      results.push({
        test: 'Database Access (outlets table)',
        status: 'ERROR',
        message: `HTTP ${response.status}: ${error.substring(0, 100)}`,
        duration,
      });
    }
  } catch (error: any) {
    results.push({
      test: 'Database Access (outlets table)',
      status: 'ERROR',
      message: `Error: ${error.message}`,
    });
  }
}

// Ejecutar todos los tests
async function runAllTests() {
  console.log('🔍 Iniciando pruebas de conexión a Supabase...\n');
  console.log('URL:', SUPABASE_URL);
  console.log('Anon Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...\n');

  await testRestAPI();
  await testScanDocumentFunction();
  await testEnrichIngredientFunction();
  await testDatabaseAccess();

  console.log('\n📊 RESULTADOS:\n');
  console.log('═'.repeat(80));

  let passed = 0;
  let failed = 0;

  results.forEach((result) => {
    const icon = result.status === 'OK' ? '✅' : '❌';
    console.log(`${icon} ${result.test}`);
    console.log(`   ${result.message}`);
    if (result.duration) {
      console.log(`   Tiempo: ${result.duration}ms`);
    }
    console.log('');

    if (result.status === 'OK') passed++;
    else failed++;
  });

  console.log('═'.repeat(80));
  console.log(`\nTotal: ${results.length} tests | ✅ ${passed} pasados | ❌ ${failed} fallados`);

  if (failed === 0) {
    console.log('\n🎉 ¡Todas las pruebas pasaron exitosamente!');
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.');
  }
}

// Ejecutar
runAllTests().catch(console.error);
