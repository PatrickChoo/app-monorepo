import type { PropsWithChildren } from 'react';

import { StyleSheet } from 'react-native';

import { useThemeName } from '../../hooks/useStyle';
import { Stack } from '../../primitives';
import { BlurView } from '../BlurView';

import type { IStackProps } from '../../primitives';

type ILiquidGlassSurfacePreset =
  | 'header'
  | 'mdHeader'
  | 'tabBar'
  | 'dialogSheet'
  | 'dialogModal';

const LIQUID_GLASS_SURFACE_PRESETS: Record<
  ILiquidGlassSurfacePreset,
  {
    blurIntensity: number;
    overlayOpacity: {
      light: number;
      dark: number;
    };
    topBorder: boolean;
    topBorderOpacity: {
      light: number;
      dark: number;
    };
    bottomBorder: boolean;
    bottomBorderOpacity: {
      light: number;
      dark: number;
    };
    surfaceTint: {
      light: NonNullable<IStackProps['bg']>;
      dark: NonNullable<IStackProps['bg']>;
    };
    borderTint: {
      light: NonNullable<IStackProps['bg']>;
      dark: NonNullable<IStackProps['bg']>;
    };
  }
> = {
  header: {
    blurIntensity: 60,
    overlayOpacity: {
      light: 0.22,
      dark: 0.14,
    },
    topBorder: true,
    topBorderOpacity: {
      light: 0.12,
      dark: 0.2,
    },
    bottomBorder: true,
    bottomBorderOpacity: {
      light: 0.32,
      dark: 0.28,
    },
    surfaceTint: {
      light: 'rgba(255, 255, 255, 0.68)',
      dark: 'rgba(17, 17, 20, 0.44)',
    },
    borderTint: {
      light: 'rgba(255, 255, 255, 0.78)',
      dark: 'rgba(255, 255, 255, 0.18)',
    },
  },
  mdHeader: {
    blurIntensity: 64,
    overlayOpacity: {
      light: 0.2,
      dark: 0.12,
    },
    topBorder: false,
    topBorderOpacity: {
      light: 0,
      dark: 0,
    },
    bottomBorder: true,
    bottomBorderOpacity: {
      light: 0.3,
      dark: 0.26,
    },
    surfaceTint: {
      light: 'rgba(255, 255, 255, 0.66)',
      dark: 'rgba(17, 17, 20, 0.42)',
    },
    borderTint: {
      light: 'rgba(255, 255, 255, 0.74)',
      dark: 'rgba(255, 255, 255, 0.16)',
    },
  },
  tabBar: {
    blurIntensity: 56,
    overlayOpacity: {
      light: 0.24,
      dark: 0.16,
    },
    topBorder: true,
    topBorderOpacity: {
      light: 0.24,
      dark: 0.18,
    },
    bottomBorder: false,
    bottomBorderOpacity: {
      light: 0,
      dark: 0,
    },
    surfaceTint: {
      light: 'rgba(255, 255, 255, 0.7)',
      dark: 'rgba(17, 17, 20, 0.46)',
    },
    borderTint: {
      light: 'rgba(255, 255, 255, 0.7)',
      dark: 'rgba(255, 255, 255, 0.15)',
    },
  },
  dialogSheet: {
    blurIntensity: 62,
    overlayOpacity: {
      light: 0.18,
      dark: 0.1,
    },
    topBorder: false,
    topBorderOpacity: {
      light: 0,
      dark: 0,
    },
    bottomBorder: false,
    bottomBorderOpacity: {
      light: 0,
      dark: 0,
    },
    surfaceTint: {
      light: 'rgba(255, 255, 255, 0.74)',
      dark: 'rgba(20, 20, 24, 0.42)',
    },
    borderTint: {
      light: 'rgba(255, 255, 255, 0.72)',
      dark: 'rgba(255, 255, 255, 0.16)',
    },
  },
  dialogModal: {
    blurIntensity: 58,
    overlayOpacity: {
      light: 0.2,
      dark: 0.12,
    },
    topBorder: false,
    topBorderOpacity: {
      light: 0,
      dark: 0,
    },
    bottomBorder: false,
    bottomBorderOpacity: {
      light: 0,
      dark: 0,
    },
    surfaceTint: {
      light: 'rgba(255, 255, 255, 0.76)',
      dark: 'rgba(20, 20, 24, 0.44)',
    },
    borderTint: {
      light: 'rgba(255, 255, 255, 0.72)',
      dark: 'rgba(255, 255, 255, 0.16)',
    },
  },
};

