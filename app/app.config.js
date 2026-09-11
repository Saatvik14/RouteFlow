try {
  require('dotenv').config();
} catch {}

module.exports = ({ config }) => {
  const androidKey =
    process.env.GOOGLE_MAPS_ANDROID_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';
  const iosKey =
    process.env.GOOGLE_MAPS_IOS_API_KEY ||
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';

  // Dynamically inject react-native-maps plugin with the API key
  // so the key is written into AndroidManifest.xml at build time.
  const existingPlugins = config.plugins || [];
  const plugins = [...existingPlugins];

  if (androidKey) {
    plugins.push([
      'react-native-maps',
      {
        androidGoogleMapsApiKey: androidKey,
        ...(iosKey ? { iosGoogleMapsApiKey: iosKey } : {}),
      },
    ]);
  }

  return {
    ...config,
    plugins,
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios?.bundleIdentifier || 'com.vvdevill.app',
      ...(iosKey
        ? {
            config: {
              ...(config.ios?.config || {}),
              googleMapsApiKey: iosKey,
            },
          }
        : {}),
    },
    android: {
      ...config.android,
      ...(androidKey
        ? {
            config: {
              ...(config.android?.config || {}),
              googleMaps: {
                ...(config.android?.config?.googleMaps || {}),
                apiKey: androidKey,
              },
            },
          }
        : {}),
    },
    extra: {
      ...(config.extra || {}),
      googleMapsAndroidConfigured: Boolean(androidKey),
      googleMapsIosConfigured: Boolean(iosKey),
    },
  };
};
