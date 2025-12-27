import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Custom matchers
expect.extend({});

import { vi } from 'vitest';

// Global mocks for Firebase
vi.mock('firebase/messaging', async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import('firebase/messaging')>()),
    getMessaging: vi.fn(() => ({})),
    isSupported: vi.fn(async () => false)
  };
});
