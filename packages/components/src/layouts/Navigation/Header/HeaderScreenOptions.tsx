import type { ReactNode } from 'react';

import { getFontSize } from '@onekeyhq/components/src/shared/tamagui';
import type { VariableVal } from '@onekeyhq/components/src/shared/tamagui';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import {
  hasNativeHeaderView,
  useCustomHeaderViewOnIOS,
} from '../Navigator/CommonConfig';

import HeaderBackButton from './HeaderBackButton';
import HeaderView from './HeaderView';

import type {
  IStackHeaderProps,
  IStackNavigationOptions,
} from '../ScreenProps';
import type { HeaderBackButtonProps } from '@react-navigation/elements';

export type IOnekeyStackHeaderProps = {
  navigation?: IStackHeaderProps['navigation'];
  isModelScreen?: boolean;
  isRootScreen?: boolean;
  isFlowModelScreen?: boolean;
  isOnboardingScreen?: boolean;
};

export function makeHeaderScreenOptions({
  navigation: currentNavigation,
  isModelScreen = false,
  isRootScreen = false,
  isOnboardingScreen = false,
  bgColor,
  titleColor,
}: IOnekeyStackHeaderProps & {
  bgColor: VariableVal;
  titleColor: VariableVal;
}): IStackNavigationOptions {
  // Keep the native iOS header for pushed pages so system Liquid Glass and
  // native search/header behaviors continue to work.
  if (hasNativeHeaderView && !useCustomHeaderViewOnIOS) {
    const state = currentNavigation?.getState();
    const isCanGoBack = (state?.index ?? 0) > 0;
    const shouldUseCustomHeaderLeft =
      (isModelScreen || isOnboardingScreen) && !isRootScreen && !isCanGoBack;

    return {
      ...(platformEnv.isNativeIOS
        ? undefined
        : {
            headerStyle: {
              backgroundColor: bgColor as string,
            },
          }),
      ...(platformEnv.isNativeIOS
        ? {
            scrollEdgeEffects: {
              top: 'automatic',
            },
          }
        : undefined),
      headerTitleStyle: {
        fontSize: getFontSize('$headingLg'),
        color: titleColor as string,
      },
      headerShadowVisible: false,
      /* Although the default value of `headerTransparent` is `false` too, 
         we still cannot remove it here.
         because RNSSearchBar seems will read an incorrect default value.
      */
      ...(platformEnv.isNativeIOS
        ? undefined
        : {
            headerTransparent: false,
          }),
      headerTitleAlign: 'left',
      ...(shouldUseCustomHeaderLeft
        ? {
            headerLeft: (props: HeaderBackButtonProps): ReactNode => (
              <HeaderBackButton
                onPress={currentNavigation?.goBack}
                isModelScreen={isModelScreen}
                isRootScreen={isRootScreen}
                isOnboardingScreen={isOnboardingScreen}
                {...props}
                canGoBack={isCanGoBack}
              />
            ),
          }
        : undefined),
    };
  }

  return {
    headerTitleAlign: 'left',
    header: ({ back: headerBack, options, route, navigation }: any) => (
      <HeaderView
        back={headerBack}
        options={options}
        route={route}
        navigation={navigation}
        isModelScreen={isModelScreen}
        isRootScreen={isRootScreen}
        isOnboardingScreen={isOnboardingScreen}
      />
    ),
  };
}
