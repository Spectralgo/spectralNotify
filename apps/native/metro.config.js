// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = withNativeWind(getDefaultConfig(projectRoot), {
  input: "./global.css",
  configPath: "./tailwind.config.js",
});

// Configure monorepo support
// Only watch specific packages to prevent infinite refresh loops
config.watchFolders = [
  path.resolve(workspaceRoot, "packages/react-native"),
  path.resolve(workspaceRoot, "packages/client"),
];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
