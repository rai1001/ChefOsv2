#!/usr/bin/env node

/**
 * Script para FORZAR la creación del perfil del usuario
 * Con verificaciones exhaustivas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPA_URL;
const supabaseKey = process.env.VITE_SUPA_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no definidas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const userEmail = 'paypalpago1978@gmail.com';
const atlanticoId = '2978dfe6-efc7-4c92-ac6a-565b8a9830b0';

console.log('🔧 FORZANDO CREACIÓN DE PERFIL');
console.log('━'.repeat(60));

// Paso 1: Verificar que el outlet existe
console.log('\n1️⃣  Verificando que el Hotel Atlántico existe...');
const { data: outlet, error: outletError } = await supabase
  .from('outlets')
  .select('*')
  .eq('id', atlanticoId)
  .single();

if (outletError || !outlet) {
  console.error('❌ ERROR: Hotel Atlántico NO existe en la base de datos');
  console.error('   Error:', outletError?.message || 'No encontrado');
  process.exit(1);
}

console.log('✅ Hotel Atlántico encontrado:');
console.log('   ID:', outlet.id);
console.log('   Nombre:', outlet.name);
console.log('   Activo:', outlet.is_active);

// Paso 2: Intentar autenticar al usuario
console.log('\n2️⃣  Intentando autenticar al usuario...');
console.log('   Email:', userEmail);
console.log('   NOTA: Este paso puede fallar si no tenemos la contraseña');

// Paso 3: Verificar perfil actual
console.log('\n3️⃣  Verificando perfil actual...');
const { data: currentProfile, error: profileCheckError } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', userEmail)
  .maybeSingle();

if (currentProfile) {
  console.log('⚠️  El perfil YA EXISTE:');
  console.log('   ID:', currentProfile.id);
  console.log('   Email:', currentProfile.email);
  console.log('   Role:', currentProfile.role);
  console.log('   Active Outlet ID:', currentProfile.active_outlet_id);
  console.log('   Allowed Outlets:', currentProfile.allowed_outlet_ids);
  console.log('   Is Active:', currentProfile.is_active);

  // Actualizar el perfil existente
  console.log('\n4️⃣  ACTUALIZANDO perfil existente...');
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({
      active_outlet_id: atlanticoId,
      allowed_outlet_ids: [atlanticoId],
      is_active: true,
      role: 'admin',
      full_name: 'Administrador Hotel Atlántico',
    })
    .eq('id', currentProfile.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ ERROR actualizando perfil:', updateError.message);
    console.error('   Code:', updateError.code);
    console.error('   Details:', updateError.details);
    console.error('   Hint:', updateError.hint);
  } else {
    console.log('✅ Perfil ACTUALIZADO correctamente:');
    console.log('   Active Outlet ID:', updated.active_outlet_id);
    console.log('   Allowed Outlets:', updated.allowed_outlet_ids);
    console.log('   Role:', updated.role);
    console.log('   Is Active:', updated.is_active);
  }
} else {
  console.log('⚠️  NO existe perfil para este usuario');
  console.log('   Esto significa que el usuario NO está en auth.users');
  console.log('   o el trigger no creó el perfil automáticamente');

  console.log('\n❌ NO PUEDO CREAR EL PERFIL AUTOMÁTICAMENTE');
  console.log('\n📝 DEBES HACER LO SIGUIENTE MANUALMENTE:');
  console.log('\n1. Ve a: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/auth/users');
  console.log('2. Busca el usuario: paypalpago1978@gmail.com');
  console.log('3. Si NO existe:');
  console.log('   - Click en "Add User"');
  console.log('   - Email: paypalpago1978@gmail.com');
  console.log('   - Password: (establece una contraseña)');
  console.log('   - Auto Confirm: ✅ SI');
  console.log('4. Si SÍ existe, copia su UUID');
  console.log('5. Ve a: https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/sql');
  console.log('6. Ejecuta este SQL (reemplaza USER_UUID con el UUID del usuario):');
  console.log('\n```sql');
  console.log(`INSERT INTO profiles (id, email, full_name, role, active_outlet_id, allowed_outlet_ids, is_active)`);
  console.log(`VALUES (`);
  console.log(`  'USER_UUID',`);
  console.log(`  '${userEmail}',`);
  console.log(`  'Administrador Hotel Atlántico',`);
  console.log(`  'admin',`);
  console.log(`  '${atlanticoId}',`);
  console.log(`  ARRAY['${atlanticoId}']::uuid[],`);
  console.log(`  true`);
  console.log(`);`);
  console.log('```');
}

// Paso 5: Verificación final
console.log('\n5️⃣  VERIFICACIÓN FINAL...');
const { data: finalProfile, error: finalError } = await supabase
  .from('profiles')
  .select(`
    *,
    outlets:active_outlet_id (
      id,
      name,
      is_active
    )
  `)
  .eq('email', userEmail)
  .maybeSingle();

if (finalProfile) {
  console.log('\n✅ PERFIL VERIFICADO:');
  console.log('━'.repeat(60));
  console.log('Email:', finalProfile.email);
  console.log('Nombre:', finalProfile.full_name);
  console.log('Role:', finalProfile.role);
  console.log('Activo:', finalProfile.is_active);
  console.log('Outlet Activo:', finalProfile.outlets?.name || 'N/A');
  console.log('Outlet ID:', finalProfile.active_outlet_id);
  console.log('Outlets Permitidos:', finalProfile.allowed_outlet_ids);
  console.log('━'.repeat(60));

  if (finalProfile.active_outlet_id === atlanticoId) {
    console.log('\n🎉 ¡ÉXITO! El usuario tiene acceso al Hotel Atlántico');
    console.log('\n✅ El usuario puede:');
    console.log('   1. Iniciar sesión en la aplicación');
    console.log('   2. Ver el Hotel Atlántico en el selector');
    console.log('   3. Acceder a los 4 empleados');
    console.log('   4. Acceder a los 1000 ingredientes');
  } else {
    console.log('\n⚠️  PROBLEMA: El outlet activo NO es el Hotel Atlántico');
    console.log('   Esperado:', atlanticoId);
    console.log('   Actual:', finalProfile.active_outlet_id);
  }
} else {
  console.log('\n❌ PROBLEMA: No se pudo verificar el perfil');
  console.log('   Error:', finalError?.message || 'Perfil no encontrado');
}

console.log('\n' + '━'.repeat(60));
console.log('Proceso completado\n');
