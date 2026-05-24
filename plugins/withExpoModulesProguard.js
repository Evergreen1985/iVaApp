const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// expo-modules-core proguard rules don't protect LazyKType, so R8 strips it
// in release builds, causing a ClassNotFoundException crash on startup.
const withExpoModulesProguard = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      const rule = '\n# Keep expo-modules-core kotlin type helpers (prevents ClassNotFoundException)\n-keep class expo.modules.kotlin.types.** { *; }\n';
      if (fs.existsSync(proguardPath)) {
        const existing = fs.readFileSync(proguardPath, 'utf8');
        if (!existing.includes('expo.modules.kotlin.types')) {
          fs.appendFileSync(proguardPath, rule);
        }
      }
      return config;
    },
  ]);
};

module.exports = withExpoModulesProguard;
