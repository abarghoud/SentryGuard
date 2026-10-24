import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet } from 'react-native';

import { readAppVersion } from '../../core/app-version';
import { TextVariant } from '../../core/design/typography';
import { useThemeColors } from '../../core/theme';
import { AppText, CenteredPane } from '../../core/ui';

const appIcon = require('../../../assets/icon.png');

export function AboutSentryGuardView(): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const appVersion = readAppVersion();

  return (
    <CenteredPane>
      <Image accessibilityIgnoresInvertColors source={appIcon} style={styles.icon} />
      <AppText variant={TextVariant.LargeTitle}>SentryGuard</AppText>
      {appVersion ? (
        <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
          {t('settings.version', { version: appVersion })}
        </AppText>
      ) : null}
      <AppText variant={TextVariant.Body} color={colors.secondaryLabel} style={styles.description}>
        {t('supporters.subtitle')}
      </AppText>
    </CenteredPane>
  );
}

const styles = StyleSheet.create({
  description: {
    textAlign: 'center',
  },
  icon: {
    borderRadius: 22,
    height: 96,
    width: 96,
  },
});
