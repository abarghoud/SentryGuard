module.exports = {
  displayName: 'mobile',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['<rootDir>/src/**/*(*.)@(spec|test).[jt]s?(x)'],
  coverageDirectory: 'test-output/jest/coverage',
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { isolatedModules: true, tsconfig: { jsx: 'react-jsx' } }],
  },
};
