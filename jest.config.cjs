module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.jsx',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|@react-navigation|@react-native-community)/)/',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    '/node_modules/', 
    '/android/', 
    '/ios/',
    '/__tests__/testsprite-runner.js',
    '/__tests__/frontend/',
    '/__tests__/api/',
    '/__tests__/auth/',
    '/__tests__/reports/',
    '/__tests__/mocks/',
    '/__tests__/utils/',
    '/__tests__/testsprite.config.js',
    '/__tests__/TestSprite.js'
  ],
  moduleNameMapper: {
    '\.svg': '<rootDir>/__mocks__/svgMock.js',
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  transform: {
    '^.+\.(js|jsx|ts|tsx)$': ['babel-jest', { 
      presets: ['babel-preset-expo'],
      plugins: ['@babel/plugin-transform-react-jsx']
    }]
  },
  testEnvironment: 'node'
};
