export * from './mocks/transaction';
// Helper to create mock IDs
export const createMockId = (prefix: string = 'id') =>
  `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
