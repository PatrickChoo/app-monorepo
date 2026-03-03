import type { ReactNode } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import * as React from 'react';

import { Header } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMedia } from '@onekeyhq/components/src/hooks/useStyle';
import { useTheme } from '@onekeyhq/components/src/shared/tamagui';

import { BlurView } from '../../../content';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { useIsOverlayPage } from '../../../hocs';
import { useIsDesktopModeUIInTabPages } from '../../../hooks';
import { Stack, XStack } from '../../../primitives';
import { WINDOWS_OVERLAY_BUTTONS_WIDTH } from '../../../utils/sidebar';
import { DesktopDragZoneBox } from '../../DesktopDragZoneBox';

import HeaderBackButton from './HeaderBackButton';
import HeaderSearchBar from './HeaderSearchBar';

import type { IOnekeyStackHeaderProps } from './HeaderScreenOptions';
import type { IDesktopDragZoneBoxProps } from '../../DesktopDragZoneBox';
import type { IStackHeaderProps } from '../ScreenProps';
import type {
  HeaderBackButtonProps,
  HeaderOptions,
  Layout,
} from '@react-navigation/elements';

function getHeaderTitle(
  options: { title?: string; headerTitle?: HeaderOptions['headerTitle'] },
  fallback: string,
): string {
  // eslint-disable-next-line no-nested-ternary
  return typeof options?.headerTitle === 'string'
    ? options?.headerTitle
    : options?.title !== undefined
      ? options?.title
      : fallback;
}

const DesktopDragZoneBoxView = platformEnv.isDesktopWithCustomTitleBar
  ? ({ disabled, children }: IDesktopDragZoneBoxProps) => {
      const isModalPage = useIsOverlayPage();

      const [isFocus, setIsFocus] = useState(false);

      const handlePageEffect = useCallback(() => {
        setIsFocus(true);
        return () => {
          setIsFocus(false);
        };
      }, []);

      useFocusEffect(handlePageEffect);

      return (
        <DesktopDragZoneBox disabled={disabled || !isFocus || isModalPage}>
          {children}
        </DesktopDragZoneBox>
      );
    }
  : DesktopDragZoneBox;

const useHeaderHeight = platformEnv.isNativeIOS
  ? () => 52
  : () => {
      const { top } = useSafeAreaInsets();
      return useMemo(() => 52 + top, [top]);
    };

