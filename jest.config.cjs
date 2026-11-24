/** @type {import('ts-jest').JestConfigWithTsJest} */
// Adapted from Hussein Bouik's original jest.config.js in the
// `linear-zone-divider` repo; repointed at the vendored engine copy and
// given an inline tsconfig (the app tsconfig targets ES modules for Vite,
// while ts-jest needs CommonJS).
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/src/engine/__tests__/data/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          target: 'ES2022',
          module: 'CommonJS',
          moduleResolution: 'Node10',
          esModuleInterop: true,
          strict: true,
          isolatedModules: true,
        },
      },
    ],
  },
};
