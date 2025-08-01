// Mock ExpoModulesCore native modules
jest.mock('expo-modules-core', () => {
  const modulesCore = jest.requireActual('expo-modules-core');
  const NativeModulesProxy = new Proxy({}, {
    get() {
      return {};
    }
  });
  return {
    ...modulesCore,
    NativeModulesProxy,
  };
});
