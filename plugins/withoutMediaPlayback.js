const { withAndroidManifest } = require('@expo/config-plugins');

// expo-audio ships a media-playback foreground service, the
// FOREGROUND_SERVICE_MEDIA_PLAYBACK permission, and RECORD_AUDIO by default.
// This app only PLAYS audio while it is in the foreground (no background/
// lock-screen playback) and never records, so none of those are needed — and
// FOREGROUND_SERVICE_MEDIA_PLAYBACK requires a special Google Play declaration.
// This plugin strips them from the merged manifest via tools:node="remove"
// (needed because the expo-audio library manifest would otherwise re-add them
// during the Gradle manifest merge).
const REMOVE_PERMS = [
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.RECORD_AUDIO',
  // expo-image-picker auto-adds this, but launchImageLibraryAsync uses the
  // Android Photo Picker (no permission needed). Removing it avoids Google's
  // restricted photo/video permission declaration.
  'android.permission.READ_MEDIA_IMAGES',
];
const SERVICE = 'expo.modules.audio.service.AudioControlsService';

module.exports = function withoutMediaPlayback(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest.$ = manifest.$ || {};
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Strip each permission, then re-add it with tools:node="remove"
    manifest['uses-permission'] = (manifest['uses-permission'] || []).filter(
      (p) => !(p.$ && REMOVE_PERMS.includes(p.$['android:name']))
    );
    for (const name of REMOVE_PERMS) {
      manifest['uses-permission'].push({
        $: { 'android:name': name, 'tools:node': 'remove' },
      });
    }

    // Strip the media-playback service, then re-add it with tools:node="remove"
    const app = manifest.application && manifest.application[0];
    if (app) {
      app.service = (app.service || []).filter(
        (s) => !(s.$ && s.$['android:name'] === SERVICE)
      );
      app.service.push({
        $: { 'android:name': SERVICE, 'tools:node': 'remove' },
      });
    }

    return config;
  });
};
