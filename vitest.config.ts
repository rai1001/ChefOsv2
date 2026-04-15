import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    // Excluir e2e (van con Playwright) y dist/build
    exclude: ['node_modules', '.next', 'e2e', 'dist', 'build'],
    // Co-locar tests: foo.ts + foo.test.ts en el mismo directorio
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
