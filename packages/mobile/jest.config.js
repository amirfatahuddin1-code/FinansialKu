module.exports = {
  preset: 'jest-expo',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|@expo-google-fonts|react-native-reanimated|react-native-safe-area-context|react-native-screens|react-native-gifted-charts|react-native-svg|@react-navigation|@react-native-async-storage|react-native-web|@unimodules|react-native-purchases|react-native-google-mobile-ads|react-native-google-signin|@react-native-google-signin|react-native-worklets|expo-router|expo-modules-core|native-base|@miblanchet)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
