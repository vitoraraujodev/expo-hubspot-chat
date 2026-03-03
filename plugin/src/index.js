/** @typedef {import('@expo/config-plugins').ConfigPlugin} ConfigPlugin */
/** @typedef {import('@expo/config-plugins').ExportedConfig} ExportedConfig */

/**
 * @typedef {Object} HubspotChatPluginProps
 * @property {string} portalId - HubSpot portal ID (required)
 * @property {string} hublet - HubSpot hublet region identifier, e.g. "na1", "eu1" (required)
 * @property {'production' | 'qa'} [environment] - HubSpot environment. Defaults to "production".
 * @property {string} [defaultChatFlow] - Default chat flow identifier
 */

const {
  withDangerousMod,
  withAndroidManifest,
  withAppBuildGradle,
  withXcodeProject,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// --- Android ---

/**
 * @param {ExportedConfig} config
 * @param {HubspotChatPluginProps} props
 */
function withHubspotAndroid(config, props) {
  config = withHubspotAndroidAssets(config, props);
  config = withHubspotAndroidManifest(config);
  config = withHubspotAndroidPackaging(config);
  return config;
}

/**
 * @param {ExportedConfig} config
 * @param {HubspotChatPluginProps} props
 */
function withHubspotAndroidAssets(config, props) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const assetsDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets',
      );

      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      const hubspotConfig = {
        portalId: props.portalId,
        hublet: props.hublet,
        environment: props.environment || 'production',
        ...(props.defaultChatFlow && {
          defaultChatFlow: props.defaultChatFlow,
        }),
      };

      fs.writeFileSync(
        path.join(assetsDir, 'hubspot-info.json'),
        JSON.stringify(hubspotConfig, null, 2),
      );

      return config;
    },
  ]);
}

/** @param {ExportedConfig} config */
function withHubspotAndroidManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest.$) {
      manifest.$ = {};
    }
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const mainApplication = manifest.application?.[0];

    if (!mainApplication) return config;

    if (!mainApplication.activity) {
      mainApplication.activity = [];
    }

    const hubspotActivityExists = mainApplication.activity.some(
      (activity) =>
        activity.$?.['android:name'] ===
        'com.hubspot.mobilesdk.HubspotWebActivity',
    );

    if (!hubspotActivityExists) {
      mainApplication.activity.push({
        $: {
          'android:name': 'com.hubspot.mobilesdk.HubspotWebActivity',
          'android:theme': '@style/Theme.AppCompat.Light.NoActionBar',
          'android:exported': 'false',
          'tools:replace': 'android:exported',
        },
      });
    }

    if (!mainApplication.service) {
      mainApplication.service = [];
    }

    const messagingServiceExists = mainApplication.service.some(
      (service) =>
        service.$?.['android:name'] ===
        'expo.modules.hubspotchat.HubspotChatMessagingService',
    );

    if (!messagingServiceExists) {
      mainApplication.service.push({
        $: {
          'android:name':
            'expo.modules.hubspotchat.HubspotChatMessagingService',
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'com.google.firebase.MESSAGING_EVENT',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
}

/** @param {ExportedConfig} config */
function withHubspotAndroidPackaging(config) {
  return withAppBuildGradle(config, (config) => {
    const packaging = `
    packaging {
        resources {
            excludes += [
                'META-INF/versions/9/OSGI-INF/MANIFEST.MF',
                'META-INF/DEPENDENCIES',
                'META-INF/LICENSE',
                'META-INF/LICENSE.txt',
                'META-INF/license.txt',
                'META-INF/NOTICE',
                'META-INF/NOTICE.txt',
                'META-INF/notice.txt',
                'META-INF/ASL2.0',
                'META-INF/*.kotlin_module'
            ]
        }
    }`;

    if (
      config.modResults.contents.includes(
        "excludes += ['META-INF/versions/9/OSGI-INF/MANIFEST.MF'",
      )
    ) {
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /android\s*\{/,
      `android {${packaging}`,
    );

    return config;
  });
}

// --- iOS ---

/**
 * @param {ExportedConfig} config
 * @param {HubspotChatPluginProps} props
 */
function withHubspotIos(config, props) {
  config = withHubspotIosPlist(config, props);
  config = withHubspotIosPlistResource(config);
  return config;
}

/**
 * @param {ExportedConfig} config
 * @param {HubspotChatPluginProps} props
 */
function withHubspotIosPlist(config, props) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosDir = config.modRequest.platformProjectRoot;

      const defaultChatFlowEntry = props.defaultChatFlow
        ? `\n  <key>defaultChatFlow</key>\n  <string>${props.defaultChatFlow}</string>`
        : '';

      const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>portalId</key>
  <string>${props.portalId}</string>
  <key>hublet</key>
  <string>${props.hublet}</string>
  <key>environment</key>
  <string>${props.environment || 'production'}</string>${defaultChatFlowEntry}
</dict>
</plist>`;

      fs.writeFileSync(path.join(iosDir, 'Hubspot-Info.plist'), plistContent);

      return config;
    },
  ]);
}

/** @param {ExportedConfig} config */
function withHubspotIosPlistResource(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const appName = config.modRequest.projectName || config.name;
    const plistPath = 'Hubspot-Info.plist';
    const group =
      xcodeProject.findPBXGroupKey({ name: appName }) ||
      xcodeProject.findPBXGroupKey({ path: appName });

    if (group) {
      const existingFile = xcodeProject.hasFile(plistPath);
      if (!existingFile) {
        xcodeProject.addResourceFile(
          plistPath,
          { target: xcodeProject.getFirstTarget().uuid },
          group,
        );
      }
    }

    return config;
  });
}

// --- Main Plugin ---

/** @type {ConfigPlugin<HubspotChatPluginProps>} */
const withHubspotChat = (config, props = {}) => {
  if (!props.portalId) {
    throw new Error(
      '[expo-hubspot-chat] "portalId" is required in plugin configuration.',
    );
  }

  if (!props.hublet) {
    throw new Error(
      '[expo-hubspot-chat] "hublet" is required in plugin configuration.',
    );
  }

  if (
    props.environment &&
    props.environment !== 'production' &&
    props.environment !== 'qa'
  ) {
    console.warn(
      `[expo-hubspot-chat] Invalid environment "${props.environment}". Expected "production" or "qa". Defaulting to "production".`,
    );
  }

  config = withHubspotAndroid(config, props);
  config = withHubspotIos(config, props);

  return config;
};

module.exports = withHubspotChat;
