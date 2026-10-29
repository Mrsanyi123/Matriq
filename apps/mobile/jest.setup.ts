/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

/** Router calls are recorded on `mockRouter` (see src/test/render.tsx). */
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  dismissTo: jest.fn(),
  canGoBack: jest.fn(() => true),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  router: mockRouter,
  useLocalSearchParams: jest.fn(() => ({})),
  // Screens in tests are always focused.
  useFocusEffect: (effect: () => void | (() => void)) => {
    require('react').useEffect(effect, [effect]);
  },
}));

(globalThis as { __mockRouter?: typeof mockRouter }).__mockRouter = mockRouter;

beforeEach(() => {
  Object.values(mockRouter).forEach((fn) => fn.mockClear());
});
