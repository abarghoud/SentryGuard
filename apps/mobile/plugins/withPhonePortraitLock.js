const { AndroidConfig, withAndroidManifest, withMainActivity } = require('expo/config-plugins');

const TABLET_SMALLEST_WIDTH_DP = 600;

const IMPORTS = ['import android.content.pm.ActivityInfo', 'import android.content.res.Configuration'].join('\n');

const LOCK_ON_CREATE = '    applyPhonePortraitLock(resources.configuration)';

const LOCK_METHODS = [
  '',
  '  override fun onConfigurationChanged(newConfig: Configuration) {',
  '    super.onConfigurationChanged(newConfig)',
  '    applyPhonePortraitLock(newConfig)',
  '  }',
  '',
  '  private fun applyPhonePortraitLock(configuration: Configuration) {',
  `    requestedOrientation = if (configuration.smallestScreenWidthDp < ${TABLET_SMALLEST_WIDTH_DP}) {`,
  '      ActivityInfo.SCREEN_ORIENTATION_PORTRAIT',
  '    } else {',
  '      ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED',
  '    }',
  '  }',
].join('\n');

function insertOnce(source, block, anchor, offset) {
  if (source.includes(block)) {
    return source;
  }
  const lines = source.split('\n');
  const anchorIndex = lines.findIndex((line) => anchor.test(line));
  if (anchorIndex < 0) {
    throw new Error(`withPhonePortraitLock: ${anchor} not found in MainActivity`);
  }
  lines.splice(anchorIndex + offset, 0, block);
  return lines.join('\n');
}

function addOrientationLockToMainActivity(config) {
  return withMainActivity(config, (cfg) => {
    let contents = cfg.modResults.contents;
    contents = insertOnce(contents, IMPORTS, /^import android\.os\.Bundle$/, 1);
    contents = insertOnce(contents, LOCK_ON_CREATE, /super\.onCreate\(/, 0);
    contents = insertOnce(contents, LOCK_METHODS, /super\.onCreate\(/, 2);
    cfg.modResults.contents = contents;
    return cfg;
  });
}

function removeManifestOrientation(config) {
  return withAndroidManifest(config, (cfg) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    delete mainActivity.$['android:screenOrientation'];
    return cfg;
  });
}

module.exports = function withPhonePortraitLock(config) {
  config = removeManifestOrientation(config);
  config = addOrientationLockToMainActivity(config);
  return config;
};
