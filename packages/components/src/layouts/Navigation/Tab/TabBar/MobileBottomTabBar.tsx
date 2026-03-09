import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { StyleSheet, View } from 'react-native';
import { useThrottledCallback } from 'use-debounce';

import { LiquidGlassSurface } from '@onekeyhq/components/src/content';
import {
  isNativeTablet,
  useSafeAreaInsets,
} from '@onekeyhq/components/src/hooks';
import { Stack } from '@onekeyhq/components/src/primitives';
import type { IKeyOfIcons } from '@onekeyhq/components/src/primitives';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';
import { defaultLogger } from '@onekeyhq/shared/src/logger/logger';
import { EEnterWay } from '@onekeyhq/shared/src/logger/scopes/dex';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { ETabRoutes } from '@onekeyhq/shared/src/routes/tab';
import { ESwapSource } from '@onekeyhq/shared/types/swap/types';

import { switchTab } from '../../Navigator/NavigationContainer';

import { MobileTabItem } from './MobileTabItem';

import type { ITabNavigatorExtraConfig } from '../../Navigator/types';
import type {
  BottomTabBarProps,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';

export type IMobileBottomTabBarProps = BottomTabBarProps & {
  backgroundColor?: string;
  trackId?: string;
};

export default function MobileBottomTabBar({
  navigation,
  state,
  descriptors,
  extraConfig,
}: IMobileBottomTabBarProps & {
  webPageTabBar: ReactElement;
  bottomMenu: ReactElement;
  extraConfig?: ITabNavigatorExtraConfig<string>;
}) {
  const { routes } = state;
  const { bottom } = useSafeAreaInsets();
  const isTablet = isNativeTablet();
  const activeRouteName = routes[state.index]?.name;
  const [optimisticFocusedRouteName, setOptimisticFocusedRouteName] =
    useState(activeRouteName);

  useEffect(() => {
    setOptimisticFocusedRouteName(activeRouteName);
  }, [activeRouteName]);

  const onTabPress = useCallback(
    (
      route: RouteProp<Record<string, object | undefined>, string>,
      isActive: boolean,
      options: BottomTabNavigationOptions,
    ) => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (isTablet) {
        appEventBus.emit(EAppEventBusNames.SwitchTabBar, {
          route: route.name as ETabRoutes,
        });
      }
      if (route.name === 'Swap') {
        defaultLogger.swap.enterSwap.enterSwap({
          enterFrom: ESwapSource.TAB,
        });
      }

      if (event.defaultPrevented || isActive) {
        setOptimisticFocusedRouteName(activeRouteName);
      }

      if (!isActive && !event.defaultPrevented) {
        switchTab(route.name as ETabRoutes);
        if (route.name === ETabRoutes.Market) {
          appEventBus.emit(EAppEventBusNames.MarketHomePageEnter, {
            from: EEnterWay.HomeTab,
          });
        }
      }
      const trackId = (options as { trackId?: string })?.trackId;
      if (trackId) {
        defaultLogger.app.page.tabBarClick(trackId);
      }
    },
    [activeRouteName, isTablet, navigation],
  );
  const onDebouncedTabPress = useThrottledCallback(onTabPress, 250);
  const handleRoutePress = platformEnv.isNativeAndroid
    ? onDebouncedTabPress
    : onTabPress;

  const tabs = useMemo(
    () =>
      routes.map((route) => {
        const isActive = route.name === activeRouteName;
        const isFocused =
          route.name === (optimisticFocusedRouteName ?? activeRouteName);
        const { options } = descriptors[route.key];

        if (
          route.name === extraConfig?.name ||
          (options as { hideOnTabBar?: boolean })?.hideOnTabBar
        ) {
          return null;
        }

        // Hide tab icon if hiddenIcon property is set to true
        if ((options as { hiddenIcon?: boolean })?.hiddenIcon) {
          return null;
        }

        const onPress = () => {
          // Check if custom tabbarOnPress exists, use it instead of default navigation
          const customPress = (options as { tabbarOnPress?: () => void })
            ?.tabbarOnPress;
          if (customPress) {
            customPress();
          } else {
            if (!isActive) {
              setOptimisticFocusedRouteName(route.name);
            }
            handleRoutePress(route, isActive, options);
          }
        };

        const renderItemContent = (
          renderActive: boolean,
          isOverlay: boolean,
        ) => (
          <MobileTabItem
            testID="Mobile-AppTabBar-TabItem-Icon"
            // @ts-expect-error
            icon={options?.tabBarIcon?.(renderActive) as IKeyOfIcons}
            label={options?.tabBarLabel as string}
            {...(isOverlay && { style: [StyleSheet.absoluteFill] })}
            selected={renderActive}
            {...(!(isFocused === renderActive) && {
              opacity: 0,
            })}
          />
        );

        return (
          <Stack
            testID={route.name.toLowerCase()}
            flex={1}
            key={route.name}
            onPress={onPress}
          >
            {renderItemContent(false, false)}
            {renderItemContent(true, true)}
          </Stack>
        );
      }),
    [
      activeRouteName,
      descriptors,
      extraConfig?.name,
      handleRoutePress,
      optimisticFocusedRouteName,
      routes,
    ],
  );
  const enableLiquidGlassTabBar = platformEnv.isNativeIOS;

  return (
    <LiquidGlassSurface
      testID="Mobile-AppTabBar"
      preset="tabBar"
      enabled={enableLiquidGlassTabBar}
      fallbackBackground="$bgApp"
      borderTopWidth={enableLiquidGlassTabBar ? 0 : StyleSheet.hairlineWidth}
      borderTopColor="$borderSubdued"
      pb={bottom}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
        }}
      >
        {tabs}
      </View>
    </LiquidGlassSurface>
  );
}
