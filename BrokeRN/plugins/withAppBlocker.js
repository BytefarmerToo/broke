const { withAndroidManifest, withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withAppBlockerManifest(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;

    // Add the accessibility service to the application
    const application = manifest.manifest.application[0];

    if (!application.service) {
      application.service = [];
    }

    // Check if service already exists
    const serviceExists = application.service.some(
      (s) => s.$['android:name'] === '.appblocker.AppBlockerService'
    );

    if (!serviceExists) {
      application.service.push({
        $: {
          'android:name': '.appblocker.AppBlockerService',
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

    return config;
  });
}

function withAppBlockerMainApplication(config) {
  return withMainApplication(config, async (config) => {
    let content = config.modResults.contents;

    // Add import for AppBlockerPackage
    const importStatement = 'import com.broke.app.appblocker.AppBlockerPackage;';
    if (!content.includes(importStatement)) {
      // Find the last import statement and add after it
      const importRegex = /(import .+;)\n(?!import)/;
      content = content.replace(importRegex, `$1\n${importStatement}\n`);
    }

    // Add package to getPackages list
    const packageStatement = 'packages.add(new AppBlockerPackage());';
    if (!content.includes(packageStatement)) {
      // Find the getPackages method and add the package
      const getPackagesRegex = /(List<ReactPackage> packages = new PackageList\(this\)\.getPackages\(\);)/;
      if (content.match(getPackagesRegex)) {
        content = content.replace(
          getPackagesRegex,
          `$1\n        ${packageStatement}`
        );
      }
    }

    config.modResults.contents = content;
    return config;
  });
}

function withAppBlockerResources(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const xmlDir = path.join(
        projectRoot,
        'android/app/src/main/res/xml'
      );

      // Ensure the xml directory exists
      if (!fs.existsSync(xmlDir)) {
        fs.mkdirSync(xmlDir, { recursive: true });
      }

      // Copy accessibility service config if it doesn't exist in the build
      const configPath = path.join(xmlDir, 'accessibility_service_config.xml');
      if (!fs.existsSync(configPath)) {
        const configContent = `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagIncludeNotImportantViews"
    android:canRetrieveWindowContent="false"
    android:description="@string/accessibility_service_description"
    android:notificationTimeout="100" />`;
        fs.writeFileSync(configPath, configContent);
      }

      return config;
    },
  ]);
}

module.exports = function withAppBlocker(config) {
  config = withAppBlockerManifest(config);
  config = withAppBlockerMainApplication(config);
  config = withAppBlockerResources(config);
  return config;
};
