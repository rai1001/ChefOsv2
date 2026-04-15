import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Reset DOM entre tests para evitar leakage de estado entre cases
afterEach(() => {
  cleanup()
})
