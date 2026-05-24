// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// @supabase/supabase-js >=2.106 ships an ESM build (index.mjs) that contains a
// dynamic import() for optional OpenTelemetry support.  Hermes cannot compile
// dynamic import expressions, so we redirect the import to the CJS build which
// uses require() instead.
const supabaseCjs = path.resolve(
  __dirname,
  "node_modules/@supabase/supabase-js/dist/index.cjs"
);

config.resolver = config.resolver ?? {};
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@supabase/supabase-js") {
    return { type: "sourceFile", filePath: supabaseCjs };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
