const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const RESOURCE_NAME = 'notification_large_icon';
const META_DATA_NAME = 'expo.modules.notifications.large_notification_icon';

function addManifestMetaData(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      META_DATA_NAME,
      `@drawable/${RESOURCE_NAME}`,
      'resource'
    );
    return cfg;
  });
}

function copyDrawable(config, source) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const sourcePath = path.resolve(cfg.modRequest.projectRoot, source);
      const resDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/res/drawable-xxxhdpi'
      );
      fs.mkdirSync(resDir, { recursive: true });
      fs.copyFileSync(sourcePath, path.join(resDir, `${RESOURCE_NAME}.png`));
      return cfg;
    },
  ]);
}

module.exports = function withLargeNotificationIcon(config, props) {
  const source = (props && props.image) || './assets/notification-large-icon.png';
  config = addManifestMetaData(config);
  config = copyDrawable(config, source);
  return config;
};
