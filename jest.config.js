module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Use worker_threads (structuredClone) instead of child_process (JSON) so
  // test results containing BigInt (Stellar sequence numbers) or circular
  // socket objects don't crash the worker during IPC serialization.
  workerThreads: true,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { isolatedModules: true, diagnostics: false }],
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 85,
      functions: 85,
      lines: 85
    }
  },
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
    '^react-dom/(.*)$': '<rootDir>/node_modules/react-dom/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/mocks/setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/src/test/msw/rpcTransport.test.ts']
};
