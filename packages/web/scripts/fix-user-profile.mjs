#!/usr/bin/env node

/**
 * Script para crear el perfil faltante del usuario paypalpago1978@gmail.com
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

console.log('🔧 Intentando crear/actualizar perfil para:', userEmail);
console.log('━'.repeat(60));

// Intentar obtener usuarios de auth (esto puede fallar con anon key)
console.log('\n1️⃣  Buscando usuario en auth.users...');

// Primero, verificar si ya existe un perfil
const { data: existingProfile, error: checkError } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', userEmail)
  .maybeSingle();

if (existingProfile) {
  console.log('✅ El perfil ya existe:');
  console.log('   ID:', existingProfile.id);
  console.log('   Email:', existingProfile.email);
  console.log('   Active Outlet:', existingProfile.active_outlet_id);

  // Actualizar el perfil existente
  console.log('\n2️⃣  Actualizando perfil existente...');
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({
      active_outlet_id: atlanticoId,
      allowed_outlet_ids: [atlanticoId],
      is_active: true,
      role: 'admin',
    })
    .eq('email', userEmail)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error actualizando perfil:', updateError.message);
  } else {
    console.log('✅ Perfil actualizado correctamente');
    console.log('   Outlet activo:', updated.active_outlet_id);
    console.log('   Outlets permitidos:', updated.allowed_outlet_ids);
  }
} else {
  console.log('⚠️  No se encontró perfil existente');
  console.log('   Error:', checkError?.message || 'No se pudo verificar');

  console.log('\n📝 SOLUCIÓN MANUAL REQUERIDA:');
  console.log('\n   El usuario necesita ser creado en auth.users primero.');
  console.log('   Opciones:');
  console.log('\n   A) Desde Supabase Dashboard:');
  console.log('      1. Ve a https://app.supabase.com/project/xrgewhvijmrthsnrrxdw/auth/users');
  console.log(`      2. Click en "Invite user" o "Create user"`);
  console.log(`      3. Email: ${userEmail}`);
  console.log('      4. Establece una contraseña temporal');
  console.log('      5. El trigger creará automáticamente el perfil');
  console.log('      6. Luego ejecuta este script de nuevo para asignar el outlet');

  console.log('\n   B) Si el usuario YA se registró pero no tiene perfil:');
  console.log('      1. Obtén su UUID desde Supabase Dashboard → Auth → Users');
  console.log('      2. Ejecuta este SQL en el SQL Editor del dashboard:');
  console.log('\n      ```sql');
  console.log(`      INSERT INTO profiles (`);
  console.log(`        id,`);
  console.log(`        email,`);
  console.log(`        full_name,`);
  console.log(`        role,`);
  console.log(`        active_outlet_id,`);
  console.log(`        allowed_outlet_ids,`);
  console.log(`        is_active`);
  console.log(`      ) VALUES (`);
  console.log(`        'UUID_DEL_USUARIO_AQUI',`);
  console.log(`        '${userEmail}',`);
  console.log(`        'Usuario Hotel Atlántico',`);
  console.log(`        'admin',`);
  console.log(`        '${atlanticoId}',`);
  console.log(`        ARRAY['${atlanticoId}']::uuid[],`);
  console.log(`        true`);
  console.log(`      );`);
  console.log('      ```');
}

console.log('\n' + '━'.repeat(60));
console.log('✅ Proceso completado\n');
