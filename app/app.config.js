module.exports = ({ config }) => {
  const androidKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY || '';
  const iosKey = process.env.GOOGLE_MAPS_IOS_API_KEY || '';

  return {
    ...config,
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
