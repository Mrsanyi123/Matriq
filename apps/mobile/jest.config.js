/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/*.test.ts?(x)'],
  moduleNameMapper: {
    // Jest would otherwise pick lucide's ESM (.mjs) build.
    '^lucide-react-native$': require.resolve('lucide-react-native'),
  },
  // Workspace packages ship TypeScript source, so Babel must transform them.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|expo-router|react-navigation|@react-navigation/.*|react-native-svg|lucide-react-native|@matriq/.*))',
  ],
};