export type ILiquidGlassSurfaceProps = PropsWithChildren<
  IStackProps & {
    enabled?: boolean;
    preset?: ILiquidGlassSurfacePreset;
    blurIntensity?: number;
    overlayOpacity?: number;
    surfaceTint?: IStackProps['bg'];
    fallbackBackground?: IStackProps['bg'];
    borderTint?: IStackProps['bg'];
    topBorder?: boolean;
    topBorderOpacity?: number;
    bottomBorder?: boolean;
    bottomBorderOpacity?: number;
  }
>;

export function LiquidGlassSurface({
  children,
  enabled = true,
  preset = 'header',
  blurIntensity,
  overlayOpacity,
  surfaceTint,
  fallbackBackground = '$bgApp',
  borderTint,
  topBorder,
  topBorderOpacity,
  bottomBorder,
  bottomBorderOpacity,
  ...props
}: ILiquidGlassSurfaceProps) {
  const themeName = useThemeName();
  const isDark = /dark/.test(themeName);
  const presetConfig = LIQUID_GLASS_SURFACE_PRESETS[preset];
  const resolvedTopBorder = topBorder ?? presetConfig.topBorder;
  const resolvedBottomBorder = bottomBorder ?? presetConfig.bottomBorder;
  const resolvedSurfaceTint =
    surfaceTint ??
    (isDark ? presetConfig.surfaceTint.dark : presetConfig.surfaceTint.light);
  const resolvedBorderTint =
    borderTint ??
    (isDark ? presetConfig.borderTint.dark : presetConfig.borderTint.light);
  const resolvedOverlayOpacity =
    overlayOpacity ??
    (isDark
      ? presetConfig.overlayOpacity.dark
      : presetConfig.overlayOpacity.light);
  const resolvedTopBorderOpacity =
    topBorderOpacity ??
    (isDark
      ? presetConfig.topBorderOpacity.dark
      : presetConfig.topBorderOpacity.light);
  const resolvedBottomBorderOpacity =
    bottomBorderOpacity ??
    (isDark
      ? presetConfig.bottomBorderOpacity.dark
      : presetConfig.bottomBorderOpacity.light);

  return (
    <Stack
      position="relative"
      overflow="hidden"
      bg={enabled ? 'transparent' : fallbackBackground}
      {...props}
    >
      {enabled ? (
        <Stack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          pointerEvents="none"
        >
          <BlurView
            intensity={blurIntensity ?? presetConfig.blurIntensity}
            contentStyle={{ flex: 1 }}
          />
          <Stack
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg={resolvedSurfaceTint}
            opacity={resolvedOverlayOpacity}
          />
          {resolvedTopBorder ? (
            <Stack
              position="absolute"
              left={0}
              right={0}
              top={0}
              h={StyleSheet.hairlineWidth}
              bg={resolvedBorderTint}
              opacity={resolvedTopBorderOpacity}
            />
          ) : null}
          {resolvedBottomBorder ? (
            <Stack
              position="absolute"
              left={0}
              right={0}
              bottom={0}
              h={StyleSheet.hairlineWidth}
              bg={resolvedBorderTint}
              opacity={resolvedBottomBorderOpacity}
            />
          ) : null}
        </Stack>
      ) : null}
      {children}
    </Stack>
  );
}
