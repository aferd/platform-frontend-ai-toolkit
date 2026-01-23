/* eslint-disable */
export default {
  displayName: '@redhat-cloud-services/hcc-jira-mcp',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      useESM: true
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/packages/hcc-jira-mcp',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!(msw|@mswjs|until-async)/)',
  ],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
