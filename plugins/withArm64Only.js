const { withGradleProperties } = require('@expo/config-plugins');

// Build only the arm64-v8a ABI so the release APK stays small enough to host on
// the install page (Supabase 50 MB limit). Covers all modern Android phones;
// only very old 32-bit (armeabi-v7a) devices are excluded.
module.exports = function withArm64Only(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults;
    const idx = props.findIndex(
      (p) => p.type === 'property' && p.key === 'reactNativeArchitectures'
    );
    if (idx >= 0) {
      props[idx].value = 'arm64-v8a';
    } else {
      props.push({ type: 'property', key: 'reactNativeArchitectures', value: 'arm64-v8a' });
    }
    return config;
  });
};
