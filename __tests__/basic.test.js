/**
 * Basic Jest test to ensure test runner works
 */

describe('Basic Test Suite', () => {
  test('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should handle async operations', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  test('should work with mocked AsyncStorage', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.setItem('test', 'value');
    const value = await AsyncStorage.getItem('test');
    expect(value).toBeNull(); // Mocked to return null
  });
});