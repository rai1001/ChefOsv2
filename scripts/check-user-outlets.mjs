#!/usr/bin/env node

/**
 * Script para verificar el perfil de usuario y outlets
 * Uso: node scripts/check-user-outlets.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
config({ path: join(__dirname, '../packages/web/.env') });

const supabaseUrl = process.env.VITE_SUPA_URL;
const supabaseKey = process.env.VITE_SUPA_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPA_URL o VITE_SUPA_KEY no están definidos');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const userEmail = 'paypalpago1978@gmail.com';

console.log('🔍 Verificando usuario:', userEmail);
console.log('━'.repeat(60));

// 1. Verificar perfil del usuario
console.log('\n📋 1. PERFIL DEL USUARIO');
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', userEmail)
  .single();

if (profileError) {
  console.error('❌ Error obteniendo perfil:', profileError.message);
} else if (profile) {
  console.log('✅ Usuario encontrado:');
  console.log('  ID:', profile.id);
  console.log('  Email:', profile.email);
  console.log('  Nombre:', profile.full_name);
  console.log('  Role:', profile.role);
  console.log('  Activo:', profile.is_active);
  console.log('  Outlet Activo ID:', profile.active_outlet_id || '❌ NO ASIGNADO');
  console.log('  Outlets Permitidos:', profile.allowed_outlet_ids?.length || 0);
  if (profile.allowed_outlet_ids?.length > 0) {
    console.log('    →', profile.allowed_outlet_ids.join(', '));
  }
} else {
  console.log('❌ Usuario no encontrado');
}

// 2. Ver todos los outlets
console.log('\n🏢 2. OUTLETS DISPONIBLES');
const { data: outlets, error: outletsError } = await supabase
  .from('outlets')
  .select('id, name, type, is_active, address')
  .order('name');

if (outletsError) {
  console.error('❌ Error obteniendo outlets:', outletsError.message);
} else if (outlets && outlets.length > 0) {
  console.log(`✅ Total de outlets: ${outlets.length}`);
  outlets.forEach((outlet, idx) => {
    console.log(`\n  ${idx + 1}. ${outlet.name}`);
    console.log(`     ID: ${outlet.id}`);
    console.log(`     Tipo: ${outlet.type}`);
    console.log(`     Activo: ${outlet.is_active ? '✅' : '❌'}`);
    console.log(`     Dirección: ${outlet.address || 'N/A'}`);
  });
} else {
  console.log('❌ No se encontraron outlets');
}

// 3. Buscar Hotel Atlántico específicamente
console.log('\n🏨 3. BUSCANDO "HOTEL ATLÁNTICO"');
const { data: atlantico, error: atlanticoError } = await supabase
  .from('outlets')
  .select('*')
  .or('name.ilike.%atlantico%,name.ilike.%atlántico%');

if (atlanticoError) {
  console.error('❌ Error buscando Hotel Atlántico:', atlanticoError.message);
} else if (atlantico && atlantico.length > 0) {
  console.log(`✅ Encontrado(s) ${atlantico.length} resultado(s):`);
  atlantico.forEach((outlet) => {
    console.log(`\n  Nombre: ${outlet.name}`);
    console.log(`  ID: ${outlet.id}`);
    console.log(`  Activo: ${outlet.is_active ? '✅' : '❌'}`);
  });
} else {
  console.log('❌ No se encontró "Hotel Atlántico"');
}

// 4. Contar empleados por outlet
console.log('\n👥 4. EMPLEADOS POR OUTLET');
const { data: employeesCount, error: employeesError } = await supabase
  .from('employees')
  .select('outlet_id');

if (employeesError) {
  console.error('❌ Error contando empleados:', employeesError.message);
} else if (employeesCount && employeesCount.length > 0) {
  const counts = {};
  employeesCount.forEach((emp) => {
    counts[emp.outlet_id] = (counts[emp.outlet_id] || 0) + 1;
  });

  for (const [outletId, count] of Object.entries(counts)) {
    const outlet = outlets?.find((o) => o.id === outletId);
    console.log(`  ${outlet?.name || 'Desconocido'}: ${count} empleados`);
  }
  console.log(`\n  Total empleados: ${employeesCount.length}`);
} else {
  console.log('❌ No hay empleados registrados');
}

// 5. Contar ingredientes por outlet
console.log('\n🥘 5. INGREDIENTES POR OUTLET');
const { data: ingredientsCount, error: ingredientsError } = await supabase
  .from('ingredients')
  .select('outlet_id');

if (ingredientsError) {
  console.error('❌ Error contando ingredientes:', ingredientsError.message);
} else if (ingredientsCount && ingredientsCount.length > 0) {
  const counts = {};
  ingredientsCount.forEach((ing) => {
    counts[ing.outlet_id] = (counts[ing.outlet_id] || 0) + 1;
  });

  for (const [outletId, count] of Object.entries(counts)) {
    const outlet = outlets?.find((o) => o.id === outletId);
    console.log(`  ${outlet?.name || 'Desconocido'}: ${count} ingredientes`);
  }
  console.log(`\n  Total ingredientes: ${ingredientsCount.length}`);
} else {
  console.log('❌ No hay ingredientes registrados');
}

console.log('\n' + '━'.repeat(60));
console.log('✅ Diagnóstico completado\n');
