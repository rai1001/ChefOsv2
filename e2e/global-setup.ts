import { execSync } from 'node:child_process'

/**
 * Global setup de Playwright — corre UNA vez antes de toda la suite E2E.
 * Ejecuta el seed determinista para que los tests de flujo trabajen contra
 * un estado reproducible del hotel test (11111111-...).
 *
 * Si el seed falla (p. ej. falta SUPABASE_SERVICE_ROLE_KEY), los tests que
 * dependen del hotel test se saltarán o fallarán — no es problema del setup.
 */
export default async function globalSetup() {
  console.log('\n🌱 [global-setup] Ejecutando seed del hotel test...')
  try {
    execSync('npm run db:seed', { stdio: 'inherit' })
  } catch (err) {
    console.error('⚠ [global-setup] Seed falló. Los tests de flujo pueden fallar.')
    console.error('   Verifica SUPABASE_SERVICE_ROLE_KEY en .env.local')
    throw err
  }
}
