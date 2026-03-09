import { DefaultTheme } from '@react-navigation/native';

import platformEnv from '@onekeyhq/shared/src/platformEnv';

export const hasNativeHeaderView = platformEnv.isNativeIOS;
// Keep the native iOS navigation header so iOS 26 can render the system
// Liquid Glass appearance and native header behaviors for pushed pages.
export const useCustomHeaderViewOnIOS = false;

export const hasStackNavigatorModal =
  platformEnv.isNativeIOS || platformEnv.isNativeAndroid;

export const TransparentModalTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: hasNativeHeaderView
      ? DefaultTheme.colors.background
      : 'transparent',
    card: hasNativeHeaderView ? DefaultTheme.colors.card : 'transparent',
  },
};
