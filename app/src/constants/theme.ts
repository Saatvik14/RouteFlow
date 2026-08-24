/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import './../global.css'

import { Platform } from 'react-native';

export const IMAGES = {
  LOGO: require('./../../assets/images/logo9.png'),
};

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

// Shared operational UI tokens. Enterprise screens extend the same RouteFloww
// palette and spacing scale instead of introducing a separate theme module.
export const OperationsColors = {
  ink: '#101828',
  inkMuted: '#64748B',
  inkSubtle: '#94A3B8',
  canvas: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  line: '#E2E8F0',
  lineStrong: '#CBD5E1',
  primary: '#2F76F6',
  primaryDark: '#1F5FD2',
  primarySoft: '#EAF2FF',
  success: '#167A55',
  successSoft: '#E8F7F0',
  warning: '#9A5B08',
  warningSoft: '#FFF4D8',
  danger: '#B4233B',
  dangerSoft: '#FDECEF',
  info: '#2765B2',
  infoSoft: '#EAF2FC',
  focus: '#8CB8FF',
} as const;

export const OperationsSpacing = {
  xs: Spacing.one,
  sm: Spacing.two,
  md: 12,
  lg: Spacing.three,
  xl: Spacing.four,
  xxl: Spacing.five,
  xxxl: 40,
} as const;

export const OperationsRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;
