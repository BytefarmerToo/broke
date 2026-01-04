const { withAndroidManifest } = require('@expo/config-plugins');

function withAppBlockerManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    if (!application.service) {
      application.service = [];
    }

    // Check if service already exists
    const serviceExists = application.service.some(
      (s) => s.$['android:name'] === 'expo.modules.appblocker.AppBlockerService'
    );

    if (!serviceExists) {
      application.service.push({
        $: {
          'android:name': 'expo.modules.appblocker.AppBlockerService',
          'android:label': '@string/app_name',
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.accessibilityservice.AccessibilityService',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.accessibilityservice',
              'android:resource': '@xml/accessibility_service_config',
            },
          },
        ],
      });
    }

    // Add QUERY_ALL_PACKAGES permission if not present
    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }

    const hasQueryPermission = manifest.manifest['uses-permission'].some(
      (p) => p.$['android:name'] === 'android.permission.QUERY_ALL_PACKAGES'
    );

    if (!hasQueryPermission) {
      manifest.manifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.QUERY_ALL_PACKAGES' },
      });
    }

    return config;
  });
}

module.exports = function withAppBlocker(config) {
  return withAppBlockerManifest(config);
};
