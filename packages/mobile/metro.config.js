// Learn more https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const sharedPkg = path.resolve(monorepoRoot, 'packages', 'shared');

// Set EXPO_ROUTER_APP_ROOT for expo-router
process.env.EXPO_ROUTER_APP_ROOT = path.resolve(projectRoot, 'app');

const config = getDefaultConfig(projectRoot);

// 1. Watch shared package and hoisted node_modules
config.watchFolders = [
  sharedPkg,
  path.resolve(monorepoRoot, 'node_modules'),
];

// 2. Resolve packages: mobile first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Block the web package to prevent any conflicts
config.resolver.blockList = [
  /packages[\/\\]web[\/\\].*/,
];

// 4. Disable package exports resolution
config.resolver.unstable_enablePackageExports = false;

// 5. Custom resolver to handle explicit .js extensions in relative imports
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.js') && (moduleName.startsWith('./') || moduleName.startsWith('../'))) {
    const stripped = moduleName.slice(0, -3);
    try {
      return context.resolveRequest(context, stripped, platform);
    } catch (err) {
      // Fallback if stripping fails
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
