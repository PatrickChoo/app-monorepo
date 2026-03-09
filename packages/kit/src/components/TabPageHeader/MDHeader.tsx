import { type ReactNode, useMemo } from 'react';

import {
  LiquidGlassSurface,
  Page,
  Stack,
  View,
  XStack,
  useSafeAreaInsets,
} from '@onekeyhq/components';
import type { ETranslations } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import { ETabRoutes } from '@onekeyhq/shared/src/routes';
import { EAccountSelectorSceneName } from '@onekeyhq/shared/types';

import { HomeTokenListProviderMirror } from '../../views/Home/components/HomeTokenListProvider/HomeTokenListProviderMirror';
import { MoreActionButton } from '../MoreActionButton';

import { HeaderNotificationIconButton } from './components/HeaderNotificationIconButton';
import { HeaderLeft } from './HeaderLeft';
import { HeaderMDSearch } from './HeaderMDSearch';
import { HeaderRight, SelectorTrigger } from './HeaderRight';
import { HeaderTitle } from './HeaderTitle';
import { LegacyUniversalSearchInput } from './LegacyUniversalSearchInput';

export function MDHeader({
  tabRoute,
  sceneName,
  hideSearch,
  selectedHeaderTab,
  customHeaderLeftItems,
  customHeaderRightItems,
  renderCustomHeaderRightItems,
  headerPx = '$5',
}: {
  tabRoute: ETabRoutes;
  sceneName: EAccountSelectorSceneName;
  hideSearch: boolean;
  selectedHeaderTab?: ETranslations;
  customHeaderLeftItems?: ReactNode;
  customHeaderRightItems?: ReactNode;
  renderCustomHeaderRightItems?: ({
    fixedItems,
  }: {
    fixedItems: ReactNode;
  }) => ReactNode;
  headerPx?: string;
}) {
  const { top } = useSafeAreaInsets();
  const enableLiquidGlassNavbar = platformEnv.isNativeIOS;
  const rightActions = useMemo(() => {
    return sceneName === EAccountSelectorSceneName.homeUrlAccount ? (
      <XStack flexShrink={1}>
        <HomeTokenListProviderMirror>
          <SelectorTrigger />
        </HomeTokenListProviderMirror>
      </XStack>
    ) : (
      <HeaderRight
        selectedHeaderTab={selectedHeaderTab}
        sceneName={sceneName}
        tabRoute={tabRoute}
        customHeaderRightItems={customHeaderRightItems}
        renderCustomHeaderRightItems={renderCustomHeaderRightItems}
      />
    );
  }, [
    customHeaderRightItems,
    renderCustomHeaderRightItems,
    sceneName,
    selectedHeaderTab,
    tabRoute,
  ]);
  const showBaseHeader = useMemo(() => {
    return (
      tabRoute === ETabRoutes.Home ||
      tabRoute === ETabRoutes.Discovery ||
      tabRoute === ETabRoutes.Earn ||
      tabRoute === ETabRoutes.Perp ||
      tabRoute === ETabRoutes.DeviceManagement
    );
  }, [tabRoute]);
  const isHomeTab =
    tabRoute === ETabRoutes.Home &&
    sceneName !== EAccountSelectorSceneName.homeUrlAccount;
  const fallbackHeaderOffset =
    !enableLiquidGlassNavbar && (top || platformEnv.isNativeAndroid)
      ? top || '$2'
      : undefined;
  const glassRowTopPadding = enableLiquidGlassNavbar ? top : undefined;

  return (
    <>
      <Page.Header headerShown={false} />
      {showBaseHeader ? (
        <LiquidGlassSurface
          enabled={enableLiquidGlassNavbar}
          preset="mdHeader"
          fallbackBackground="$bgApp"
        >
          <Stack pt={glassRowTopPadding}>
            {isHomeTab ? (
              <>
                {/* Row 1: Search bar + notification + more */}
                <XStack
                  alignItems="center"
                  px={headerPx}
                  h={56}
                  gap="$6"
                  {...(fallbackHeaderOffset
                    ? { mt: fallbackHeaderOffset }
                    : {})}
                >
                  <XStack flex={1}>
                    <LegacyUniversalSearchInput
                      size="medium"
                      containerProps={{
                        width: '100%',
                        $gtLg: undefined,
                      }}
                    />
                  </XStack>
                  <HeaderNotificationIconButton testID="header-right-notification" />
                  <MoreActionButton />
                </XStack>
                {/* Row 2: Wallet connection (account + network + address) */}
                <XStack alignItems="center" px={headerPx} h={44}>
                  <HeaderLeft
                    selectedHeaderTab={selectedHeaderTab}
                    sceneName={sceneName}
                    tabRoute={tabRoute}
                    customHeaderLeftItems={customHeaderLeftItems}
                  />
                </XStack>
              </>
            ) : (
              <>
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  px={headerPx}
                  h={44}
                  {...(fallbackHeaderOffset
                    ? { mt: fallbackHeaderOffset }
                    : {})}
                >
                  <View>
                    <HeaderLeft
                      selectedHeaderTab={selectedHeaderTab}
                      sceneName={sceneName}
                      tabRoute={tabRoute}
                      customHeaderLeftItems={customHeaderLeftItems}
                    />
                  </View>
                  <View>
                    <HeaderTitle sceneName={sceneName} />
                  </View>
                  {rightActions}
                </XStack>

                {!hideSearch ? (
                  <HeaderMDSearch tabRoute={tabRoute} sceneName={sceneName} />
                ) : null}
              </>
            )}
          </Stack>
        </LiquidGlassSurface>
      ) : (
        <XStack h={top || '$2'} bg="$bgApp" />
      )}
    </>
  );
}
