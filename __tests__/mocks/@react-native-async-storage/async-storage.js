/**
 * Mock AsyncStorage for testing
 */

const AsyncStorage = {
  getItem: () => Promise.resolve(null),
  setItem: () => Promise.resolve(true),
  removeItem: () => Promise.resolve(true),
  clear: () => Promise.resolve(true),
  getAllKeys: () => Promise.resolve([]),
  multiGet: () => Promise.resolve([]),
  multiSet: () => Promise.resolve(true),
  multiRemove: () => Promise.resolve(true)
};

export default AsyncStorage;