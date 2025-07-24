module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-native'],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/prop-types': 'off', // Since we're using TypeScript
    'react-native/no-inline-styles': 'off', // Allow inline styles for now
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off', // Allow any for now
    'react-native/sort-styles': 'off', // Don't enforce style property order
    '@typescript-eslint/no-unused-vars': 'off', // Temporarily disable unused vars warning
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'no-unused-vars': 'off', // Temporarily disable unused vars warning
    'react-native/no-color-literals': 'off', // Allow color literals for now
    'react-native/no-raw-text': 'off', // Allow raw text
    'quotes': 'off',
    'semi': 'off',
    'no-trailing-spaces': 'off',
    'react-native/no-unused-styles': 'off', // Temporarily disable unused styles warning
    'no-useless-escape': 'off', // Temporarily disable escape warning
    'react-native/no-single-element-style-arrays': 'off', // Temporarily disable style array warning
    'react-native/no-inline-color': 'off' // Temporarily disable inline color warning
  },
  env: {
    'react-native/react-native': true,
  },
};