function HeaderView({
  back: headerBack,
  options,
  route,
  navigation,
  isModelScreen = false,
  isRootScreen = false,
  isOnboardingScreen = false,
}: IStackHeaderProps & IOnekeyStackHeaderProps) {
  const {
    headerLeft,
    headerRight,
    headerTitle,
    headerTitleAlign,
    headerTransparent = false,
    headerStyle,
    headerBackground,
    headerShown = true,
    headerRightContainerStyle = {},
    headerTitleContainerStyle = {},
    // native HeaderSearchBar in packages/components/src/layouts/Page/PageHeader.tsx
    headerSearchBarOptions,
    headerTitleStyle,
  } = options || {};
  const theme = useTheme();
  const state = navigation?.getState();
  const canGoBack = headerBack !== undefined;
  const topStack = (state?.index ?? 0) === 0;

  const onBackCallback = useCallback(() => {
    if (canGoBack) {
      navigation?.goBack?.();
    } else {
      navigation?.getParent()?.goBack?.();
    }
  }, [canGoBack, navigation]);

  const headerLeftView = useCallback(
    ({
      canGoBack: canGoBackNative,
      onPress,
      ...props
    }: HeaderBackButtonProps & { canGoBack: boolean }): ReactNode => {
      const headerBackButton = (
        <HeaderBackButton
          canGoBack={!topStack}
          onPress={onBackCallback}
          isRootScreen={isRootScreen}
          isModelScreen={isModelScreen}
          isOnboardingScreen={isOnboardingScreen}
          renderLeft={headerLeft}
          {...props}
        />
      );

      return headerBackButton ? (
        <XStack className="app-region-no-drag">{headerBackButton}</XStack>
      ) : null;
    },
    [
      topStack,
      onBackCallback,
      isRootScreen,
      isModelScreen,
      isOnboardingScreen,
      headerLeft,
    ],
  );
  const headerHeight = useHeaderHeight();
  const { gtMd } = useMedia();

  const isGtMd = gtMd && !platformEnv.isNativeAndroid;
  const layout = useMemo(() => {
    if (platformEnv.isNative) {
      return undefined;
    }
    if (isModelScreen) {
      return isGtMd
        ? ({ width: 640 } as Layout)
        : ({ width: window.innerWidth } as Layout);
    }
    return undefined;
  }, [isGtMd, isModelScreen]);

  const isDesktopModeUI = useIsDesktopModeUIInTabPages();
  const headerBackgroundColor = useMemo(() => {
    if (headerTransparent) {
      return 'transparent';
    }
    if (platformEnv.isWebDappMode) {
      return '$bgApp';
    }
    return isDesktopModeUI ? '$bgSubdued' : '$bgApp';
  }, [headerTransparent, isDesktopModeUI]);

  const routeName = route.name;
  const title = useMemo(
    () => getHeaderTitle(options, routeName),
    [routeName, options],
  );
  const enableLiquidGlassHeader =
    !headerTransparent && (platformEnv.isNativeIOS || platformEnv.isDesktop);
  const liquidGlassOverlayOpacity = useMemo(
    () => (platformEnv.isDesktop ? 0.64 : 0.56),
    [],
  );
  const headerViewKey = useMemo(
    () => `${title}-${routeName}`,
    [title, routeName],
  );
  if (!headerShown) {
    return null;
  }

  return (
    <DesktopDragZoneBoxView disabled={isModelScreen}>
      <Stack
        alignItems="center"
        bg={enableLiquidGlassHeader ? 'transparent' : headerBackgroundColor}
        pt={isOnboardingScreen ? '$10' : undefined}
        style={
          headerTransparent && !platformEnv.isNativeAndroid
            ? { position: 'absolute', right: 0, left: 0 }
            : {}
        }
        pointerEvents="box-none"
        {...(!isModelScreen && {
          $gtMd: platformEnv.isNativeAndroid
            ? undefined
            : {
                flexDirection: 'row',
              },
        })}
      >
        {enableLiquidGlassHeader ? (
          <Stack fullscreen pointerEvents="none">
            <BlurView intensity={60} contentStyle={{ flex: 1 }} />
            <Stack fullscreen bg="$bgApp" opacity={liquidGlassOverlayOpacity} />
            <Stack
              position="absolute"
              left={0}
              right={0}
              top={0}
              h={StyleSheet.hairlineWidth}
              bg="$borderSubdued"
              opacity={0.35}
            />
            <Stack
              position="absolute"
              left={0}
              right={0}
              bottom={0}
              h="$px"
              bg="$borderSubdued"
              opacity={0.82}
            />
          </Stack>
        ) : null}
        <Stack
          alignSelf="stretch"
          px={isOnboardingScreen ? '$16' : '$5'}
          pr={
            (platformEnv.isDesktopWin || platformEnv.isDesktopLinux) &&
            !isOnboardingScreen &&
            !isModelScreen
              ? WINDOWS_OVERLAY_BUTTONS_WIDTH
              : undefined
          }
          $gtMd={
            platformEnv.isNativeAndroid
              ? undefined
              : {
                  flex: 1,
                }
          }
        >
          <Header
            layout={layout}
            title={title}
            key={headerViewKey}
            headerTintColor={theme.text.val}
            headerLeft={headerLeftView as any}
            headerRightContainerStyle={
              isOnboardingScreen ? { flexGrow: 0 } : headerRightContainerStyle
            }
            headerTitleAllowFontScaling={false}
            headerRight={
              typeof headerRight === 'function'
                ? ({ tintColor }) => {
                    const ele = headerRight({ tintColor, canGoBack });
                    return ele;
                  }
                : (headerRight as any)
            }
            headerTitle={
              typeof headerTitle === 'function'
                ? ({ children, tintColor }) =>
                    headerTitle({ children, tintColor })
                : headerTitle
            }
            headerTitleAlign={headerTitleAlign}
            headerTitleStyle={{
              lineHeight: 28,
              fontWeight: '600',
              color: theme.text.val,
              ...(headerTitleStyle as any),
            }}
            headerTitleContainerStyle={{
              marginHorizontal: 0,
              ...(headerTitleContainerStyle as any),
              ...(isOnboardingScreen
                ? { flex: 1, alignItems: 'center' }
                : undefined),
            }}
            headerTransparent
            headerBackground={headerBackground}
            headerStyle={[
              {
                height: headerHeight,
              },
              headerStyle,
            ]}
          />
        </Stack>
        {headerSearchBarOptions ? (
          <XStack className="app-region-no-drag" zIndex={1}>
            <HeaderSearchBar
              autoFocus={headerSearchBarOptions?.autoFocus}
              placeholder={headerSearchBarOptions?.placeholder}
              onChangeText={headerSearchBarOptions?.onChangeText}
              onSearchTextChange={headerSearchBarOptions?.onSearchTextChange}
              onBlur={headerSearchBarOptions?.onBlur}
              onFocus={headerSearchBarOptions?.onFocus}
              onSearchButtonPress={headerSearchBarOptions?.onSearchButtonPress}
              isModalScreen={isModelScreen}
              addOns={headerSearchBarOptions?.addOns}
              searchBarInputValue={headerSearchBarOptions?.searchBarInputValue}
            />
          </XStack>
        ) : null}
      </Stack>
    </DesktopDragZoneBoxView>
  );
}

export default memo(HeaderView);

export { NavBackButton, NavCloseButton } from './HeaderBackButton';
